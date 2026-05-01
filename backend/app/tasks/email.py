"""
Email sending via Resend (https://resend.com).
All functions are fire-and-forget — failures are logged, never raised.
"""
import asyncio
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_RESEND_URL = "https://api.resend.com/emails"

# ── Shared design tokens ───────────────────────────────────────────────────────
_INDIGO = "#6366f1"
_INDIGO_DARK = "#4f46e5"
_BG = "#f4f4f5"
_CARD = "#ffffff"
_TEXT = "#18181b"
_MUTED = "#71717a"
_BORDER = "#e4e4e7"


def _from_address() -> str:
    return f"NetMap <noreply@{settings.resend_from_domain}>"


def _frontend_url() -> str:
    return settings.cors_origins[0]


# ── Shared layout wrappers ─────────────────────────────────────────────────────

def _wrap(body: str) -> str:
    """Wrap email body in the standard shell: page bg → card → header → body → footer."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NetMap</title>
</head>
<body style="margin:0;padding:0;background-color:{_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:{_BG};padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="background-color:{_INDIGO};border-radius:10px;padding:10px 18px;">
                    <span style="font-size:16px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">NetMap</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:{_CARD};border-radius:12px;border:1px solid {_BORDER};padding:40px 40px 32px;">
              {body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:{_MUTED};line-height:1.6;">
                You received this email because you have an account on NetMap.<br />
                &copy; 2026 NetMap. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _button(href: str, label: str) -> str:
    return f"""<table cellpadding="0" cellspacing="0" role="presentation" style="margin:28px 0 0;">
  <tr>
    <td style="border-radius:8px;background-color:{_INDIGO};">
      <a href="{href}"
         style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;
                color:#ffffff;text-decoration:none;border-radius:8px;
                background-color:{_INDIGO};letter-spacing:0.1px;">
        {label}
      </a>
    </td>
  </tr>
