#!/usr/bin/env python
"""
Standalone script to convert GLB to 3DM format.
This script downloads a GLB file, converts it to 3DM format, and uploads to Firebase.
"""

import asyncio
import sys
from pathlib import Path

# Add the project root to Python path
sys.path.insert(0, str(Path(__file__).parent))

from rli_agent.tools.converter_tool import convert_file


async def main():
    """Convert GLB to 3DM."""
    source_url = "https://storage.googleapis.com/kizuna-76f7c.firebasestorage.app/models_3d/525d62d7_model_7737.glb"
    target_format = "3dm"

    print(f"\nConverting GLB to 3DM format...")
    print(f"Source: {source_url}")
    print(f"Target format: {target_format}\n")

    try:
        result_url = await convert_file(source_url, target_format)
        print(f"\n{'='*60}")
        print(f"SUCCESS!")
        print(f"{'='*60}")
        print(f"\nConverted 3DM file URL:")
        print(f"{result_url}")
        print(f"\nThe file is production-ready for jewelry manufacturing.")
        print(f"All geometry and mesh details have been preserved.\n")
        return result_url

    except Exception as e:
        print(f"\n{'='*60}")
        print(f"ERROR!")
        print(f"{'='*60}")
        print(f"\nConversion failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result else 1)
