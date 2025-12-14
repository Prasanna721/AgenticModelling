"""Event emitter for broadcasting agent events to WebSocket clients."""

import json
import re
from datetime import datetime
from typing import Any, Dict, List, Optional


class EventEmitter:
    """Broadcasts agent events to a connected WebSocket client."""

    def __init__(self, websocket, session_id: str):
        """
        Initialize the event emitter.

        Args:
            websocket: The WebSocket connection to send events to
            session_id: Unique identifier for this session
        """
        self.websocket = websocket
        self.session_id = session_id

    async def emit(self, event_type: str, data: Dict[str, Any]) -> None:
        """
        Send an event to the connected WebSocket client.

        Args:
            event_type: Type of event (e.g., 'SUBAGENT_SPAWNED', 'TOOL_CALL_START')
            data: Event-specific data payload
        """
        message = {
            "type": "event",
            "timestamp": datetime.now().isoformat(),
            "session_id": self.session_id,
            "event_type": event_type,
            "data": data
        }
        try:
            await self.websocket.send(json.dumps(message))
        except Exception as e:
            print(f"[EventEmitter] Error sending event: {e}")

    # =========================================================================
    # Convenience methods for specific event types
    # =========================================================================

    async def session_started(self, request_preview: str) -> None:
        """Emit SESSION_STARTED event."""
        await self.emit("SESSION_STARTED", {
            "session_id": self.session_id,
            "request_preview": request_preview
        })

    async def subagent_spawned(
        self,
        agent_id: str,
        agent_type: str,
        description: str,
        parent_id: Optional[str] = None
    ) -> None:
        """Emit SUBAGENT_SPAWNED event when a new subagent is created."""
        await self.emit("SUBAGENT_SPAWNED", {
            "agent_id": agent_id,
            "agent_type": agent_type,
            "description": description,
            "parent_id": parent_id
        })

    async def tool_call_start(
        self,
        agent_id: str,
        tool_name: str,
        tool_input: Dict[str, Any],
        tool_use_id: str
    ) -> None:
        """Emit TOOL_CALL_START event when a tool begins execution."""
        await self.emit("TOOL_CALL_START", {
            "agent_id": agent_id,
            "tool_name": tool_name,
            "tool_input_summary": self._summarize_input(tool_input),
            "input_urls": self._extract_urls_from_input(tool_input),
            "tool_use_id": tool_use_id
        })

    async def tool_call_complete(
        self,
        agent_id: str,
        tool_name: str,
        tool_use_id: str,
        success: bool,
        result_url: Optional[str] = None,
        result: Optional[str] = None,
        error: Optional[str] = None
    ) -> None:
        """Emit TOOL_CALL_COMPLETE event when a tool finishes."""
        await self.emit("TOOL_CALL_COMPLETE", {
            "agent_id": agent_id,
            "tool_name": tool_name,
            "tool_use_id": tool_use_id,
            "success": success,
            "result_url": result_url,
            "result": result,
            "error": error
        })

    async def agent_message(self, agent_id: str, message: str) -> None:
        """Emit AGENT_MESSAGE event for text output from an agent."""
        await self.emit("AGENT_MESSAGE", {
            "agent_id": agent_id,
            "message": message
        })

    async def agent_complete(self, agent_id: str, summary: Dict[str, Any]) -> None:
        """Emit AGENT_COMPLETE event when a subagent finishes."""
        await self.emit("AGENT_COMPLETE", {
            "agent_id": agent_id,
            "summary": summary
        })

    async def session_complete(
        self,
        final_url: Optional[str],
        duration_ms: int,
        summary: Dict[str, Any]
    ) -> None:
        """Emit SESSION_COMPLETE event when the entire session is done."""
        await self.emit("SESSION_COMPLETE", {
            "final_url": final_url,
            "duration_ms": duration_ms,
            "summary": summary
        })

    async def session_error(self, error: str) -> None:
        """Emit SESSION_ERROR event when the session fails."""
        await self.emit("SESSION_ERROR", {
            "error": error
        })

    # =========================================================================
    # Helper methods
    # =========================================================================

    def _summarize_input(self, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a safe summary of tool input for display.

        Truncates long content and extracts meaningful parts of URLs.
        """
        if not tool_input:
            return {}

        summary = {}
        for key, value in tool_input.items():
            if key == "content":
                # Don't send full file contents, just the size
                summary[key] = f"({len(str(value))} chars)"

            elif key in ["image_url", "url", "font_url", "video_url"]:
                # Keep URLs full length for clickable links
                summary[key] = str(value)

            elif key == "image_urls":
                # Just show count for lists of URLs
                if isinstance(value, list):
                    summary[key] = f"[{len(value)} images]"
                else:
                    summary[key] = str(value)

            elif key == "prompt":
                # Send full prompt as requested
                summary[key] = str(value)

            elif key == "object_name":
                # Keep object names as-is (they're short)
                summary[key] = str(value)

            elif key == "text":
                # Truncate text content if extremely long
                str_value = str(value)
                if len(str_value) > 2000:
                    summary[key] = str_value[:2000] + "... (truncated)"
                else:
                    summary[key] = str_value

            elif key in ["size", "width", "height", "duration"]:
                # Keep numeric values as-is
                summary[key] = value

            else:
                # Generic handling for other keys
                str_value = str(value)
                if len(str_value) > 500:
                    summary[key] = str_value[:500] + "..."
                else:
                    summary[key] = value

        return summary

    def _extract_urls_from_input(self, tool_input: Dict[str, Any]) -> List[str]:
        """
        Extract all URLs from tool input for dependency tracking.

        Used to build data-flow edges in the visualization.
        """
        if not tool_input:
            return []

        urls = []

        for key, value in tool_input.items():
            # Direct URL fields
            if key in ["image_url", "url", "font_url", "source_url", "input_url", "video_url"]:
                if value and isinstance(value, str) and value.startswith("http"):
                    urls.append(value)

            # List of URLs
            elif key == "image_urls":
                if isinstance(value, list):
                    for url in value:
                        if url and isinstance(url, str) and url.startswith("http"):
                            urls.append(url)
                elif isinstance(value, str):
                    # Handle string that might contain URLs
                    found = re.findall(r'https?://[^\s<>"\']+', value)
                    urls.extend(found)

            # Check string values for embedded URLs
            elif isinstance(value, str) and "http" in value:
                found = re.findall(r'https?://[^\s<>"\']+', value)
                urls.extend(found)

        return urls
