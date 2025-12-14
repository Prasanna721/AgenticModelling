"""Gemini image generation tool using Google's Gemini API."""

import os
import json

from google import genai
from google.genai.types import GenerateContentConfig
from claude_code_sdk import tool

from .firebase_tool import upload_to_firebase


def _get_client():
    """Get Gemini client with API key."""
    api_key = os.environ.get('GOOGLE_API_KEY')
    if not api_key:
        raise ValueError("GOOGLE_API_KEY environment variable not set")
    return genai.Client(api_key=api_key)


async def generate_image(
    prompt: str
) -> str:
    """
    Generate or edit images using Gemini AI.

    Just pass a prompt. If the prompt contains URLs, Gemini will fetch them
    automatically via urlContext.

    Args:
        prompt: Complete prompt for generation/editing. Can include URLs directly.

    Returns:
        Firebase URL of the generated image
    """
    client = _get_client()

    response = client.models.generate_content(
        model="gemini-2.0-flash-exp-image-generation",
        contents=prompt,
        config=GenerateContentConfig(
            response_modalities=["image", "text"],
        )
    )

    # Extract image from response - data is already bytes, no decoding needed
    image_data = None
    for part in response.candidates[0].content.parts:
        if hasattr(part, 'inline_data') and part.inline_data:
            if part.inline_data.mime_type.startswith('image/'):
                image_data = part.inline_data.data
                break

    if not image_data:
        raise ValueError("No image generated in response")

    # Upload to Firebase
    filename = f"gemini_generated_{hash(prompt) % 10000}.png"
    url = await upload_to_firebase(image_data, filename, "generated")

    return url


# ============================================================================
# SDK Tool Wrapper
# ============================================================================

@tool("generate_image", "Generate or edit images using Gemini AI. Pass a detailed prompt (can include URLs).", {"prompt": str})
async def generate_image_tool(args: dict) -> dict:
    """Single tool for ALL Gemini image operations. Just pass a prompt."""
    try:
        url = await generate_image(prompt=args["prompt"])
        return {"content": [{"type": "text", "text": json.dumps({"success": True, "url": url})}]}
    except Exception as e:
        return {"content": [{"type": "text", "text": json.dumps({"success": False, "error": str(e)})}], "is_error": True}
