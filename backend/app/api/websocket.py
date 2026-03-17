from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
import asyncio

router = APIRouter()

alert_history: List[dict] = []
MAX_HISTORY = 100


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()

        if websocket not in self.active_connections:
            self.active_connections.append(websocket)

        print("✅ WebSocket connected | Total:", len(self.active_connections))

        # 🔥 send last alerts (history replay)
        for alert in alert_history[-20:]:
            try:
                await websocket.send_json(alert)
            except Exception as e:
                print("⚠️ Replay send failed:", e)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print("❌ WebSocket disconnected | Remaining:", len(self.active_connections))

    async def broadcast(self, message: dict):
        print("📡 Broadcasting alert:", message)

        alert_history.append(message)

        if len(alert_history) > MAX_HISTORY:
            alert_history.pop(0)

        disconnected = []

        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print("⚠️ Send failed:", e)
                disconnected.append(connection)

        for ws in disconnected:
            self.disconnect(ws)


manager = ConnectionManager()


@router.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    print("🔥 WS ROUTE HIT")

    await manager.connect(websocket)

    try:
        while True:
            # ✅ keep connection alive (NO sleep)
            await websocket.receive_text()

    except WebSocketDisconnect:
        print("❌ Client disconnected")
        manager.disconnect(websocket)

    except asyncio.CancelledError:
        print("⚠️ WebSocket cancelled safely")
        manager.disconnect(websocket)

    except Exception as e:
        print("❌ WebSocket ERROR:", e)
        manager.disconnect(websocket)


async def broadcast_alert(data: dict):
    await manager.broadcast(data)