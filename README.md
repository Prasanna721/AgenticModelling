# RLA Agent

Multi-agent system for AI-powered **3D modeling** and **video generation** using Claude Agent SDK.

## Workflows

**3D Model Pipeline**
```
Planner → Image Generator → Model Extractor → [File Converter]
```

**Video Pipeline**
```
Planner → Researcher → Video Prompter → Video Generator
```

## Sub-Agents

| Agent | Role | Key Tools |
|-------|------|-----------|
| Orchestrator | Task coordination & delegation | Task spawning |
| Planner | Analyzes requests, creates execution plans | WebFetch, Read, Write |
| Image Generator | Creates images via Gemini | Gemini API |
| Model Extractor | Converts images to GLB 3D models | FAL SAM-3 |
| File Converter | GLB → 3DM/OBJ/STL conversion | trimesh, rhino3dm |
| Researcher | Gathers cinematography techniques | WebFetch |
| Video Prompter | Creates Runway-optimized prompts | Read, Write |
| Video Generator | Creates videos via Runway Gen-3 | Runway API |

## Quick Start

```bash
# Backend
cd RLI_agent
python -m venv venv && source venv/bin/activate
pip install -e .

# Frontend
cd ../frontend && npm install && npm run dev
```

## Environment Variables

Create `.env.local` with:

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Claude API key |
| `GOOGLE_API_KEY` | Gemini image generation |
| `FAL_API_KEY` | 3D model extraction |
| `RUNWAY_API_KEY` | Video generation |
| `FIREBASE_SERVICE_ACCOUNT` | Path to service-account.json |
| `FIREBASE_STORAGE_BUCKET` | Firebase bucket name |

## Usage

```bash
# Interactive CLI
python -m rli_agent.agent

# WebSocket server (for web UI)
python -m rli_agent.server
```

## Tech Stack

- **Orchestration**: Claude Sonnet/Haiku via Agent SDK
- **Image Gen**: Google Gemini 2.0
- **3D Extraction**: FAL SAM-3
- **Video Gen**: Runway Gen-3
- **Storage**: Firebase
- **Frontend**: Next.js 15, React 19
