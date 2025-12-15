"""3D file format converter tool."""

import os
import json
import tempfile
from pathlib import Path

from claude_agent_sdk import tool

from .firebase_tool import download_file_bytes, upload_to_firebase


SUPPORTED_CONVERSIONS = {
    "3dm": {
        "extension": ".3dm",
        "content_type": "application/octet-stream",
        "description": "Rhino 3DM format"
    },
    "obj": {
        "extension": ".obj",
        "content_type": "model/obj",
        "description": "Wavefront OBJ format"
    },
    "stl": {
        "extension": ".stl",
        "content_type": "model/stl",
        "description": "STL format"
    },
    "fbx": {
        "extension": ".fbx",
        "content_type": "application/octet-stream",
        "description": "FBX format"
    }
}


async def convert_glb_to_obj(glb_data: bytes) -> bytes:
    """Convert GLB to OBJ format using trimesh."""
    import trimesh

    with tempfile.NamedTemporaryFile(suffix='.glb', delete=False) as f:
        f.write(glb_data)
        glb_path = f.name

    try:
        # Load GLB with trimesh
        mesh = trimesh.load(glb_path)

        # If it's a scene, get the geometry
        if hasattr(mesh, 'geometry'):
            # Combine all geometries
            meshes = list(mesh.geometry.values())
            if meshes:
                mesh = trimesh.util.concatenate(meshes)

        # Export to OBJ
        obj_data = mesh.export(file_type='obj')
        return obj_data.encode() if isinstance(obj_data, str) else obj_data
    finally:
        os.unlink(glb_path)


async def convert_glb_to_stl(glb_data: bytes) -> bytes:
    """Convert GLB to STL format using trimesh."""
    import trimesh

    with tempfile.NamedTemporaryFile(suffix='.glb', delete=False) as f:
        f.write(glb_data)
        glb_path = f.name

    try:
        mesh = trimesh.load(glb_path)

        if hasattr(mesh, 'geometry'):
            meshes = list(mesh.geometry.values())
            if meshes:
                mesh = trimesh.util.concatenate(meshes)

        return mesh.export(file_type='stl')
    finally:
        os.unlink(glb_path)


async def convert_glb_to_3dm(glb_data: bytes) -> bytes:
    """Convert GLB to 3DM (Rhino) format."""
    import trimesh
    import rhino3dm

    with tempfile.NamedTemporaryFile(suffix='.glb', delete=False) as f:
        f.write(glb_data)
        glb_path = f.name

    try:
        # Load GLB with trimesh
        scene = trimesh.load(glb_path)

        # Create Rhino 3DM file
        model = rhino3dm.File3dm()

        # Get meshes from scene
        if hasattr(scene, 'geometry'):
            meshes = list(scene.geometry.values())
        else:
            meshes = [scene]

        for mesh in meshes:
            if not hasattr(mesh, 'vertices') or not hasattr(mesh, 'faces'):
                continue

            # Create Rhino mesh
            rhino_mesh = rhino3dm.Mesh()

            # Add vertices
            for vertex in mesh.vertices:
                rhino_mesh.Vertices.Add(float(vertex[0]), float(vertex[1]), float(vertex[2]))

            # Add faces
            for face in mesh.faces:
                if len(face) == 3:
                    rhino_mesh.Faces.AddFace(int(face[0]), int(face[1]), int(face[2]))
                elif len(face) == 4:
                    rhino_mesh.Faces.AddFace(int(face[0]), int(face[1]), int(face[2]), int(face[3]))

            # Compute normals
            rhino_mesh.Normals.ComputeNormals()
            rhino_mesh.Compact()

            # Add to model
            model.Objects.AddMesh(rhino_mesh)

        # Save to temp file and read bytes
        with tempfile.NamedTemporaryFile(suffix='.3dm', delete=False) as out_f:
            out_path = out_f.name

        model.Write(out_path)

        with open(out_path, 'rb') as f:
            result = f.read()

        os.unlink(out_path)
        return result

    finally:
        os.unlink(glb_path)


async def convert_file(source_url: str, target_format: str) -> str:
    """
    Convert a 3D file to a different format.

    Args:
        source_url: URL of the source 3D file (GLB/GLTF)
        target_format: Target format (3dm, obj, stl)

    Returns:
        Firebase URL of the converted file
    """
    target_format = target_format.lower().strip('.')

    if target_format not in SUPPORTED_CONVERSIONS:
        raise ValueError(f"Unsupported target format: {target_format}. Supported: {list(SUPPORTED_CONVERSIONS.keys())}")

    # Download source file
    source_data = await download_file_bytes(source_url, timeout=300)

    # Determine conversion function based on target format
    if target_format == "3dm":
        converted_data = await convert_glb_to_3dm(source_data)
    elif target_format == "obj":
        converted_data = await convert_glb_to_obj(source_data)
    elif target_format == "stl":
        converted_data = await convert_glb_to_stl(source_data)
    else:
        raise ValueError(f"Conversion to {target_format} not yet implemented")

    # Upload to Firebase
    format_info = SUPPORTED_CONVERSIONS[target_format]
    filename = f"converted_model{format_info['extension']}"

    url = await upload_to_firebase(
        converted_data,
        filename,
        path_prefix="models_3d",
        content_type=format_info['content_type']
    )

    return url


# ============================================================================
# SDK Tool Wrapper
# ============================================================================

@tool(
    "convert_file",
    "Convert 3D files between formats. Supports GLB to 3DM, OBJ, STL conversion.",
    {
        "source_url": str,
        "target_format": str
    }
)
async def convert_file_tool(args: dict) -> dict:
    """Convert 3D file to different format."""
    try:
        url = await convert_file(
            source_url=args["source_url"],
            target_format=args["target_format"]
        )
        return {
            "content": [{
                "type": "text",
                "text": json.dumps({
                    "success": True,
                    "url": url,
                    "format": args["target_format"]
                })
            }]
        }
    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": json.dumps({
                    "success": False,
                    "error": str(e)
                })
            }],
            "is_error": True
        }
