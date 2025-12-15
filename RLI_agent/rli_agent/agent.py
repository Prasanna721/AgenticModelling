"""Entry point for RLI agent using Claude Agent SDK."""

import asyncio
import os
import re
import json
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, TYPE_CHECKING
from dotenv import load_dotenv
from claude_agent_sdk import (
    ClaudeSDKClient,
    ClaudeAgentOptions,
    AgentDefinition,
    HookMatcher,
    create_sdk_mcp_server
)

from rli_agent.utils.subagent_tracker import SubagentTracker
from rli_agent.utils.transcript import setup_session, TranscriptWriter
from rli_agent.utils.message_handler import process_assistant_message

if TYPE_CHECKING:
    from rli_agent.utils.event_emitter import EventEmitter

# Import tool wrappers for MCP servers
from rli_agent.tools.gemini_tool import generate_image_tool
from rli_agent.tools.fal_tool import extract_3d_model_tool
from rli_agent.tools.runway_tool import generate_video_tool
from rli_agent.tools.converter_tool import convert_file_tool

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

    # Load prompts
    orchestrator_prompt = load_prompt("orchestrator.txt")
    planner_prompt = load_prompt("planner.txt")
    image_generator_prompt = load_prompt("image_generator.txt")
    model_extractor_prompt = load_prompt("model_extractor.txt")
    researcher_prompt = load_prompt("researcher.txt")
    video_prompter_prompt = load_prompt("video_prompter.txt")
    video_generator_prompt = load_prompt("video_generator.txt")
    file_converter_prompt = load_prompt("file_converter.txt")

    # Initialize subagent tracker
    tracker = SubagentTracker(transcript_writer=transcript, session_dir=session_dir)

    # Create MCP servers for custom tools
    gemini_server = create_sdk_mcp_server(
        name="gemini-tools",
        version="1.0.0",
        tools=[generate_image_tool]
    )

    fal_server = create_sdk_mcp_server(
        name="fal-tools",
        version="1.0.0",
        tools=[extract_3d_model_tool]
    )

    runway_server = create_sdk_mcp_server(
        name="runway-tools",
        version="1.0.0",
        tools=[generate_video_tool]
    )

    converter_server = create_sdk_mcp_server(
        name="converter-tools",
        version="1.0.0",
        tools=[convert_file_tool]
    )

    # Define specialized subagents with MCP tool references
    agents = {
        "planner": AgentDefinition(
            description=(
                "Analyze RLI task request and create execution plan. "
                "Determines flow type (3D model or video). Creates a detailed plan "
                "specifying which agents are needed and their sequence. "
                "ALWAYS SPAWN THIS AGENT FIRST before any other agents."
            ),
            tools=["Write", "Read", "WebFetch"],
            prompt=planner_prompt,
            model="haiku"
        ),
        "image-generator": AgentDefinition(
            description=(
                "Generate images using Gemini Pro Image AI. "
                "Provide detailed prompts with style, composition, and background specifications. "
                "For 3D model conversion, use clean backgrounds and studio lighting. "
                "Returns the Firebase URL of the generated image."
            ),
            tools=["mcp__gemini-tools__generate_image", "Write"],
            prompt=image_generator_prompt,
            model="haiku"
        ),
        "model-extractor": AgentDefinition(
            description=(
                "Convert images to 3D models (GLB format) using FAL SAM-3 AI. "
                "Provide the image URL and optional object description for better segmentation. "
                "Returns the Firebase URL of the generated GLB file."
            ),
            tools=["mcp__fal-tools__extract_3d_model"],
            prompt=model_extractor_prompt,
            model="haiku"
        ),
        "researcher": AgentDefinition(
            description=(
                "Research video production techniques - camera angles, lighting, motion styles, "
                "cinematography. Gathers practical, actionable information for video generation. "
                "Saves research findings to files/research/."
            ),
            tools=["WebFetch", "Write"],
            prompt=researcher_prompt,
            model="haiku"
        ),
        "video-prompter": AgentDefinition(
            description=(
                "Create detailed Runway-optimized video generation prompts based on research findings. "
                "Include camera movement, lighting, and atmosphere instructions. "
                "Saves prompts to files/video_prompts/."
            ),
            tools=["Read", "Write"],
            prompt=video_prompter_prompt,
            model="haiku"
        ),
        "video-generator": AgentDefinition(
            description=(
                "Generate videos using Runway Gen-3 AI. "
                "Supports text-to-video and image-to-video with custom duration and aspect ratio. "
                "Returns the Firebase URL of the generated MP4 video."
            ),
            tools=["mcp__runway-tools__generate_video"],
            prompt=video_generator_prompt,
            model="haiku"
        ),
        "file-converter": AgentDefinition(
            description=(
                "Convert 3D files between formats. "
                "Primary use: GLB to 3DM (Rhino format) for CAD workflows. "
                "Also supports OBJ and STL output. "
                "Returns the Firebase URL of the converted file."
            ),
            tools=["mcp__converter-tools__convert_file"],
            prompt=file_converter_prompt,
            model="haiku"
        )
    }

    # Set up hooks for tracking
    hooks = {
        'PreToolUse': [
            HookMatcher(
                matcher=None,  # Match all tools
                hooks=[tracker.pre_tool_use_hook]
            )
        ],
        'PostToolUse': [
            HookMatcher(
                matcher=None,  # Match all tools
                hooks=[tracker.post_tool_use_hook]
            )
        ]
    }

    # Configure the orchestrator agent with MCP servers
    options = ClaudeAgentOptions(
        permission_mode="bypassPermissions",
        system_prompt=orchestrator_prompt,
        allowed_tools=["Task"],
        agents=agents,
        hooks=hooks,
        mcp_servers={
            "gemini-tools": gemini_server,
            "fal-tools": fal_server,
            "runway-tools": runway_server,
            "converter-tools": converter_server
        },
        model="sonnet"  # Use sonnet for orchestrator for better coordination
    )

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
    final_url = None

    try:
        async with ClaudeSDKClient(options=options) as client:
            # Send the request
            await client.query(prompt=formatted_request)

            transcript.write(f"\nTask Brief: {task_brief[:100]}...\n")
            transcript.write("\nOrchestrator: ", end="")

            # Stream and process response
            async for msg in client.receive_response():
                if type(msg).__name__ == 'AssistantMessage':
                    process_assistant_message(msg, tracker, transcript)

                    # Try to extract final URLs from response
                    for block in msg.content:
                        if type(block).__name__ == 'TextBlock':
                            text = block.text
                            # Look for Firebase URLs in the response
                            if 'firebase' in text.lower() or 'storage.googleapis' in text.lower():
                                urls = re.findall(r'https://[^\s\)\"\'\]\>]+', text)
                                for url in urls:
                                    url = url.rstrip('.,;:')
                                    if 'storage.googleapis.com' in url or 'firebase' in url:
                                        if '.glb' in url or 'models_3d' in url:
                                            deliverables['3d_model'] = url
                                            final_url = url
                                        elif '.mp4' in url or 'videos' in url:
                                            deliverables['video'] = url
                                            final_url = url
                                        elif '.png' in url or 'generated' in url:
                                            deliverables['image'] = url
                                            if not final_url:
                                                final_url = url

            transcript.write("\n")

    finally:
        transcript.write("\n\nSession complete.\n")
        transcript.close()
        tracker.close()
        print(f"\nSession logs saved to: {session_dir}")

    return {
        "deliverables": deliverables,
        "final_url": final_url,
        "session_dir": str(session_dir),
        "tool_calls": len(tracker.tool_call_records),
        "agents_spawned": len(tracker.sessions)
    }


