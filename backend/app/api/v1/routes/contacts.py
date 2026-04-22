import csv
import io
import re
import uuid
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.contact import Contact
from app.models.member import Member
from app.models.tag import ContactTag, Tag
from app.models.user import User
from app.schemas.contact import (
    ContactCreate,
    ContactRead,
    ContactUpdate,
    CSVImportError,
    CSVImportResult,
)
from app.schemas.tags import TagRead
from app.services.plan_service import _get_plan, check_contact_limit

router = APIRouter(prefix="/workspaces/{workspace_id}/contacts", tags=["contacts"])


async def _fetch_tags_by_contact(
    contact_ids: list[uuid.UUID], db: AsyncSession
) -> dict[uuid.UUID, list[TagRead]]:
    """Return a mapping of contact_id -> list[TagRead] for the given contact IDs."""
    if not contact_ids:
        return {}
    tag_rows = await db.execute(
        select(ContactTag, Tag)
        .join(Tag, Tag.id == ContactTag.tag_id)
        .where(ContactTag.contact_id.in_(contact_ids))
    )
    tags_by_contact: dict[uuid.UUID, list[TagRead]] = defaultdict(list)
    for ct, tag in tag_rows.all():
        tags_by_contact[ct.contact_id].append(TagRead.model_validate(tag))
    return tags_by_contact


