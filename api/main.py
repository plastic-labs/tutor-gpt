from fastapi import FastAPI, Request, Response, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
import sentry_sdk

from supabase import create_client, Client

import os
from dotenv import load_dotenv
from api.routers import conversation, chat, messages

load_dotenv(override=True)

SENTRY_DSN = os.getenv("SENTRY_DN")

if SENTRY_DSN:
    rate = 0.2 if os.getenv("SENTRY_ENVIRONMENT") == "production" else 1.0
    sentry_sdk.init(
        dsn=os.environ["SENTRY_DSN_API"],
        traces_sample_rate=rate,
        profiles_sample_rate=rate,
    )

app = FastAPI()

URL = os.getenv("URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=URL,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

# supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

security = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Dependency that validates the JWT token and returns the authenticated user.
    Raises HTTPException if token is invalid or user is not found.
    """
    # Debug request information
    # print("\n=== Request Debug Info ===")
    # print(f"Headers: {dict(request.headers)}")
    # print(f"Method: {request.method}")
    # print(f"URL: {request.url}")
    #
    # # Debug credentials
    # print("\n=== Credentials Debug Info ===")
    # print(f"Scheme: {credentials.scheme}")
    # print(
    #     f"Credentials: {credentials.credentials[:20]}..."
    # )  # Print first 20 chars of token for safety
    try:
        # print("Checking Value")
        # Get the JWT token from the Authorization header
        token = credentials.credentials
        # print(token)
        # return token
    except Exception as e:
        print(e)


app.include_router(conversation.router)
app.include_router(chat.router)
app.include_router(messages.router)


@app.get("/api/test")
async def test(credentials=Depends(get_current_user)):
    return {"test": "test"}
