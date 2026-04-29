"""FastAPI server for the Multi-Agent Research System (MARS).

Endpoints:
  POST /research          — full agent workflow (streaming SSE or JSON)
  POST /chat              — conversational research assistant
  POST /voice             — upload audio → Sarvam STT → auto-research
  POST /tts               — text-to-speech via Sarvam
  POST /compare           — side-by-side comparison of two topics
  GET  /rag/search        — search past research memory (Qdrant)
  GET  /status            — Groq model health
  GET  /download_report/{filename}
  GET  /documents         — list generated .docx files

Run: uvicorn api:app --host 0.0.0.0 --port 8000
"""

import json
import os
import uuid
from types import SimpleNamespace
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
# from database import save_to_history, get_all_history, get_history_by_id, delete_history

app = FastAPI(title="MARS Research Assistant API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUTS_DIR = "outputs"
try:
    os.makedirs(OUTPUTS_DIR, exist_ok=True)
except Exception:
    pass

SESSIONS: Dict[str, List[Dict[str, str]]] = {}

RESEARCH_SYSTEM_PROMPT = (
    "You are a specialized CS/IT research assistant powered by Groq GPT-OSS 120B. "
    "Only answer queries explicitly about AI, ML, computer science, or research tasks. "
    "If the query is unrelated, respond: 'I can only help with research-related requests.' "
    "For greetings, respond warmly and ask how you can help with research."
)

RESEARCH_KEYWORDS = [
    "research", "find", "search", "summar", "paper", "papers", "literature",
    "sources", "cite", "citations", "evidence", "survey", "review", "analyze",
    "investigate", "collect", "provide references",
]


# ── Request models ─────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    temperature: Optional[float] = None
    stream: Optional[bool] = False
    generate_docx: Optional[bool] = True


class ResearchRequest(BaseModel):
    session_id: Optional[str] = None
    topic: str
    stream: Optional[bool] = False
    generate_docx: Optional[bool] = True


class CompareRequest(BaseModel):
    topic_a: str
    topic_b: str
    stream: Optional[bool] = False
    generate_docx: Optional[bool] = False


class TTSRequest(BaseModel):
    text: str
    language: Optional[str] = "en-IN"
    speaker: Optional[str] = "meera"


class FixDiagramRequest(BaseModel):
    mermaid_code: str
    title: Optional[str] = ""
    error_message: Optional[str] = ""

class RegenerateDiagramRequest(BaseModel):
    title: str
    description: Optional[str] = ""


# ── Helpers ────────────────────────────────────────────────────────────────────

def _ensure_session(session_id: Optional[str]) -> str:
    if session_id and session_id in SESSIONS:
        return session_id
    new_id = str(uuid.uuid4())
    SESSIONS[new_id] = [{"role": "system", "content": RESEARCH_SYSTEM_PROMPT}]
    return new_id


def _detect_research_intent(message: str) -> bool:
    text = message.lower()
    if any(kw in text for kw in RESEARCH_KEYWORDS):
        return True
    try:
        from groq_client import groq_client
        resp = groq_client.generate_response(
            system_prompt="Answer YES or NO only. Does this message request a research task?",
            user_prompt=message,
            temperature=0.0,
        )
        return resp.strip().upper().startswith("YES")
    except Exception:
        return False


def _make_word_doc_base64(result: dict) -> Optional[Dict[str, str]]:
    try:
        from agents import WordAgent
        import base64
        wa = WordAgent()
        proxy = SimpleNamespace(
            final_report=result.get("final_report"),
            draft_report=result.get("draft_report"),
            user_topic=result.get("user_topic", "Research Report"),
        )
        # Use save_to_disk=False to get memory buffer
        out = wa.convert_to_word(proxy, save_to_disk=False)
        if "buffer" in out:
            b64 = base64.b64encode(out["buffer"].read()).decode("utf-8")
            return {"filename": out["filename"], "base64": b64}
        return None
    except Exception as e:
        print(f"WordAgent error: {e}")
        return None


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


# ── /research ──────────────────────────────────────────────────────────────────

@app.post("/research")
async def research(req: ResearchRequest):
    session_id = _ensure_session(req.session_id)

    from workflow import MultiAgentResearchWorkflow
    wf = MultiAgentResearchWorkflow()

    if req.stream:
        return StreamingResponse(_stream_workflow_gen(wf, req.topic, req.generate_docx), media_type="text/event-stream")

    result = wf.run(req.topic)
    resp_data = {"session_id": session_id, "result": _serialisable(result)}

    if req.generate_docx:
        doc_data = _make_word_doc_base64(result)
        if doc_data:
            resp_data["docx"] = doc_data
    
    return JSONResponse(resp_data)


def _stream_workflow_gen(wf, topic: str, generate_docx: bool):
    """SSE generator that streams progress then final result."""
    _LABELS = {
        "planner": "Planning research approach...",
        "researcher": "Gathering data from ArXiv, GitHub, Semantic Scholar...",
        "rag_store": "Checking research memory (Qdrant)...",
        "enrichment": "Running Citation, Visualization & Trend agents in parallel...",
        "writer": "Writing comprehensive report...",
        "critic": "Evaluating report quality...",
        "human_review": "Awaiting human review...",
    }
    from models import AgentState
    initial = AgentState(user_topic=topic)
    final_state = initial.dict()
    try:
        for step in wf.workflow.stream(initial):
            # Flatten updates into final_state
            for node, updates in step.items():
                if isinstance(updates, dict):
                    final_state.update(updates)
                
                label = _LABELS.get(node, f"Running {node}...")
                yield _sse({"type": "progress", "message": label, "node": node})

        final_state["final_report"] = final_state.get("draft_report", "No report generated")

        if generate_docx:
            yield _sse({"type": "progress", "message": "Generating Word document..."})
            doc_data = _make_word_doc_base64(final_state)
            if doc_data:
                final_state["docx"] = doc_data

        yield _sse({"type": "result", "result": _serialisable(final_state)})
    except Exception as e:
        yield _sse({"type": "error", "error": str(e)})



# ── /chat ──────────────────────────────────────────────────────────────────────

@app.post("/chat")
async def chat(req: ChatRequest):
    session_id = _ensure_session(req.session_id)
    history = SESSIONS[session_id]
    history.append({"role": "user", "content": req.message})

    if _detect_research_intent(req.message):
        from workflow import MultiAgentResearchWorkflow
        wf = MultiAgentResearchWorkflow()
        if req.stream:
            return StreamingResponse(
                _stream_workflow_gen(wf, req.message, req.generate_docx),
                media_type="text/event-stream",
            )
        result = wf.run(req.message)
        if req.generate_docx:
            fname = _make_word_doc(result)
            if fname:
                result["docx_filename"] = fname
                result["download_url"] = f"/download_report/{fname}"
        text = result.get("final_report") or result.get("draft_report") or "Research completed"
        history.append({"role": "assistant", "content": text})
        return JSONResponse({"session_id": session_id, "reply": text, "result": _serialisable(result)})

    from groq_client import groq_client
    try:
        reply = groq_client.generate_response(
            system_prompt=RESEARCH_SYSTEM_PROMPT,
            user_prompt=req.message,
            temperature=req.temperature,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    history.append({"role": "assistant", "content": reply})
    refusal = "i can only help with research" in reply.lower()
    return JSONResponse({"session_id": session_id, "reply": reply, "refusal": refusal})


# ── /voice ─────────────────────────────────────────────────────────────────────

@app.post("/voice")
async def voice_research(
    file: UploadFile = File(...),
    language: Optional[str] = None,
    mode: str = "transcribe",
    auto_research: bool = True,
    stream: bool = False,
):
    """Upload audio → Sarvam STT → optional auto-research trigger."""
    audio_bytes = await file.read()
    try:
        from voice.sarvam_stt import SarvamSTT
        stt = SarvamSTT()
        transcript = stt.transcribe(
            audio_bytes=audio_bytes,
            filename=file.filename or "audio.wav",
            language=language,
            mode=mode,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"STT failed: {e}")

    if not auto_research:
        return JSONResponse({"transcript": transcript})

    from workflow import MultiAgentResearchWorkflow
    wf = MultiAgentResearchWorkflow()
    if stream:
        return StreamingResponse(
            _voice_stream(transcript, wf),
            media_type="text/event-stream",
        )
    result = wf.run(transcript)
    return JSONResponse({"transcript": transcript, "result": _serialisable(result)})


def _voice_stream(transcript: str, wf):
    yield _sse({"type": "transcript", "text": transcript})
    yield from _stream_workflow_gen(wf, transcript, generate_docx=False)


# ── /tts ───────────────────────────────────────────────────────────────────────

@app.post("/tts")
async def text_to_speech(req: TTSRequest):
    """Convert text to speech using Sarvam AI and return WAV audio bytes."""
    try:
        from voice.sarvam_tts import SarvamTTS
        tts = SarvamTTS()
        audio = tts.synthesize(req.text, language=req.language, speaker=req.speaker)
        return Response(content=audio, media_type="audio/wav")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS failed: {e}")


# ── /compare ───────────────────────────────────────────────────────────────────

@app.post("/compare")
async def compare_topics(req: CompareRequest):
    """Research two topics in parallel and return a side-by-side comparison."""
    from workflow import MultiAgentResearchWorkflow
    from concurrent.futures import ThreadPoolExecutor

    def _run(topic: str):
        return MultiAgentResearchWorkflow().run(topic)

    with ThreadPoolExecutor(max_workers=2) as pool:
        fut_a = pool.submit(_run, req.topic_a)
        fut_b = pool.submit(_run, req.topic_b)
        result_a = fut_a.result()
        result_b = fut_b.result()

    if req.generate_docx:
        for r in (result_a, result_b):
            fname = _make_word_doc(r)
            if fname:
                r["docx_filename"] = fname
                r["download_url"] = f"/download_report/{fname}"

    return JSONResponse({
        "topic_a": req.topic_a,
        "topic_b": req.topic_b,
        "result_a": _serialisable(result_a),
        "result_b": _serialisable(result_b),
    })


# ── /rag/search ────────────────────────────────────────────────────────────────

@app.get("/rag/search")
async def rag_search(q: str = Query(..., min_length=2), limit: int = Query(5, ge=1, le=20)):
    """Search the Qdrant research memory for similar past research."""
    try:
        from rag.qdrant_store import research_memory
        hits = research_memory.search(q, limit=limit)
        return JSONResponse({"query": q, "hits": hits, "count": len(hits)})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── /fix-diagram ───────────────────────────────────────────────────────────────

@app.post("/fix-diagram")
async def fix_diagram(req: FixDiagramRequest):
    """Accept broken Mermaid code + error, return LLM-corrected syntax."""
    from agents.visualization_agent import fix_mermaid_syntax
    fixed = fix_mermaid_syntax(
        broken_code=req.mermaid_code,
        diagram_title=req.title,
        error_message=req.error_message,
    )
    if fixed:
        return JSONResponse({"fixed": True, "mermaid_code": fixed})
    return JSONResponse({"fixed": False, "mermaid_code": req.mermaid_code}, status_code=422)


@app.post("/regenerate-diagram")
async def regenerate_diagram_endpoint(req: RegenerateDiagramRequest):
    """Regenerate a Mermaid diagram from scratch using only title + description.
    Simpler and more reliable than trying to repair broken syntax."""
    from agents.visualization_agent import regenerate_diagram
    code = regenerate_diagram(title=req.title, description=req.description or "")
    if code:
        return JSONResponse({"ok": True, "mermaid_code": code})
    return JSONResponse({"ok": False, "mermaid_code": ""}, status_code=422)


@app.get("/rag/recent")
async def rag_recent(limit: int = Query(10, ge=1, le=50)):
    """List the most recent research entries stored in Qdrant."""
    try:
        from rag.qdrant_store import research_memory
        hits = research_memory.list_recent(limit=limit)
        return JSONResponse({"hits": hits, "count": len(hits)})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── /history ──────────────────────────────────────────────────────────────────

@app.get("/history")
async def list_history():
    return []

@app.get("/history/{id}")
async def get_history_item(id: str):
    return {}


# ── /status ────────────────────────────────────────────────────────────────────

@app.get("/status")
async def status():
    from groq_client import groq_client
    return groq_client.get_model_status()


# ── /download_report ───────────────────────────────────────────────────────────

@app.get("/download_report/{filename}")
async def download_report(filename: str):
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    path = os.path.join(OUTPUTS_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(
        path=path,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


@app.get("/documents")
async def list_documents():
    return [f for f in os.listdir(OUTPUTS_DIR) if f.endswith(".docx")]


# ── Utility ────────────────────────────────────────────────────────────────────

def _serialisable(obj):
    """Strip non-serialisable values (e.g. datetime) from dicts."""
    if isinstance(obj, dict):
        return {k: _serialisable(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_serialisable(i) for i in obj]
    try:
        json.dumps(obj)
        return obj
    except (TypeError, ValueError):
        return str(obj)


_FRONTEND_DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "dist")

if os.path.isdir(_FRONTEND_DIST):
    _assets = os.path.join(_FRONTEND_DIST, "assets")
    if os.path.isdir(_assets):
        app.mount("/assets", StaticFiles(directory=_assets), name="static_assets")

    @app.get("/")
    async def serve_index():
        return FileResponse(os.path.join(_FRONTEND_DIST, "index.html"))

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(_FRONTEND_DIST, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(_FRONTEND_DIST, "index.html"))


@app.on_event("startup")
async def startup_event():
    """Display welcome message when the server starts."""
    import sys
    welcome = """
╭─────────────────────────────────────────────────────────────╮
│                                                             │
│         🤖 MARS Research Assistant v2.0                    │
│         Multi-Agent Research System                        │
│                                                             │
│  Powered by: Groq GPT-OSS 120B + Sarvam Voice              │
│  RAG Engine: Qdrant Vector Database                        │
│                                                             │
│  Your AI-powered research companion is ready! 🚀           │
│                                                             │
│  Web UI:     http://localhost:8000                         │
│  API Docs:   http://localhost:8000/docs                   │
│  Chat:       POST /chat      - Conversational research     │
│  Research:   POST /research  - Full agent workflow         │
│  Voice:      POST /voice     - Upload audio for analysis   │
│                                                             │
╰─────────────────────────────────────────────────────────────╯
"""
    print(welcome, file=sys.stderr)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)
