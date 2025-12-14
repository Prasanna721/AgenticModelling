"""Entry point for RLI agent using Claude Code SDK."""

import asyncio
import os
import re
import json
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, TYPE_CHECKING
from dotenv import load_dotenv
from claude_code_sdk import (
    query,
    ClaudeCodeOptions,
    AssistantMessage,
    ResultMessage,
)

from rli_agent.utils.subagent_tracker import SubagentTracker
from rli_agent.utils.transcript import setup_session, TranscriptWriter

if TYPE_CHECKING:
    from rli_agent.utils.event_emitter import EventEmitter

# Load environment variables
load_dotenv()

# Paths
PROMPTS_DIR = Path(__file__).parent / "prompts"
FILES_DIR = Path(__file__).parent.parent / "files"


def load_prompt(filename: str) -> str:
    """Load a prompt from the prompts directory."""
    prompt_path = PROMPTS_DIR / filename
    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read().strip()


def ensure_directories():
    """Ensure all required directories exist."""
    dirs = [
        FILES_DIR / "plans",
        FILES_DIR / "generated",
        FILES_DIR / "models_3d",
        FILES_DIR / "research",
        FILES_DIR / "video_prompts",
        FILES_DIR / "videos",
        FILES_DIR / "output",
        Path("logs")
    ]
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)


async def process_request(request: dict) -> Dict[str, Any]:
    """
    Process an RLI task request.

    Args:
        request: Dictionary containing:
            - task_brief: The RLI task description
            - context: Additional context (optional)

    Returns:
        Dictionary with deliverables and their output IDs
    """
    # Check API key
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise ValueError("ANTHROPIC_API_KEY not found. Set it in .env file or environment.")

    # Ensure directories exist
    ensure_directories()

    # Setup session directory and transcript
    transcript_file, session_dir = setup_session()
    transcript = TranscriptWriter(transcript_file)

    # Load orchestrator prompt
    orchestrator_prompt = load_prompt("orchestrator.txt")

    # Initialize subagent tracker
    tracker = SubagentTracker(transcript_writer=transcript, session_dir=session_dir)

    # Format the request as a prompt
    task_brief = request.get("task_brief", "")
    context = request.get("context", {})

    formatted_request = f"""
## RLI Task Brief
{task_brief}

## Additional Context
{json.dumps(context, indent=2) if context else "None provided"}
"""

    deliverables = {}

    try:
        transcript.write(f"\nTask Brief: {task_brief[:100]}...\n")
        transcript.write("\nOrchestrator Response:\n")

        # Use Claude Code SDK query
        options = ClaudeCodeOptions(
            system_prompt=orchestrator_prompt,
            max_turns=50,
        )

        async for message in query(prompt=formatted_request, options=options):
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if hasattr(block, 'text'):
                        text = block.text
                        transcript.write(text)
                        print(text, end="", flush=True)

                        # Extract deliverable URLs from response
                        urls = re.findall(r'https://[^\s\)\"\'\]\>]+', text)
                        for url in urls:
                            url = url.rstrip('.,;:')
                            if 'firebase' in url or 'storage.googleapis' in url:
                                if '.glb' in url or 'models_3d' in url:
                                    deliverables['3d_model'] = url
                                elif '.mp4' in url or 'videos' in url:
                                    deliverables['video'] = url
                                elif '.png' in url or 'generated' in url:
                                    deliverables['image'] = url

            elif isinstance(message, ResultMessage):
                # Final result
                if hasattr(message, 'text'):
                    transcript.write(message.text)

        print()  # New line after streaming
        transcript.write("\n")

    finally:
        transcript.write("\n\nSession complete.\n")
        transcript.close()
        tracker.close()
        print(f"\nSession logs saved to: {session_dir}")

    return {
        "deliverables": deliverables,
        "session_dir": str(session_dir),
        "tool_calls": len(tracker.tool_call_records)
    }


async def chat():
    """Interactive chat mode for testing the agent."""

    # Check API key
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("\nError: ANTHROPIC_API_KEY not found.")
        print("Set it in a .env file or export it in your shell.")
        print("Get your key at: https://console.anthropic.com/settings/keys\n")
        return

    # Ensure directories exist
    ensure_directories()

    # Setup session
    transcript_file, session_dir = setup_session()
    transcript = TranscriptWriter(transcript_file)

    # Load orchestrator prompt
    orchestrator_prompt = load_prompt("orchestrator.txt")

    print("\n" + "=" * 60)
    print("RLI Agent - Remote Labor Index Task Delivery System")
    print("=" * 60)
    print("\nThis agent handles two types of tasks:")
    print("  - 3D Model Generation: Image -> 3D Model (GLB)")
    print("  - Video Generation: Research -> Prompt -> Video (MP4)")
    print(f"\nSession logs: {session_dir}")
    print("\nType 'exit' to quit.\n")

    print("Example inputs:")
    print('  {"task_brief": "Create a 3D model of a futuristic sports car"}')
    print('  {"task_brief": "Create a 10-second cinematic sunset video"}')
    print("\nOr just type a simple description.\n")

    try:
        while True:
            try:
                user_input = input("\nYou: ").strip()
            except (EOFError, KeyboardInterrupt):
                break

            if not user_input or user_input.lower() in ["exit", "quit", "q"]:
                break

            # Try to parse as JSON, otherwise treat as plain text
            try:
                request = json.loads(user_input)
                formatted_input = f"""
## RLI Task Brief
{request.get('task_brief', user_input)}

## Additional Context
{json.dumps(request.get('context', {}), indent=2)}
"""
            except json.JSONDecodeError:
                formatted_input = f"""
## RLI Task Brief
{user_input}
"""

            transcript.write(f"\nYou: {user_input}\n")
            print("\nAgent: ", end="", flush=True)

            # Query Claude with streaming
            options = ClaudeCodeOptions(
                system_prompt=orchestrator_prompt,
                max_turns=50,
            )

            transcript.write("\nAgent: ")

            async for message in query(prompt=formatted_input, options=options):
                if isinstance(message, AssistantMessage):
                    for block in message.content:
                        if hasattr(block, 'text'):
                            print(block.text, end="", flush=True)
                            transcript.write(block.text)

            print()  # New line after response
            transcript.write("\n")

    finally:
        transcript.write("\n\nGoodbye!\n")
        transcript.close()
        print(f"\nSession logs saved to: {session_dir}")
        print(f"  - Transcript: {transcript_file}")


def main():
    """Entry point for CLI."""
    asyncio.run(chat())


if __name__ == "__main__":
    main()
