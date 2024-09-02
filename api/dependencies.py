from honcho import Honcho
from os import getenv
from dotenv import load_dotenv
import asyncio

load_dotenv(override=True)

LOCK = asyncio.Lock()
honcho = Honcho(base_url=getenv("HONCHO_URL"))
app = honcho.apps.get_or_create(getenv("HONCHO_APP_NAME"))
