"""Configuration management for the RLI agent."""

import os
import json
from pathlib import Path
from typing import Optional, Dict, Any

# Base directory
BASE_DIR = Path(__file__).parent.parent

# Firebase config file path
FIREBASE_CONFIG_PATH = BASE_DIR / "firebase-config.json"


def load_firebase_config() -> Dict[str, Any]:
    """
    Load Firebase configuration from JSON file.

    Returns:
        Dictionary with Firebase config
    """
    if not FIREBASE_CONFIG_PATH.exists():
        raise FileNotFoundError(f"Firebase config not found at {FIREBASE_CONFIG_PATH}")

    with open(FIREBASE_CONFIG_PATH, "r") as f:
        return json.load(f)


def get_storage_bucket() -> str:
    """
    Get the Firebase Storage bucket name.

    Priority:
    1. FIREBASE_STORAGE_BUCKET env var
    2. storageBucket from firebase-config.json

    Returns:
        Storage bucket name
    """
    # Check env var first
    env_bucket = os.environ.get("FIREBASE_STORAGE_BUCKET")
    if env_bucket:
        return env_bucket

    # Load from config file
    config = load_firebase_config()
    return config.get("storageBucket", "")


def get_project_id() -> str:
    """Get Firebase project ID from config."""
    config = load_firebase_config()
    return config.get("projectId", "")


def get_service_account_path() -> Optional[str]:
    """
    Get path to Firebase service account JSON.

    Returns:
        Path to service account JSON or None if not set
    """
    path = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
    if path and os.path.exists(path):
        return path

    # Check for default location
    default_path = BASE_DIR / "service-account.json"
    if default_path.exists():
        return str(default_path)

    return None


# Firebase configuration (loaded once)
FIREBASE_CONFIG = None

def get_firebase_config() -> Dict[str, Any]:
    """Get cached Firebase configuration."""
    global FIREBASE_CONFIG
    if FIREBASE_CONFIG is None:
        FIREBASE_CONFIG = load_firebase_config()
    return FIREBASE_CONFIG
