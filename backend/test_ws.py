import asyncio
import websockets

async def test():
    uri = "ws://127.0.0.1:8000/ws/alerts"
    async with websockets.connect(uri) as ws:
        print("✅ CONNECTED")

asyncio.run(test())