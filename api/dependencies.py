from honcho import Honcho
import asyncio

LOCK = asyncio.Lock()
honcho = Honcho(api_key="test", environment="local")
app = honcho.apps.get_or_create("Tutor-GPT")
