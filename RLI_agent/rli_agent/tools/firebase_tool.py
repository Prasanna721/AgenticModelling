"""Firebase Storage tool for uploading and downloading files."""

import os
import uuid
import aiohttp
from io import BytesIO
from pathlib import Path
from typing import Optional
from PIL import Image

import firebase_admin
from firebase_admin import credentials, storage

from ..config import get_storage_bucket, get_service_account_path, get_firebase_config


# Initialize Firebase on module load
_firebase_initialized = False


def _init_firebase():
    """Initialize Firebase Admin SDK if not already initialized."""
    global _firebase_initialized
    if _firebase_initialized:
        return

    # Get storage bucket from config
    bucket_name = get_storage_bucket()
    if not bucket_name:
        raise ValueError("Firebase storage bucket not configured. Check firebase-config.json")

    # Try to get service account
    service_account_path = get_service_account_path()

    if service_account_path:
        # Initialize with service account (full admin access)
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred, {
            'storageBucket': bucket_name
        })
    else:
        # Initialize without credentials (limited functionality)
        try:
            firebase_admin.initialize_app(options={
                'storageBucket': bucket_name
            })
        except Exception as e:
            # Try with application default credentials
            cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred, {
                'storageBucket': bucket_name
            })

    _firebase_initialized = True


async def upload_to_firebase(
    data: bytes,
    filename: str,
    path_prefix: str = "agent-outputs",
    content_type: str = "image/png"
) -> str:
    """
    Upload file to Firebase Storage and return public URL.

    Args:
        data: Raw file bytes
        filename: Name for the file
        path_prefix: Directory prefix in storage (default: "agent-outputs")
        content_type: MIME type (default: "image/png")

    Returns:
        Public URL of the uploaded file
    """
    _init_firebase()

    bucket = storage.bucket()

    # Generate unique path
    unique_id = uuid.uuid4().hex[:8]
    unique_name = f"{path_prefix}/{unique_id}_{filename}"
    blob = bucket.blob(unique_name)

    # Upload with metadata
    blob.upload_from_string(
        data,
        content_type=content_type,
        timeout=120
    )

    # Make publicly accessible
    blob.make_public()

    return blob.public_url


async def upload_pil_image(
    image: Image.Image,
    filename: str,
    path_prefix: str = "agent-outputs",
    format: str = "PNG"
) -> str:
    """
    Upload a PIL Image to Firebase Storage.

    Args:
        image: PIL Image object
        filename: Name for the file
        path_prefix: Directory prefix in storage
        format: Image format (PNG, JPEG, etc.)

    Returns:
        Public URL of the uploaded image
    """
    # Convert PIL image to bytes
    buffer = BytesIO()
    image.save(buffer, format=format)
    image_data = buffer.getvalue()

    content_type = f"image/{format.lower()}"
    if not filename.lower().endswith(f".{format.lower()}"):
        filename = f"{filename}.{format.lower()}"

    return await upload_to_firebase(image_data, filename, path_prefix, content_type)


async def download_image(url: str) -> Image.Image:
    """
    Download an image from a URL and return as PIL Image.

    Args:
        url: URL of the image to download

    Returns:
        PIL Image object
    """
    async with aiohttp.ClientSession() as session:
        async with session.get(url, ssl=False, timeout=aiohttp.ClientTimeout(total=60)) as response:
            if response.status != 200:
                raise ValueError(f"Failed to download image: {response.status}")
            image_data = await response.read()

    return Image.open(BytesIO(image_data))


async def download_image_bytes(url: str) -> bytes:
    """
    Download an image from a URL and return raw bytes.

    Args:
        url: URL of the image to download

    Returns:
        Raw image bytes
    """
    async with aiohttp.ClientSession() as session:
        async with session.get(url, ssl=False, timeout=aiohttp.ClientTimeout(total=60)) as response:
            if response.status != 200:
                raise ValueError(f"Failed to download image: {response.status}")
            return await response.read()


async def download_file_bytes(url: str, timeout: int = 300) -> bytes:
    """
    Download any file from a URL and return raw bytes.

    Args:
        url: URL of the file to download
        timeout: Download timeout in seconds (default 300 for large files)

    Returns:
        Raw file bytes
    """
    async with aiohttp.ClientSession() as session:
        async with session.get(url, ssl=False, timeout=aiohttp.ClientTimeout(total=timeout)) as response:
            if response.status != 200:
                raise ValueError(f"Failed to download file: {response.status}")
            return await response.read()


def get_bucket_info() -> dict:
    """
    Get information about the configured Firebase Storage bucket.

    Returns:
        Dictionary with bucket configuration
    """
    config = get_firebase_config()
    return {
        "projectId": config.get("projectId"),
        "storageBucket": config.get("storageBucket"),
        "initialized": _firebase_initialized
    }
