"""Runway Gen-3 tool for video generation."""

import os
import json
import time
from runwayml import RunwayML
from claude_code_sdk import tool

from .firebase_tool import upload_to_firebase, download_file_bytes


async def generate_video(
    prompt: str,
    image_url: str = None,
    duration: int = 10,
    ratio: str = "16:9"
) -> str:
    """
    Generate a video using Runway.

    Args:
        prompt: Text prompt for video generation
        image_url: Optional source image for image-to-video (uses gen3a_turbo)
        duration: Video duration in seconds
            - Image-to-video: 5 or 10 seconds
            - Text-to-video: 4, 6, or 8 seconds
        ratio: Aspect ratio
            - Image-to-video: "16:9" (1280:768), "9:16" (768:1280)
            - Text-to-video: "16:9" (1920:1080), "9:16" (1080:1920)

    Returns:
        Firebase URL of the generated video
    """
    # Initialize Runway client
    api_key = os.environ.get('RUNWAY_API_KEY')
    if not api_key:
        raise ValueError("RUNWAY_API_KEY environment variable not set")

    client = RunwayML(api_key=api_key)

    # Map common aspect ratios to API formats
    ratio_map_i2v = {
        "16:9": "1280:768",
        "9:16": "768:1280",
        "1280:768": "1280:768",
        "768:1280": "768:1280",
    }
    ratio_map_t2v = {
        "16:9": "1920:1080",
        "9:16": "1080:1920",
        "1920:1080": "1920:1080",
        "1080:1920": "1080:1920",
        "1280:720": "1280:720",
        "720:1280": "720:1280",
    }

    try:
        if image_url:
            # Image-to-Video generation (gen3a_turbo)
            api_ratio = ratio_map_i2v.get(ratio, "1280:768")
            api_duration = duration if duration in [5, 10] else 10
            task = client.image_to_video.create(
                model="gen3a_turbo",
                prompt_image=image_url,
                prompt_text=prompt,
                duration=api_duration,
                ratio=api_ratio,
            )
        else:
            # Text-to-Video generation (veo3.1_fast for speed)
            api_ratio = ratio_map_t2v.get(ratio, "1920:1080")
            # Map duration to valid values: 4, 6, or 8
            if duration <= 5:
                api_duration = 4
            elif duration <= 7:
                api_duration = 6
            else:
                api_duration = 8
            task = client.text_to_video.create(
                model="veo3.1_fast",
                prompt_text=prompt,
                duration=api_duration,
                ratio=api_ratio,
            )

        # Poll for completion
        task_id = task.id
        max_wait = 600  # 10 minutes max
        poll_interval = 5  # Check every 5 seconds
        elapsed = 0

        while elapsed < max_wait:
            task_status = client.tasks.retrieve(task_id)

            if task_status.status == "SUCCEEDED":
                # Get video URL from output
                video_url = None
                if task_status.output and len(task_status.output) > 0:
                    video_url = task_status.output[0]

                if not video_url:
                    raise ValueError("No video URL in successful task result")

                # Download video
                video_data = await download_file_bytes(video_url, timeout=300)

                # Upload to Firebase
                filename = f"video_{hash(prompt) % 10000}.mp4"
                firebase_url = await upload_to_firebase(
                    video_data,
                    filename,
                    path_prefix="videos",
                    content_type="video/mp4"
                )

                return firebase_url

            elif task_status.status == "FAILED":
                error_msg = getattr(task_status, 'failure', None) or "Unknown error"
                raise ValueError(f"Video generation failed: {error_msg}")

            elif task_status.status in ["PENDING", "RUNNING"]:
                time.sleep(poll_interval)
                elapsed += poll_interval
            else:
                raise ValueError(f"Unexpected task status: {task_status.status}")

        raise ValueError(f"Video generation timed out after {max_wait} seconds")

    except Exception as e:
        if "RunwayML" in str(type(e)):
            raise ValueError(f"Runway API error: {e}")
        raise


# SDK Tool Wrapper
@tool(
    "generate_video",
    "Generate a video using Runway Gen-3 AI. Supports text-to-video and image-to-video.",
    {
        "prompt": str,
        "image_url": str,  # Optional - for image-to-video
        "duration": int,   # Optional - 5 or 10 seconds
        "ratio": str,      # Optional - "16:9", "9:16", "1:1"
    }
)
async def generate_video_tool(args: dict) -> dict:
    """MCP tool wrapper for video generation."""
    try:
        url = await generate_video(
            prompt=args["prompt"],
            image_url=args.get("image_url"),
            duration=args.get("duration", 10),
            ratio=args.get("ratio", "16:9"),
        )
        return {
            "content": [{
                "type": "text",
                "text": json.dumps({
                    "success": True,
                    "url": url,
                    "format": "MP4"
                })
            }]
        }
    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": json.dumps({"success": False, "error": str(e)})
            }],
            "is_error": True
        }
