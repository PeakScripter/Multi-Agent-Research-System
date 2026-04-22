<p align="center">
  <img src="https://img.shields.io/badge/LangGraph-Powered-blue?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Google%20Gemini-AI-orange?style=for-the-badge&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
</p>

<h1 align="center">🤖 Multi-Agent Research System (MARS)</h1>

<p align="center">
  <b>A LangGraph-powered multi-agent pipeline that orchestrates 5 specialized AI agents to produce polished research reports — automatically.</b>
</p>

<p align="center">
  <a href="#-architecture">Architecture</a> •
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-api-reference">API</a> •
  <a href="#-usage">Usage</a>
</p>

---

## 🏗 Architecture

```
                        ┌─────────────────────────────────────────┐
                        │         MARS — Agent Orchestration       │
                        └─────────────────────────────────────────┘

  User Topic
      │
      ▼
 ┌──────────┐     ┌────────────┐     ┌──────────┐     ┌──────────┐
 │  Planner │────▶│ Researcher │────▶│  Writer  │────▶│  Critic  │
 │  Agent   │     │   Agent    │     │  Agent   │     │  Agent   │
 └──────────┘     └────────────┘     └──────────┘     └─────┬────┘
                        ▲                  ▲                 │
                        │  Needs Research  │  Needs Revision │ Approved
                        └──────────────────┘                 │
                                                             ▼
                                                       ┌──────────┐
                                                       │   Word   │
                                                       │  Agent   │
                                                       └─────┬────┘
                                                             │
                                                             ▼
                                               📄 Final Report (.docx + .json)
```

| Agent | Role |
|-------|------|
| 🗂 **Planner** | Breaks topic into a structured research plan |
| 🔍 **Researcher** | Gathers and synthesizes information |
| ✍️ **Writer** | Drafts the full research report |
| 🧐 **Critic** | Reviews quality — sends back for revision if needed |
| 📝 **Word** | Formats final output into a polished .docx |

---

## ✨ Features

- **Multi-Agent Collaboration** — 5 specialized agents with iterative refinement loops
- **Automatic Model Fallback** — switches between Gemini models on rate limits
- **Dual Output Formats** — JSON structured data + formatted Word (.docx) documents
- **FastAPI Interface** — REST API with streaming and chat endpoints
- **Quality Control** — built-in Critic→Writer revision cycles (configurable max iterations)
- **Rate Limit Resilience** — exponential backoff + model rotation on 429 errors

---

## ⚡ Quick Start

```bash
# 1. Clone
git clone https://github.com/PeakScripter/Multi-Agent-Research-System.git
cd Multi-Agent-Research-System

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp env_example.txt .env
# Add your GOOGLE_API_KEY to .env

# 4. Run
python main.py "Future of AI in Healthcare" --docx
```

---

## 🚀 Usage

### CLI

```bash
# Generate report + Word doc
python main.py "Quantum Computing Trends 2024" --docx

# With verbose agent logs
python main.py "Climate Change Solutions" --verbose --docx

# Check model availability
python main.py --status
```

### FastAPI Server

```bash
python -m uvicorn api:app --host 0.0.0.0 --port 8000
```

**Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/research` | Trigger full agent workflow |
| GET | `/download_report/{filename}` | Download generated .docx |
| POST | `/chat` | Conversational research interface |
| GET | `/status` | Model health and rate limit status |

### Programmatic

```python
from workflow import MultiAgentResearchWorkflow

workflow = MultiAgentResearchWorkflow()
result = workflow.run("Your research topic")
print(result['final_report'])
```

---

## Configuration

Create a `.env` file:

```env
GOOGLE_API_KEY=your_google_api_key_here
GEMINI_MODEL=gemini-1.5-pro
MAX_MODEL_RETRIES=3
RATE_LIMIT_RETRY_DELAY=60
```

---

## 📁 Output Structure

```
outputs/
├── reports/
│   └── report_Topic_Name_YYYYMMDD.json
├── Topic_Name_report.docx
└── logs/
    └── research_system.log
```

---

## Tech Stack

- **Orchestration:** LangGraph, Agent Swarm
- **LLM:** Google Gemini (1.5 Pro / Flash) via LiteLLM
- **API:** FastAPI + Uvicorn
- **Output:** python-docx
- **Language:** Python 3.10+

---

## Contributing

1. Fork the repo
2. Create a feature branch
3. Commit changes
4. Open a Pull Request

---

## 📄 License

MIT License — see LICENSE for details.