async def _require_member(workspace_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> None:
    result = await db.execute(
        select(Member).where(
            Member.workspace_id == workspace_id,
            Member.user_id == user_id,
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")


_MAX_FILE_BYTES = 5 * 1024 * 1024  # 5 MB
_MAX_ROWS = 500
_SUPPORTED_COLUMNS = {"name", "job_title", "company", "email", "phone", "linkedin_url", "notes"}
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@router.post("/import", response_model=CSVImportResult)
async def import_contacts_csv(
    workspace_id: uuid.UUID,
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Bulk-import contacts from a UTF-8 CSV file.

    Returns a summary of how many rows were imported, skipped, and any per-row errors.
    Respects the workspace plan contact limit — rows that would exceed the limit are
    reported as skipped rather than raising a hard 402.
    """
    await _require_member(workspace_id, current_user.id, db)

    # --- File validation ---
    content_type = file.content_type or ""
    allowed_types = {"text/csv", "application/csv", "application/vnd.ms-excel", "text/plain"}
    if content_type not in allowed_types and not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="File must be a CSV (text/csv). Received content-type: " + content_type,
        )

    raw = await file.read()
    if len(raw) > _MAX_FILE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds the 5 MB size limit ({len(raw)} bytes received).",
        )

    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File is not valid UTF-8 encoded text.")

    # --- Determine plan headroom ---
    plan = await _get_plan(workspace_id, db)
    count_result = await db.execute(
        select(func.count()).select_from(Contact).where(Contact.workspace_id == workspace_id)
    )
    current_count: int = count_result.scalar_one()
    headroom = plan.max_contacts - current_count  # may be 0 or negative

    # --- Parse CSV ---
    try:
        reader = csv.DictReader(io.StringIO(text))
        if reader.fieldnames is None:
            raise HTTPException(status_code=400, detail="CSV file appears to be empty or missing a header row.")
        # Normalise headers to lower-case for case-insensitive matching
        normalised_headers = [h.strip().lower() for h in reader.fieldnames]
        if "name" not in normalised_headers:
            raise HTTPException(
                status_code=400,
                detail="CSV is missing a required 'name' column.",
            )
        rows = list(reader)
    except csv.Error as exc:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {exc}")

    def _opt(row: dict, key: str) -> str | None:
        """Return a stripped non-empty string from *row*, or None."""
        val = row.get(key)
        return val.strip() if val and val.strip() else None

    # --- Process rows ---
    errors: list[CSVImportError] = []
    contacts_to_insert: list[Contact] = []
    skipped = 0

    for row_index, raw_row in enumerate(rows, start=2):  # 1-based; row 1 is the header
        # Enforce hard row cap
        if row_index - 1 > _MAX_ROWS:
            errors.append(CSVImportError(row=row_index, reason=f"Row limit of {_MAX_ROWS} reached; remaining rows ignored."))
            skipped += 1
            continue

        # Normalise keys
        row = {k.strip().lower(): (v.strip() if v else None) for k, v in raw_row.items() if k}

        # Required field: name
        name = row.get("name") or ""
        name = name.strip()
        if not name:
            errors.append(CSVImportError(row=row_index, reason="Missing required field: 'name'."))
            skipped += 1
            continue

        # Optional field: email — basic format check
        email: str | None = row.get("email") or None
        if email:
            email = email.strip()
            if not _EMAIL_RE.match(email):
                errors.append(CSVImportError(row=row_index, reason=f"Invalid email address: '{email}'."))
                skipped += 1
                continue

        # Plan limit check — stop inserting once headroom is exhausted
        if len(contacts_to_insert) >= headroom:
            errors.append(
                CSVImportError(
                    row=row_index,
                    reason=(
                        f"Workspace contact limit reached ({plan.max_contacts}). "
                        "Upgrade your plan to import more contacts."
                    ),
                )
            )
            skipped += 1
            continue

        contacts_to_insert.append(
            Contact(
                id=uuid.uuid4(),
                workspace_id=workspace_id,
                added_by_user_id=current_user.id,
                name=name,
                job_title=_opt(row, "job_title"),
                company=_opt(row, "company"),
                email=email,
                phone=_opt(row, "phone"),
                linkedin_url=_opt(row, "linkedin_url"),
                notes=_opt(row, "notes"),
                is_self=False,
            )
        )

    # --- Bulk insert in a single transaction ---
    if contacts_to_insert:
        db.add_all(contacts_to_insert)
        await db.commit()

    return CSVImportResult(
        imported=len(contacts_to_insert),
        skipped=skipped,
        errors=errors,
    )


@router.post("", response_model=ContactRead, status_code=201)
async def create_contact(
    workspace_id: uuid.UUID,
    payload: ContactCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user.id, db)
    await check_contact_limit(workspace_id, db)

    contact = Contact(
        id=uuid.uuid4(),
        workspace_id=workspace_id,
        added_by_user_id=current_user.id,
        **payload.model_dump(),
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return ContactRead(**contact.__dict__, tags=[])


@router.get("", response_model=list[ContactRead])
async def list_contacts(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user.id, db)

    result = await db.execute(
        select(Contact)
        .where(Contact.workspace_id == workspace_id)
        .order_by(Contact.name)
    )
    contacts = result.scalars().all()
    tags_by_contact = await _fetch_tags_by_contact([c.id for c in contacts], db)
    return [
        ContactRead(**c.__dict__, tags=tags_by_contact.get(c.id, []))
        for c in contacts
    ]


@router.get("/{cid}", response_model=ContactRead)
async def get_contact(
    workspace_id: uuid.UUID,
    cid: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user.id, db)

    result = await db.execute(
        select(Contact).where(Contact.id == cid, Contact.workspace_id == workspace_id)
    )
    contact = result.scalar_one_or_none()
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    tags_by_contact = await _fetch_tags_by_contact([contact.id], db)
    return ContactRead(**contact.__dict__, tags=tags_by_contact.get(contact.id, []))


@router.patch("/{cid}", response_model=ContactRead)
async def update_contact(
    workspace_id: uuid.UUID,
    cid: uuid.UUID,
    payload: ContactUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user.id, db)

    result = await db.execute(
        select(Contact).where(Contact.id == cid, Contact.workspace_id == workspace_id)
    )
    contact = result.scalar_one_or_none()
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(contact, field, value)

    await db.commit()
    await db.refresh(contact)
    tags_by_contact = await _fetch_tags_by_contact([contact.id], db)
    return ContactRead(**contact.__dict__, tags=tags_by_contact.get(contact.id, []))


@router.delete("/{cid}", status_code=204)
async def delete_contact(
    workspace_id: uuid.UUID,
    cid: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user.id, db)

    result = await db.execute(
        select(Contact).where(Contact.id == cid, Contact.workspace_id == workspace_id)
    )
    contact = result.scalar_one_or_none()
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact not found")

    await db.delete(contact)
    await db.commit()