async def process_request_with_events(request: dict, event_emitter: "EventEmitter") -> Optional[str]:
    """
    Process an RLI task request with WebSocket event streaming.

    Args:
        request: Dictionary containing:
            - task_brief: The RLI task description
            - context: Additional context (optional)
        event_emitter: EventEmitter instance for WebSocket broadcasting

    Returns:
        URL of the final deliverable
    """
    start_time = datetime.now()

    # Check API key
    if not os.environ.get("ANTHROPIC_API_KEY"):
        await event_emitter.session_error("ANTHROPIC_API_KEY not found")
        raise ValueError("ANTHROPIC_API_KEY not found. Set it in .env file or environment.")

    # Ensure directories exist
    ensure_directories()

    # Setup session directory and transcript
    transcript_file, session_dir = setup_session()
    transcript = TranscriptWriter(transcript_file)

    # Emit session started event
    task_brief = request.get("task_brief", "")
    await event_emitter.session_started(task_brief[:100])

    # Load prompts
    orchestrator_prompt = load_prompt("orchestrator.txt")
    planner_prompt = load_prompt("planner.txt")
    image_generator_prompt = load_prompt("image_generator.txt")
    model_extractor_prompt = load_prompt("model_extractor.txt")
    researcher_prompt = load_prompt("researcher.txt")
    video_prompter_prompt = load_prompt("video_prompter.txt")
    video_generator_prompt = load_prompt("video_generator.txt")
    file_converter_prompt = load_prompt("file_converter.txt")

    # Initialize subagent tracker with event emitter
    tracker = SubagentTracker(
        transcript_writer=transcript,
        session_dir=session_dir,
        event_emitter=event_emitter
    )

    # Create MCP servers for custom tools
    gemini_server = create_sdk_mcp_server(
        name="gemini-tools",
        version="1.0.0",
        tools=[generate_image_tool]
    )

    fal_server = create_sdk_mcp_server(
        name="fal-tools",
        version="1.0.0",
        tools=[extract_3d_model_tool]
    )

    runway_server = create_sdk_mcp_server(
        name="runway-tools",
        version="1.0.0",
        tools=[generate_video_tool]
    )

    converter_server = create_sdk_mcp_server(
        name="converter-tools",
        version="1.0.0",
        tools=[convert_file_tool]
    )

    # Define specialized subagents
    agents = {
        "planner": AgentDefinition(
            description=(
                "Analyze RLI task request and create execution plan. "
                "Determines flow type (3D model or video). Creates a detailed plan "
                "specifying which agents are needed and their sequence. "
                "ALWAYS SPAWN THIS AGENT FIRST before any other agents."
            ),
            tools=["Write", "Read", "WebFetch"],
            prompt=planner_prompt,
            model="haiku"
        ),
        "image-generator": AgentDefinition(
            description=(
                "Generate images using Gemini Pro Image AI. "
                "Provide detailed prompts with style, composition, and background specifications. "
                "For 3D model conversion, use clean backgrounds and studio lighting. "
                "Returns the Firebase URL of the generated image."
            ),
            tools=["mcp__gemini-tools__generate_image", "Write"],
            prompt=image_generator_prompt,
            model="haiku"
        ),
        "model-extractor": AgentDefinition(
            description=(
                "Convert images to 3D models (GLB format) using FAL SAM-3 AI. "
                "Provide the image URL and optional object description for better segmentation. "
                "Returns the Firebase URL of the generated GLB file."
            ),
            tools=["mcp__fal-tools__extract_3d_model"],
            prompt=model_extractor_prompt,
            model="haiku"
        ),
        "researcher": AgentDefinition(
            description=(
                "Research video production techniques - camera angles, lighting, motion styles, "
                "cinematography. Gathers practical, actionable information for video generation. "
                "Saves research findings to files/research/."
            ),
            tools=["WebFetch", "Write"],
            prompt=researcher_prompt,
            model="haiku"
        ),
        "video-prompter": AgentDefinition(
            description=(
                "Create detailed Runway-optimized video generation prompts based on research findings. "
                "Include camera movement, lighting, and atmosphere instructions. "
                "Saves prompts to files/video_prompts/."
            ),
            tools=["Read", "Write"],
            prompt=video_prompter_prompt,
            model="haiku"
        ),
        "video-generator": AgentDefinition(
            description=(
                "Generate videos using Runway Gen-3 AI. "
                "Supports text-to-video and image-to-video with custom duration and aspect ratio. "
                "Returns the Firebase URL of the generated MP4 video."
            ),
            tools=["mcp__runway-tools__generate_video"],
            prompt=video_generator_prompt,
            model="haiku"
        ),
        "file-converter": AgentDefinition(
            description=(
                "Convert 3D files between formats. "
                "Primary use: GLB to 3DM (Rhino format) for CAD workflows. "
                "Also supports OBJ and STL output. "
                "Returns the Firebase URL of the converted file."
            ),
            tools=["mcp__converter-tools__convert_file"],
            prompt=file_converter_prompt,
            model="haiku"
        )
    }

    # Set up hooks for tracking
    hooks = {
        'PreToolUse': [
            HookMatcher(
                matcher=None,
                hooks=[tracker.pre_tool_use_hook]
            )
        ],
        'PostToolUse': [
            HookMatcher(
                matcher=None,
                hooks=[tracker.post_tool_use_hook]
            )
        ]
    }

    # Configure the orchestrator agent
    options = ClaudeAgentOptions(
        permission_mode="bypassPermissions",
        system_prompt=orchestrator_prompt,
        allowed_tools=["Task"],
        agents=agents,
        hooks=hooks,
        mcp_servers={
            "gemini-tools": gemini_server,
            "fal-tools": fal_server,
            "runway-tools": runway_server,
            "converter-tools": converter_server
        },
        model="sonnet"
    )

    # Format the request
    context = request.get("context", {})
    formatted_request = f"""
## RLI Task Brief
{task_brief}

## Additional Context
{json.dumps(context, indent=2) if context else "None provided"}
"""

    final_url = None

    try:
        async with ClaudeSDKClient(options=options) as client:
            await client.query(prompt=formatted_request)

            transcript.write(f"\nTask Brief: {task_brief[:100]}...\n")
            transcript.write("\nOrchestrator: ", end="")

            async for msg in client.receive_response():
                if type(msg).__name__ == 'AssistantMessage':
                    process_assistant_message(msg, tracker, transcript)

                    # Extract final URL from response
                    for block in msg.content:
                        if type(block).__name__ == 'TextBlock':
                            text = block.text
                            if 'firebase' in text.lower() or 'storage.googleapis' in text.lower():
                                urls = re.findall(r'https://[^\s\)\"\'\]\>]+', text)
                                for url in urls:
                                    if 'storage.googleapis.com' in url or 'firebase' in url:
                                        final_url = url.rstrip('.,;:')

            transcript.write("\n")

    finally:
        duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)

        # Emit session complete event
        await event_emitter.session_complete(
            final_url=final_url,
            duration_ms=duration_ms,
            summary={
                "agents_spawned": len(tracker.sessions),
                "total_tool_calls": len(tracker.tool_call_records)
            }
        )

        transcript.write("\n\nSession complete.\n")
        transcript.close()
        tracker.close()
        print(f"\nSession logs saved to: {session_dir}")

    return final_url


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

    # Load prompts
    orchestrator_prompt = load_prompt("orchestrator.txt")
    planner_prompt = load_prompt("planner.txt")
    image_generator_prompt = load_prompt("image_generator.txt")
    model_extractor_prompt = load_prompt("model_extractor.txt")
    researcher_prompt = load_prompt("researcher.txt")
    video_prompter_prompt = load_prompt("video_prompter.txt")
    video_generator_prompt = load_prompt("video_generator.txt")
    file_converter_prompt = load_prompt("file_converter.txt")

    # Initialize tracker
    tracker = SubagentTracker(transcript_writer=transcript, session_dir=session_dir)

    # Create MCP servers
    gemini_server = create_sdk_mcp_server(
        name="gemini-tools",
        version="1.0.0",
        tools=[generate_image_tool]
    )

    fal_server = create_sdk_mcp_server(
        name="fal-tools",
        version="1.0.0",
        tools=[extract_3d_model_tool]
    )

    runway_server = create_sdk_mcp_server(
        name="runway-tools",
        version="1.0.0",
        tools=[generate_video_tool]
    )

    converter_server = create_sdk_mcp_server(
        name="converter-tools",
        version="1.0.0",
        tools=[convert_file_tool]
    )

    # Define agents
    agents = {
        "planner": AgentDefinition(
            description="Analyze request and create execution plan. ALWAYS SPAWN FIRST.",
            tools=["Write", "Read", "WebFetch"],
            prompt=planner_prompt,
            model="haiku"
        ),
        "image-generator": AgentDefinition(
            description="Generate images using Gemini Pro Image AI.",
            tools=["mcp__gemini-tools__generate_image", "Write"],
            prompt=image_generator_prompt,
            model="haiku"
        ),
        "model-extractor": AgentDefinition(
            description="Convert images to 3D models (GLB) using FAL SAM-3.",
            tools=["mcp__fal-tools__extract_3d_model"],
            prompt=model_extractor_prompt,
            model="haiku"
        ),
        "researcher": AgentDefinition(
            description="Research video production techniques.",
            tools=["WebFetch", "Write"],
            prompt=researcher_prompt,
            model="haiku"
        ),
        "video-prompter": AgentDefinition(
            description="Create detailed Runway video prompts.",
            tools=["Read", "Write"],
            prompt=video_prompter_prompt,
            model="haiku"
        ),
        "video-generator": AgentDefinition(
            description="Generate videos using Runway Gen-3.",
            tools=["mcp__runway-tools__generate_video"],
            prompt=video_generator_prompt,
            model="haiku"
        ),
        "file-converter": AgentDefinition(
            description="Convert 3D files between formats (GLB to 3DM, OBJ, STL).",
            tools=["mcp__converter-tools__convert_file"],
            prompt=file_converter_prompt,
            model="haiku"
        )
    }

    # Set up hooks
    hooks = {
        'PreToolUse': [
            HookMatcher(matcher=None, hooks=[tracker.pre_tool_use_hook])
        ],
        'PostToolUse': [
            HookMatcher(matcher=None, hooks=[tracker.post_tool_use_hook])
        ]
    }

    print("\n" + "=" * 60)
    print("RLI Agent - Remote Labor Index Task Delivery System")
    print("=" * 60)
    print("\nThis agent handles two types of tasks:")
    print("  - 3D Model Generation: Image -> 3D Model (GLB)")
    print("  - Video Generation: Research -> Prompt -> Video (MP4)")
    print(f"\nSession logs: {session_dir}")
    print("\nType 'exit' to quit.\n")

    print("Example inputs:")
    print('  Create a 3D model of a futuristic sports car')
    print('  Create a 10-second cinematic sunset video')
    print()

    # Configure options
    options = ClaudeAgentOptions(
        permission_mode="bypassPermissions",
        system_prompt=orchestrator_prompt,
        allowed_tools=["Task"],
        agents=agents,
        hooks=hooks,
        mcp_servers={
            "gemini-tools": gemini_server,
            "fal-tools": fal_server,
            "runway-tools": runway_server,
            "converter-tools": converter_server
        },
        model="sonnet"
    )

    try:
        async with ClaudeSDKClient(options=options) as client:
            while True:
                try:
                    user_input = input("\nYou: ").strip()
                except (EOFError, KeyboardInterrupt):
                    break

                if not user_input or user_input.lower() in ["exit", "quit", "q"]:
                    break

                formatted_input = f"""
## RLI Task Brief
{user_input}
"""

                transcript.write(f"\nYou: {user_input}\n")
                print("\nAgent: ", end="", flush=True)

                await client.query(prompt=formatted_input)
                transcript.write("\nAgent: ")

                async for msg in client.receive_response():
                    if type(msg).__name__ == 'AssistantMessage':
                        process_assistant_message(msg, tracker, transcript)

                print()
                transcript.write("\n")

    finally:
        transcript.write("\n\nGoodbye!\n")
        transcript.close()
        tracker.close()
        print(f"\nSession logs saved to: {session_dir}")
        print(f"  - Transcript: {transcript_file}")


def main():
    """Entry point for CLI."""
    asyncio.run(chat())


if __name__ == "__main__":
    main()
