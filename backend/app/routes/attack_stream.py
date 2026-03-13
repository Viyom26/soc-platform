from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
import asyncio

router = APIRouter()


class ConnectionManager:

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):

        await websocket.accept()

        if websocket not in self.active_connections:
            self.active_connections.append(websocket)

        print("WebSocket connected. Total:", len(self.active_connections))

    def disconnect(self, websocket: WebSocket):

        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

        print("WebSocket disconnected. Total:", len(self.active_connections))

    async def broadcast(self, message: dict):

        disconnected = []

        for connection in self.active_connections:

            try:

                await connection.send_json(message)

            except Exception as e:

                print("Broadcast failed:", e)
                disconnected.append(connection)

        # cleanup disconnected sockets
        for conn in disconnected:
            self.disconnect(conn)


manager = ConnectionManager()


# =====================================================
# LIVE ATTACK STREAM SOCKET
# =====================================================

@router.websocket("/ws/attack-stream")
async def attack_stream(websocket: WebSocket):

    await manager.connect(websocket)

    try:

        while True:

            try:

                message = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=30
                )

                print("Client message:", message)

            except asyncio.TimeoutError:

                # heartbeat ping
                await websocket.send_json({
                    "type": "heartbeat",
                    "status": "alive"
                })

            except RuntimeError:
                break

    except WebSocketDisconnect:

        manager.disconnect(websocket)

    except Exception as e:

        print("WebSocket error:", e)
        manager.disconnect(websocket)


# =====================================================
# ALERT STREAM SOCKET
# =====================================================

@router.websocket("/ws/alerts")
async def alerts_socket(websocket: WebSocket):

    await manager.connect(websocket)

    try:

        while True:

            try:

                message = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=30
                )

                print("Alerts client message:", message)

            except asyncio.TimeoutError:

                await websocket.send_json({
                    "type": "heartbeat",
                    "status": "alive"
                })

    except WebSocketDisconnect:

        manager.disconnect(websocket)

    except Exception as e:

        print("Alerts WebSocket error:", e)
        manager.disconnect(websocket)