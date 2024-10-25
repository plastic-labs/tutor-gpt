from os import getenv
from typing import Optional

from functools import lru_cache
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from supabase import Client, create_client

load_dotenv(override=True)

# Initialize Supabase client
supabase_url = getenv("SUPABASE_URL", "")
supabase_key = getenv("SUPABASE_KEY", "")
supabase: Client = create_client(supabase_url, supabase_key)

STRIPE_ENABLED = getenv("STRIPE_ENABLED")

security = HTTPBearer()


class User(BaseModel):
    id: str
    email: Optional[str]


@lru_cache(maxsize=50)
def validate_user(token: str):
    return supabase.auth.get_user(token)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    """
    Dependency to verify JWT token and return current user
    """
    try:
        # Verify the JWT token
        token = credentials.credentials

        # Verify with Supabase
        user = validate_user(token)

        if not user:
            raise HTTPException(
                status_code=401, detail="Invalid authentication credentials"
            )

        return User(id=user.user.id, email=user.user.email)
    except Exception as e:
        print(e)
        raise HTTPException(status_code=401, detail="Could not validate credentials")


def verify_auth(user: User, input_id: str, subscription_check: bool = False):
    """
    Dependency factory to verify a resource belongs to the current user
    """
    if user.id != input_id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this resource"
        )

    if not subscription_check or not STRIPE_ENABLED:
        return

    sub = supabase.table("subscriptions").select("*").eq("user_id", user.id).execute()

    if len(sub.data) != 1:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this resource"
        )
