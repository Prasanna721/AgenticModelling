"""FAL AI tool for 3D model extraction using SAM-3 3D Objects."""

import os
import json
import fal_client
from claude_agent_sdk import tool

from .firebase_tool import upload_to_firebase, download_file_bytes


async def extract_3d_model(
    image_url: str,
    prompt: str = None,
    seed: int = None
) -> str:
    """
    Convert an image to a 3D model using FAL SAM-3 3D Objects API.

    Args:
        image_url: URL of the source image
        prompt: Text description for auto-segmentation (e.g., "ring", "car", "shoe")
        seed: Optional seed for reproducibility

    Returns:
        Firebase URL of the generated GLB file
    """
    # Set FAL API key
    fal_key = os.environ.get('FAL_KEY')
    if not fal_key:
        raise ValueError("FAL_KEY environment variable not set")

    os.environ["FAL_KEY"] = fal_key

    # Build parameters
    params = {
        "image_url": image_url,
    }

    if prompt:
        params["prompt"] = prompt

    if seed is not None:
        params["seed"] = seed

    # Call FAL SAM-3 3D Objects API
    result = fal_client.subscribe("fal-ai/sam-3/3d-objects", arguments=params)

    # Extract the GLB URL from result
    glb_url = None
    if isinstance(result, dict):
        # Primary: model_glb field
        if "model_glb" in result and isinstance(result["model_glb"], dict):
            glb_url = result["model_glb"].get("url")
        # Fallback: individual_glbs array
        elif "individual_glbs" in result and len(result["individual_glbs"]) > 0:
            first_glb = result["individual_glbs"][0]
            if isinstance(first_glb, dict):
                glb_url = first_glb.get("url")
        # Fallback: direct url field
        elif "url" in result:
            glb_url = result["url"]

    if not glb_url:
        raise ValueError(f"Could not extract GLB URL from API response: {result}")

    # Download the GLB file
    glb_data = await download_file_bytes(glb_url, timeout=120)

    # Upload to Firebase
    filename = f"model_{hash(image_url) % 10000}.glb"
    firebase_url = await upload_to_firebase(
        glb_data,
        filename,
        path_prefix="models_3d",
        content_type="model/gltf-binary"
    )

    return firebase_url


# SDK Tool Wrapper
@tool(
    "extract_3d_model",
    "Convert an image to a 3D model (GLB format) using FAL SAM-3 AI. Provide an image URL and optional prompt describing the object.",
    {
        "image_url": str,
        "prompt": str,  # Optional - describes the object to extract (e.g., "ring", "car")
    }
)
async def extract_3d_model_tool(args: dict) -> dict:
    """MCP tool wrapper for 3D model extraction."""
    try:
        url = await extract_3d_model(
            image_url=args["image_url"],
            prompt=args.get("prompt"),
        )
        return {
            "content": [{
                "type": "text",
                "text": json.dumps({
                    "success": True,
                    "url": url,
                    "format": "GLB"
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
