from fastapi import FastAPI, Request, Response, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
import sentry_sdk

import os
from dotenv import load_dotenv
from api.routers import conversation, chat, messages
from api.security import get_current_user

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

app.include_router(conversation.router, dependencies=[Depends(get_current_user)])
app.include_router(chat.router, dependencies=[Depends(get_current_user)])
app.include_router(messages.router, dependencies=[Depends(get_current_user)])


@app.get("/api/test")
async def test(credentials=Depends(get_current_user)):
    return {"test": "test"}
