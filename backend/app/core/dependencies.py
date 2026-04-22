import time

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_supabase_token, extract_user_id
from app.db.session import get_db
from app.models.user import User

_bearer = HTTPBearer()

# In-memory user cache: user_id -> (User, cached_at_epoch)
# Eliminates one DB round-trip per API call after the first hit.
_user_cache: dict[str, tuple[User, float]] = {}
_USER_CACHE_TTL = 300  # 5 minutes


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Validate the Bearer JWT, then upsert the caller into public.users.
    Every authenticated endpoint depends on this.
    """
    payload = await decode_supabase_token(credentials.credentials)
    user_id = extract_user_id(payload)
    email: str = payload.get("email", "")

    cached = _user_cache.get(user_id)
    if cached and time.monotonic() - cached[1] < _USER_CACHE_TTL:
        user = cached[0]
        if user.email == email:
            return user

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(id=user_id, email=email)
        db.add(user)
        await db.commit()
    elif user.email != email:
        user.email = email
        await db.commit()

    _user_cache[user_id] = (user, time.monotonic())
    return user


async def require_superadmin(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin access required",
        )
    return current_user
