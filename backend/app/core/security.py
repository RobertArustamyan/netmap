import httpx
from fastapi import HTTPException, status
from jose import JWTError, jwk, jwt

from app.core.config import settings

ALGORITHM = "ES256"

_jwks_cache: dict | None = None


async def fetch_jwks() -> dict:
    """
    Fetch the JWKS from Supabase and cache the result.
    Returns the full JWKS document (a dict with a "keys" list).
    """
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache

    url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        response.raise_for_status()
    _jwks_cache = response.json()
    return _jwks_cache


def _find_key(jwks: dict, kid: str):
    """Return the JWKS key entry matching the given kid, or None."""
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return key
    return None


async def decode_supabase_token(token: str) -> dict:
    """
    Validate a Supabase-issued JWT (ES256) and return its payload.
    Raises 401 if the token is invalid or expired.
    """
    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")

        jwks = await fetch_jwks()
        key_data = _find_key(jwks, kid)

        if key_data is None:
            # kid not found — refresh cache once and retry
            global _jwks_cache
            _jwks_cache = None
            jwks = await fetch_jwks()
            key_data = _find_key(jwks, kid)

        if key_data is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        public_key = jwk.construct(key_data, algorithm=ALGORITHM)

        payload = jwt.decode(
            token,
            public_key,
            algorithms=[ALGORITHM],
            audience="authenticated",
        )
        return payload
    except HTTPException:
        raise
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def extract_user_id(payload: dict) -> str:
    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject claim",
        )
    return user_id
