"""WebSocket server for real-time agent event streaming."""

import asyncio
import json
import uuid
import logging
import os
from datetime import datetime
from typing import Dict, Optional

import websockets
from dotenv import load_dotenv

from rli_agent.utils.event_emitter import EventEmitter

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)


class ClientSession:
    """Represents a connected client and their active session."""

    def __init__(self, websocket, client_id: str):
        self.websocket = websocket
        self.client_id = client_id
        self.session_id: Optional[str] = None
        self.task: Optional[asyncio.Task] = None
        self.connected_at = datetime.now()

    def __repr__(self):
        return f"ClientSession({self.client_id}, session={self.session_id})"


class RLIAgentWebSocketServer:
    """WebSocket server supporting multiple concurrent clients for RLI Agent."""

    def __init__(self, host: str = "0.0.0.0", port: int = 8765):
        self.host = host
        self.port = port
        self.clients: Dict[str, ClientSession] = {}  # client_id -> ClientSession

    async def handle_connection(self, websocket):
        """Handle a new WebSocket connection."""
        client_id = str(uuid.uuid4())[:8]
        client = ClientSession(websocket, client_id)
        self.clients[client_id] = client

        logger.info(f"Client connected: {client_id} (total: {len(self.clients)})")

        try:
            # Send connection confirmation
            await websocket.send(json.dumps({
                "type": "connected",
                "client_id": client_id,
                "timestamp": datetime.now().isoformat(),
                "message": "Connected to RLI Agent WebSocket Server"
            }))

            async for message in websocket:
                await self.handle_message(client, message)

        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Client disconnected: {client_id}")
        except Exception as e:
            logger.error(f"Error for client {client_id}: {e}")
        finally:
            # Cancel any running session
            if client.task and not client.task.done():
                client.task.cancel()
                try:
                    await client.task
                except asyncio.CancelledError:
                    pass

            del self.clients[client_id]
            logger.info(f"Client removed: {client_id} (remaining: {len(self.clients)})")

    async def handle_message(self, client: ClientSession, message: str):
        """Handle incoming message from a client."""
        try:
            data = json.loads(message)
            msg_type = data.get("type")

            if msg_type == "START_SESSION":
                await self.start_session(client, data)

            elif msg_type == "CANCEL_SESSION":
                await self.cancel_session(client)

            elif msg_type == "PING":
                await client.websocket.send(json.dumps({
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                }))

            else:
                logger.warning(f"Unknown message type from {client.client_id}: {msg_type}")

        except json.JSONDecodeError:
            logger.error(f"Invalid JSON from client {client.client_id}")
            await self.send_error(client, "Invalid JSON message")
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            await self.send_error(client, str(e))

    async def start_session(self, client: ClientSession, data: dict):
        """Start an agent session for a client."""
        # Cancel existing session if any
        if client.task and not client.task.done():
            client.task.cancel()
            try:
                await client.task
            except asyncio.CancelledError:
                pass

        # Generate session ID
        session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{client.client_id}"
        client.session_id = session_id

        # Create event emitter for this client
        emitter = EventEmitter(client.websocket, session_id)

        # Build request
        request = {
            "task_brief": data.get("task_brief", ""),
            "context": data.get("context", {})
        }

        logger.info(f"Starting session {session_id} for client {client.client_id}")
        logger.info(f"  Task: {request['task_brief'][:100]}...")

        # Run agent in background task
        client.task = asyncio.create_task(
            self.run_agent_session(client, request, emitter)
        )

    async def run_agent_session(self, client: ClientSession, request: dict, emitter: EventEmitter):
        """Run the agent session with error handling."""
        try:
            # Import here to avoid circular imports
            from rli_agent.agent import process_request

            # Emit session started
            await emitter.session_started(request['task_brief'][:100])

            start_time = datetime.now()
            result = await process_request(request)
            duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)

            # Emit session complete
            await emitter.session_complete(
                final_url=result.get('deliverables', {}).get('3d_model') or
                          result.get('deliverables', {}).get('video') or
                          result.get('deliverables', {}).get('image'),
                duration_ms=duration_ms,
                summary=result
            )

            logger.info(f"Session {client.session_id} completed: {result.get('deliverables')}")

        except asyncio.CancelledError:
            logger.info(f"Session {client.session_id} was cancelled")
            await emitter.session_error("Session was cancelled")
            raise

        except Exception as e:
            logger.error(f"Session {client.session_id} error: {e}", exc_info=True)
            await emitter.session_error(str(e))

    async def cancel_session(self, client: ClientSession):
        """Cancel a client's running session."""
        if client.task and not client.task.done():
            client.task.cancel()
            logger.info(f"Cancelled session for client {client.client_id}")
            await client.websocket.send(json.dumps({
                "type": "session_cancelled",
                "timestamp": datetime.now().isoformat()
            }))
        else:
            await client.websocket.send(json.dumps({
                "type": "info",
                "message": "No active session to cancel",
                "timestamp": datetime.now().isoformat()
            }))

    async def send_error(self, client: ClientSession, error: str):
        """Send error message to client."""
        try:
            await client.websocket.send(json.dumps({
                "type": "error",
                "error": error,
                "timestamp": datetime.now().isoformat()
            }))
        except Exception:
            pass  # Client might be disconnected

    async def run(self):
        """Start the WebSocket server."""
        async with websockets.serve(
            self.handle_connection,
            self.host,
            self.port,
            ping_interval=30,
            ping_timeout=10
        ):
            logger.info("=" * 60)
            logger.info(f"RLI Agent WebSocket Server")
            logger.info(f"Running on ws://{self.host}:{self.port}")
            logger.info("=" * 60)
            logger.info("Supported message types:")
            logger.info("  - START_SESSION: Start a new agent session")
            logger.info("  - CANCEL_SESSION: Cancel running session")
            logger.info("  - PING: Health check")
            logger.info("=" * 60)
            logger.info("Press Ctrl+C to stop")
            await asyncio.Future()  # Run forever


def main():
    """Entry point for the WebSocket server."""
    host = os.environ.get("WS_HOST", "0.0.0.0")
    port = int(os.environ.get("WS_PORT", "8765"))

    server = RLIAgentWebSocketServer(host=host, port=port)

    try:
        asyncio.run(server.run())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")


if __name__ == "__main__":
    main()
