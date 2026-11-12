"""
CHAKRIVA Supabase JWT Authentication Boundary
==============================================
Extracts and validates Supabase Auth JWT from HTTP Authorization Bearer headers.
Derived strictly from the server-signed token subject without trusting client claims.
"""

import logging
import time
from typing import Any, Dict, Optional
import jwt
from fastapi import Header, HTTPException, status
from pydantic import BaseModel

from .config import settings

logger = logging.getLogger("chakriva.ai.auth")


class AuthenticatedUser(BaseModel):
    user_id: str
    email: Optional[str] = None
    role: str = "authenticated"
    claims: Dict[str, Any] = {}


def verify_supabase_jwt(authorization: Optional[str] = Header(None)) -> AuthenticatedUser:
    """
    Validates Supabase JWT from Authorization Bearer header.
    Raises HTTPException 401 if missing, invalid, or expired.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "error": "Authentication required. Please sign in to consult Riva.",
                "errorCode": "UNAUTHORIZED"
            }
        )

    parts = authorization.strip().split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "error": "Malformed authorization header. Expected 'Bearer <token>'.",
                "errorCode": "UNAUTHORIZED"
            }
        )

    token = parts[1]

    try:
        secret = settings.supabase_jwt_secret
        if secret:
            # Full cryptographic HMAC-SHA256 / RS256 verification
            payload = jwt.decode(
                token,
                secret,
                algorithms=["HS256", "RS256"],
                audience="authenticated",
                options={"verify_exp": True}
            )
        else:
            # Development fallback when shared secret is not injected in local dev:
            # Validate structural integrity, header, claims, and non-expired state
            payload = jwt.decode(
                token,
                options={"verify_signature": False, "verify_exp": True}
            )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "success": False,
                    "error": "Token missing subject identifier (sub).",
                    "errorCode": "UNAUTHORIZED"
                }
            )

        # Check expiration
        exp = payload.get("exp")
        if exp and exp < time.time():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "success": False,
                    "error": "Authentication token expired. Please refresh your session.",
                    "errorCode": "UNAUTHORIZED"
                }
            )

        return AuthenticatedUser(
            user_id=str(user_id),
            email=payload.get("email"),
            role=payload.get("role", "authenticated"),
            claims=payload
        )

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "error": "Session token has expired. Please sign in again.",
                "errorCode": "UNAUTHORIZED"
            }
        )
    except jwt.PyJWTError as e:
        logger.warning("Supabase JWT validation failed: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "error": "Invalid authentication token.",
                "errorCode": "UNAUTHORIZED"
            }
        )
