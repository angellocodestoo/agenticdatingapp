# Agentic Dating App (Team Scaffold)

This repository is a starting point for a microservices + event-driven “agentic dating” system.

## Current status

- **Implemented**: The core **Agent Conversation Engine** data models + negotiation runner (Python).
- **Next**: Add ingestion/embedding service, scheduling/notifications service, and an API gateway.

## Local dev (Agent Conversation Engine)

### Requirements

- Python 3.11+ recommended

### Install

```bash
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1

pip install -e ".[dev]"
```

### Run the example

```bash
python -m agenticdatingapp.engine.example
```

To run with OpenAI, set `OPENAI_API_KEY` in your environment.

### Run tests

```bash
pytest
```

