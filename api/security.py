from os import getenv
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from supabase import Client, create_client

load_dotenv(override=True)

# Initialize Supabase client
supabase_url = getenv("SUPABASE_URL", "")
supabase_key = getenv("SUPABASE_KEY", "")
supabase: Client = create_client(supabase_url, supabase_key)

JWT_SECRET = getenv("JWT_SECRET")

security = HTTPBearer()

SUPABASE_REFERENCE_ID = supabase_url.split("//")[1].split(".")[0]


class User(BaseModel):
    id: str
    email: Optional[str]


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
        user = supabase.auth.get_user(token)

        if not user:
            raise HTTPException(
                status_code=401, detail="Invalid authentication credentials"
            )

        return User(id=user.user.id, email=user.user.email)
    except Exception as e:
        print(e)
        raise HTTPException(status_code=401, detail="Could not validate credentials")


def verify_user_resource(resource_user_id: str):
    """
    Dependency factory to verify a resource belongs to the current user
    """

    async def verify_user_resource_dependency(
        current_user: User = Depends(get_current_user),
    ):
        if current_user.id != resource_user_id:
            raise HTTPException(
                status_code=403, detail="Not authorized to access this resource"
            )
        return current_user

    return verify_user_resource_dependency