</table>"""


def _divider() -> str:
    return f'<hr style="border:none;border-top:1px solid {_BORDER};margin:28px 0;" />'


# ── Email functions ────────────────────────────────────────────────────────────

_MAX_ATTEMPTS = 3
_BACKOFF_BASE = 1  # seconds: 1, 2, 4


async def _send_with_retry(
    client: httpx.AsyncClient,
    payload: dict,
    to: str,
    subject: str,
) -> None:
    """
    POST to Resend with exponential backoff.

    Retries on:  network errors, httpx.TimeoutException, HTTP 429, HTTP 5xx.
    No retry on: HTTP 4xx (except 429) — these are permanent failures.

    After all attempts are exhausted the error is logged and the function
    returns silently, preserving the fire-and-forget contract.
    """
    last_status: int | None = None
    last_body: str = ""

    for attempt in range(1, _MAX_ATTEMPTS + 1):
        try:
            resp = await client.post(
                _RESEND_URL,
                headers={"Authorization": f"Bearer {settings.resend_api_key}"},
                json=payload,
            )

            if resp.status_code < 400:
                # Success
                return

            last_status = resp.status_code
            last_body = resp.text

            # Permanent 4xx failure (except 429) — do not retry
            if resp.status_code != 429 and 400 <= resp.status_code < 500:
                logger.error(
                    "Permanent failure sending email to %s (subject: %s) — "
                    "status %d, body: %s",
                    to, subject, last_status, last_body,
                )
                return

            # Transient: 429 or 5xx — fall through to retry logic below
            logger.warning(
                "Transient failure sending email to %s (subject: %s), attempt %d/%d — "
                "status %d, body: %s",
                to, subject, attempt, _MAX_ATTEMPTS, last_status, last_body,
            )

        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            last_body = str(exc)
            logger.warning(
                "Network/timeout error sending email to %s (subject: %s), attempt %d/%d — %s",
                to, subject, attempt, _MAX_ATTEMPTS, exc,
            )

        # If this was the last attempt, stop — don't sleep needlessly
        if attempt == _MAX_ATTEMPTS:
            break

        wait = _BACKOFF_BASE * (2 ** (attempt - 1))  # 1s, 2s, 4s
        await asyncio.sleep(wait)

    logger.error(
        "All %d attempts exhausted sending email to %s (subject: %s) — "
        "last status: %s, last body: %s",
        _MAX_ATTEMPTS, to, subject, last_status, last_body,
    )


async def _send(to: str, subject: str, html: str) -> None:
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not set — skipping email to %s", to)
        return
    payload = {"from": _from_address(), "to": [to], "subject": subject, "html": html}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await _send_with_retry(client, payload, to, subject)
    except Exception:
        logger.exception("Unexpected error sending email to %s (subject: %s)", to, subject)


async def send_welcome_email(to_email: str) -> None:
    subject = "Welcome to NetMap — you're all set"
    dashboard_url = f"{_frontend_url()}/dashboard"

    body = f"""
      <!-- Greeting -->
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:{_TEXT};letter-spacing:-0.5px;">
        Welcome to NetMap 🎉
      </h1>
      <p style="margin:0;font-size:15px;color:{_MUTED};line-height:1.6;">
        Your account is ready. Here's what you can do right now.
      </p>

      {_divider()}

      <!-- Feature list -->
      <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
        <tr>
          <td style="padding:8px 0;">
            <table cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="padding-right:14px;vertical-align:top;">
                  <div style="width:36px;height:36px;background-color:#eef2ff;border-radius:8px;
                              text-align:center;line-height:36px;font-size:18px;">🗺️</div>
                </td>
                <td style="vertical-align:top;">
                  <p style="margin:0;font-size:14px;font-weight:600;color:{_TEXT};">Map your network</p>
                  <p style="margin:4px 0 0;font-size:13px;color:{_MUTED};line-height:1.5;">
                    Add contacts, draw relationships, and explore your team's collective graph.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="height:16px;"></td></tr>
        <tr>
          <td style="padding:8px 0;">
            <table cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="padding-right:14px;vertical-align:top;">
                  <div style="width:36px;height:36px;background-color:#eef2ff;border-radius:8px;
                              text-align:center;line-height:36px;font-size:18px;">🔍</div>
                </td>
                <td style="vertical-align:top;">
                  <p style="margin:0;font-size:14px;font-weight:600;color:{_TEXT};">Find warm paths</p>
                  <p style="margin:4px 0 0;font-size:13px;color:{_MUTED};line-height:1.5;">
                    Discover who on your team knows who — replace cold outreach with warm intros.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="height:16px;"></td></tr>
        <tr>
          <td style="padding:8px 0;">
            <table cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="padding-right:14px;vertical-align:top;">
                  <div style="width:36px;height:36px;background-color:#eef2ff;border-radius:8px;
                              text-align:center;line-height:36px;font-size:18px;">👥</div>
                </td>
                <td style="vertical-align:top;">
                  <p style="margin:0;font-size:14px;font-weight:600;color:{_TEXT};">Invite your team</p>
                  <p style="margin:4px 0 0;font-size:13px;color:{_MUTED};line-height:1.5;">
                    Share a workspace invite link and build your network map together.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      {_button(dashboard_url, "Go to your dashboard")}

      {_divider()}

      <p style="margin:0;font-size:12px;color:{_MUTED};line-height:1.6;">
        Need help? Reply to this email and we'll get back to you.
      </p>
    """
    await _send(to_email, subject, _wrap(body))


async def send_member_joined_email(
    owner_email: str, workspace_name: str, member_email: str
) -> None:
    subject = f"New member joined {workspace_name}"
    workspace_url = f"{_frontend_url()}/dashboard"

    # Extract first letter for avatar
    avatar_letter = member_email[0].upper()

    body = f"""
      <!-- Icon row -->
      <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
        <tr>
          <td>
            <div style="width:48px;height:48px;background-color:#eef2ff;border-radius:50%;
                        text-align:center;line-height:48px;font-size:20px;font-weight:700;
                        color:{_INDIGO};">
              {avatar_letter}
            </div>
          </td>
        </tr>
      </table>

      <!-- Heading -->
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:{_TEXT};letter-spacing:-0.4px;">
        Someone joined your workspace
      </h1>
      <p style="margin:0;font-size:15px;color:{_MUTED};line-height:1.6;">
        Your team just got bigger.
      </p>

      {_divider()}

      <!-- Detail card -->
      <table cellpadding="0" cellspacing="0" role="presentation" width="100%"
             style="background-color:{_BG};border-radius:8px;border:1px solid {_BORDER};">
        <tr>
          <td style="padding:20px 24px;">
            <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
              <tr>
                <td>
                  <p style="margin:0;font-size:11px;font-weight:600;color:{_MUTED};
                             text-transform:uppercase;letter-spacing:0.8px;">New member</p>
                  <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:{_TEXT};">
                    {member_email}
                  </p>
                </td>
              </tr>
              <tr><td style="height:16px;"></td></tr>
              <tr>
                <td>
                  <p style="margin:0;font-size:11px;font-weight:600;color:{_MUTED};
                             text-transform:uppercase;letter-spacing:0.8px;">Workspace</p>
                  <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:{_TEXT};">
                    {workspace_name}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      {_button(workspace_url, "View workspace")}

      {_divider()}

      <p style="margin:0;font-size:12px;color:{_MUTED};line-height:1.6;">
        You're receiving this because you own the <strong>{workspace_name}</strong> workspace.
      </p>
    """
    await _send(owner_email, subject, _wrap(body))


async def send_invite_email(to_email: str, workspace_name: str, invite_link: str) -> None:
    subject = f"You're invited to join {workspace_name} on NetMap"

    body = f"""
      <!-- Heading -->
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:{_TEXT};letter-spacing:-0.4px;">
        You've been invited
      </h1>
      <p style="margin:0;font-size:15px;color:{_MUTED};line-height:1.6;">
        Someone added you to a shared professional network on NetMap.
      </p>

      {_divider()}

      <!-- Workspace highlight -->
      <table cellpadding="0" cellspacing="0" role="presentation" width="100%"
             style="background-color:#eef2ff;border-radius:8px;border:1px solid #c7d2fe;">
        <tr>
          <td style="padding:20px 24px;">
            <p style="margin:0;font-size:11px;font-weight:600;color:{_INDIGO};
                       text-transform:uppercase;letter-spacing:0.8px;">Workspace</p>
            <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:{_TEXT};">
              {workspace_name}
            </p>
          </td>
        </tr>
      </table>

      <p style="margin:24px 0 0;font-size:14px;color:{_MUTED};line-height:1.6;">
        NetMap is a shared graph that maps your team's collective professional contacts —
        so you can find warm introductions instead of cold outreach.
      </p>

      {_button(invite_link, "Accept invitation")}

      {_divider()}

      <p style="margin:0;font-size:12px;color:{_MUTED};line-height:1.6;">
        If you weren't expecting this invite, you can safely ignore this email.<br />
        This link remains valid until regenerated by the workspace admin.
      </p>
    """
    await _send(to_email, subject, _wrap(body))
