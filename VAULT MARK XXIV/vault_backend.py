from __future__ import annotations

import asyncio
import atexit
import base64
import json
import os
import re
import shutil
import signal
import subprocess
import time
import webbrowser
from pathlib import Path
from typing import Optional

import httpx
import psutil
import uvicorn
from bs4 import BeautifulSoup
from fastapi import FastAPI, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from winpty import PtyProcess

MARK_DIR       = Path(__file__).parent
UPLOADS_DIR    = MARK_DIR / "uploads"
MEMORY_PATH    = Path(r"F:\Obsidian_Vault\Claude_Vault\Memory\MEMORY.md")
SECOND_BRAIN   = Path(r"C:\Users\Kutay\second-brain")
INDEX_HTML     = MARK_DIR / "index.html"
HOST = "0.0.0.0"
PORT = 8765

# ── Limits ───────────────────────────────────────────────────────────────────
CLAUDE_SESSION_LIMIT = 45
CLAUDE_WEEKLY_LIMIT  = 250
GEMINI_DAILY_LIMIT   = 1000
GEMINI_WEEKLY_LIMIT  = 5000

# ── ANSI regex ────────────────────────────────────────────────────────────────
_ANSI_RE = re.compile(r'\x1B\[[0-9;]*[a-zA-Z]|\x1B\][^\x07]*\x07|\x1B[@-Z\\-_]')

# ── AI launch config ──────────────────────────────────────────────────────────
KIMI_BIN = Path(r"C:\Users\Kutay\.local\bin\kimi.exe")

SPAWN_CMD = {
    "claude": "powershell.exe -NoProfile -NoLogo",
    "kimi":   "powershell.exe -NoProfile -NoLogo",
    "gemini": "powershell.exe -NoProfile -NoLogo",
}

TOOL_LAUNCH = {
    "claude": "claude --dangerously-skip-permissions\r\n",
    "kimi":   f"& '{KIMI_BIN}' --yolo\r\n" if KIMI_BIN.exists() else "kimi --yolo\r\n",
    "gemini": "gemini --yolo\r\n",
}

BANNER = r"""
 __   ___   _   _   _  _____
 \ \ / / | | | | | | ||_   _|
  \ V /| |_| | | | | |  | |
   \_/ |  _  | | |_| |  | |
        | | | |  _  |  | |
        |_| |_|_| |_|  |_|

  V.A.U.L.T. MARK XXV
  Virtual Assistant for Universal & Local Tasks
  Gemini Float · Paste Fix · Pro Account
  http://localhost:8765
"""

app = FastAPI(title="V.A.U.L.T. MARK XXV")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Shared state ──────────────────────────────────────────────────────────────
_shared_ctx: dict = {"content": "", "updated": 0.0}
_SHARED_CTX_FILE = MARK_DIR / "shared_context.txt"

def _load_shared_ctx() -> None:
    if _SHARED_CTX_FILE.exists():
        try:
            _shared_ctx["content"] = _SHARED_CTX_FILE.read_text(encoding="utf-8")
            _shared_ctx["updated"] = _SHARED_CTX_FILE.stat().st_mtime
        except Exception:
            pass

# ── Claude usage tracking ─────────────────────────────────────────────────────
_claude_usage: dict = {
    "session_messages": 0,
    "session_start":    0.0,
    "weekly_messages":  0,
    "week_start":       0.0,
}
_USAGE_FILE = MARK_DIR / "claude_usage.json"

def _load_usage() -> None:
    _claude_usage["session_start"]    = time.time()
    _claude_usage["session_messages"] = 0
    if _USAGE_FILE.exists():
        try:
            data       = json.loads(_USAGE_FILE.read_text())
            week_start = data.get("week_start", time.time())
            if time.time() - week_start > 7 * 86400:
                data["weekly_messages"] = 0
                data["week_start"]      = time.time()
            _claude_usage["weekly_messages"] = data.get("weekly_messages", 0)
            _claude_usage["week_start"]      = data.get("week_start", time.time())
        except Exception:
            _claude_usage["weekly_messages"] = 0
            _claude_usage["week_start"]      = time.time()
    else:
        _claude_usage["weekly_messages"] = 0
        _claude_usage["week_start"]      = time.time()

def _save_usage() -> None:
    try:
        _USAGE_FILE.write_text(json.dumps({
            "weekly_messages": _claude_usage["weekly_messages"],
            "week_start":      _claude_usage["week_start"],
        }))
    except Exception:
        pass

# ── Gemini usage tracking ─────────────────────────────────────────────────────
_gemini_usage: dict = {
    "daily_calls":  0,
    "day_start":    0.0,
    "weekly_calls": 0,
    "week_start":   0.0,
}
_GEMINI_USAGE_FILE = MARK_DIR / "gemini_usage.json"

def _load_gemini_usage() -> None:
    now = time.time()
    if _GEMINI_USAGE_FILE.exists():
        try:
            data       = json.loads(_GEMINI_USAGE_FILE.read_text())
            day_start  = data.get("day_start", now)
            week_start = data.get("week_start", now)
            if now - day_start > 86400:
                data["daily_calls"] = 0
                data["day_start"]   = now
            if now - week_start > 7 * 86400:
                data["weekly_calls"] = 0
                data["week_start"]   = now
            _gemini_usage.update(data)
            return
        except Exception:
            pass
    _gemini_usage["day_start"]  = now
    _gemini_usage["week_start"] = now

def _save_gemini_usage() -> None:
    try:
        _GEMINI_USAGE_FILE.write_text(json.dumps(_gemini_usage))
    except Exception:
        pass

# ── Sys metrics ───────────────────────────────────────────────────────────────
_net_prev_bytes: int   = 0
_net_prev_time:  float = 0.0

def _gpu() -> float:
    try:
        r = subprocess.run(
            ["nvidia-smi", "--query-gpu=utilization.gpu", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=2,
        )
        if r.returncode == 0:
            return float(r.stdout.strip().split("\n")[0])
    except Exception:
        pass
    return 0.0

def _temp() -> Optional[float]:
    try:
        temps = psutil.sensors_temperatures()
        if temps:
            for k in ("coretemp", "k10temp", "cpu_thermal"):
                if k in temps and temps[k]:
                    return float(temps[k][0].current)
    except Exception:
        pass
    return None

def _net_kb() -> float:
    global _net_prev_bytes, _net_prev_time
    now   = time.monotonic()
    c     = psutil.net_io_counters()
    total = c.bytes_sent + c.bytes_recv
    elapsed = now - _net_prev_time if _net_prev_time else 1.5
    delta   = (total - _net_prev_bytes) / 1024 / max(elapsed, 0.1) if _net_prev_bytes else 0.0
    _net_prev_bytes = total
    _net_prev_time  = now
    return round(max(delta, 0.0), 1)

def _uptime() -> str:
    s = int(time.time() - psutil.boot_time())
    h, rem = divmod(s, 3600)
    m, _   = divmod(rem, 60)
    return f"{h:02d}:{m:02d}"


# ── PTY session manager ───────────────────────────────────────────────────────
class PtySession:
    def __init__(self, model: str, cols: int = 220, rows: int = 50):
        self.model = model
        self.proc: PtyProcess = PtyProcess.spawn(
            SPAWN_CMD[model],
            dimensions=(rows, cols),
            env=os.environ.copy(),
        )
        self._launched = False

    def is_alive(self) -> bool:
        try:
            return bool(self.proc.isalive())
        except Exception:
            return False

    def write(self, data: str) -> None:
        self.proc.write(data)

    def read(self, timeout_ms: int = 50) -> str:
        try:
            return self.proc.read(timeout_ms) or ""
        except Exception:
            return ""

    def resize(self, cols: int, rows: int) -> None:
        try:
            self.proc.setwinsize(rows, cols)
        except Exception:
            pass

    def close(self) -> None:
        try:
            self.proc.terminate()
        except Exception:
            pass


_sessions:      dict[str, PtySession] = {}
_session_lock = asyncio.Lock()


async def _get_session(model: str) -> PtySession:
    async with _session_lock:
        existing = _sessions.get(model)
        if existing and existing.is_alive():
            return existing
        if existing:
            existing.close()
        session = PtySession(model)
        _sessions[model] = session
        asyncio.create_task(_launch_tool(session, model))
        return session


async def _launch_tool(session: PtySession, model: str) -> None:
    # Wait for PowerShell to initialize
    await asyncio.sleep(1.2)
    if not session.is_alive():
        return
    # Set UTF-8 encoding
    session.write("chcp 65001 | Out-Null\r\n")
    await asyncio.sleep(0.4)
    # Clear screen so PowerShell prompt isn't visible before tool starts
    session.write("cls\r\n")
    await asyncio.sleep(0.2)
    if model in TOOL_LAUNCH:
        session.write(TOOL_LAUNCH[model])
    session._launched = True


# ── API key loading ───────────────────────────────────────────────────────────

_OR_KEY_FILE = MARK_DIR / "openrouter_key.txt"
OPENROUTER_KEY = os.environ.get("OPENROUTER_KEY", "")
if not OPENROUTER_KEY and _OR_KEY_FILE.exists():
    try:
        OPENROUTER_KEY = _OR_KEY_FILE.read_text(encoding="utf-8").strip()
    except Exception:
        pass

_GEMINI_KEY_FILE = MARK_DIR / "gemini_key.txt"
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
if not GEMINI_API_KEY and _GEMINI_KEY_FILE.exists():
    try:
        GEMINI_API_KEY = _GEMINI_KEY_FILE.read_text(encoding="utf-8").strip()
    except Exception:
        pass

COUNCIL_MODELS = {
    "claude": "anthropic/claude-3.5-haiku",
    "gemini": "google/gemini-2.0-flash-001",
    "kimi":   "qwen/qwen3-8b",
}


# ── Gemini Direct API ─────────────────────────────────────────────────────────

async def _call_gemini_direct(
    messages: list,
    system: str = "",
    max_tokens: int = 1500,
) -> tuple[str, int]:
    if not GEMINI_API_KEY:
        raise ValueError("No Gemini API key configured")

    contents = []
    for msg in messages:
        role = "user" if msg["role"] == "user" else "model"
        contents.append({"role": role, "parts": [{"text": msg["content"]}]})

    req_body: dict = {
        "contents": contents,
        "generationConfig": {"maxOutputTokens": max_tokens},
    }
    if system:
        req_body["systemInstruction"] = {"parts": [{"text": system}]}

    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}",
            json=req_body,
        )
    data = r.json()
    if r.status_code != 200:
        err = data.get("error", {})
        raise ValueError(err.get("message", str(data)))

    candidates = data.get("candidates", [])
    if not candidates:
        raise ValueError(f"No candidates in response: {data}")

    text = candidates[0]["content"]["parts"][0]["text"]
    usage = data.get("usageMetadata", {})
    tokens = usage.get("totalTokenCount", usage.get("candidatesTokenCount", 0))
    return text, tokens


async def _query_model_smart(
    name: str,
    model_id: str,
    prompt: str,
    system: str = "",
    max_tokens: int = 1200,
) -> dict:
    # Use Gemini API directly when key is available
    if name == "gemini" and GEMINI_API_KEY:
        try:
            messages = [{"role": "user", "content": prompt}]
            text, tokens = await _call_gemini_direct(messages, system, max_tokens)
            _gemini_usage["daily_calls"]  += 1
            _gemini_usage["weekly_calls"] += 1
            _save_gemini_usage()
            return {"model": name, "slot": name, "response": text, "tokens": tokens}
        except Exception as e:
            return {"model": name, "slot": name, "error": str(e)[:300]}

    if not OPENROUTER_KEY:
        return {"model": name, "slot": name, "error": "No API key (OpenRouter or Gemini)"}

    try:
        messages_list = []
        if system:
            messages_list.append({"role": "system", "content": system})
        messages_list.append({"role": "user", "content": prompt})

        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_KEY}",
                    "HTTP-Referer": "http://localhost:8765",
                    "X-Title": "V.A.U.L.T.",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model_id,
                    "messages": messages_list,
                    "max_tokens": max_tokens,
                },
            )
        data = r.json()
        if r.status_code != 200:
            err = data.get("error", {})
            err_msg = err.get("message", str(err)) if isinstance(err, dict) else str(err)
            return {"model": name, "slot": name, "error": err_msg}

        choices = data.get("choices")
        if not choices:
            err = data.get("error", {})
            err_msg = err.get("message", str(data)) if isinstance(err, dict) else str(data)
            return {"model": name, "slot": name, "error": err_msg}

        choice = choices[0]["message"]["content"]
        usage  = data.get("usage", {})
        tokens = usage.get("total_tokens", usage.get("completion_tokens", 0))
        return {"model": name, "slot": name, "response": choice, "tokens": tokens}
    except Exception as e:
        return {"model": name, "slot": name, "error": str(e)[:300]}


# ── HTTP routes ───────────────────────────────────────────────────────────────

@app.get("/")
async def serve_index() -> FileResponse:
    return FileResponse(str(INDEX_HTML), media_type="text/html")


@app.get("/api/memory")
async def get_memory() -> JSONResponse:
    content = (
        MEMORY_PATH.read_text(encoding="utf-8", errors="replace")
        if MEMORY_PATH.exists()
        else "Memory vault offline."
    )
    return JSONResponse({"content": content})


@app.get("/api/shared-context")
async def get_shared_context() -> JSONResponse:
    return JSONResponse({"content": _shared_ctx["content"], "updated": _shared_ctx["updated"]})


@app.post("/api/shared-context")
async def set_shared_context(req: Request) -> JSONResponse:
    body = await req.json()
    _shared_ctx["content"] = body.get("content", "")
    _shared_ctx["updated"] = time.time()
    try:
        _SHARED_CTX_FILE.write_text(_shared_ctx["content"], encoding="utf-8")
    except Exception:
        pass
    return JSONResponse({"ok": True})


# ── Claude usage ──────────────────────────────────────────────────────────────

@app.get("/api/claude-usage")
async def get_claude_usage() -> JSONResponse:
    now              = time.time()
    session_duration = 5 * 3600

    if now - _claude_usage["session_start"] > session_duration:
        _claude_usage["session_messages"] = 0
        _claude_usage["session_start"]    = now

    week_elapsed = now - _claude_usage["week_start"]
    if week_elapsed > 7 * 86400:
        _claude_usage["weekly_messages"] = 0
        _claude_usage["week_start"]      = now
        _save_usage()
        week_elapsed = 0.0

    session_elapsed  = now - _claude_usage["session_start"]
    session_reset_in = max(0, session_duration - session_elapsed)
    weekly_reset_in  = max(0, 7 * 86400 - week_elapsed)

    return JSONResponse({
        "session_messages":   _claude_usage["session_messages"],
        "session_limit":      CLAUDE_SESSION_LIMIT,
        "session_percentage": min(100.0, round(_claude_usage["session_messages"] / CLAUDE_SESSION_LIMIT * 100, 1)),
        "session_start":      _claude_usage["session_start"],
        "session_elapsed":    session_elapsed,
        "session_reset_in":   session_reset_in,
        "weekly_messages":    _claude_usage["weekly_messages"],
        "weekly_limit":       CLAUDE_WEEKLY_LIMIT,
        "weekly_percentage":  min(100.0, round(_claude_usage["weekly_messages"] / CLAUDE_WEEKLY_LIMIT * 100, 1)),
        "week_start":         _claude_usage["week_start"],
        "weekly_reset_in":    weekly_reset_in,
    })


@app.post("/api/claude-usage/increment")
async def increment_claude_usage() -> JSONResponse:
    _claude_usage["session_messages"] = min(
        _claude_usage["session_messages"] + 1, CLAUDE_SESSION_LIMIT
    )
    _claude_usage["weekly_messages"] += 1
    _save_usage()
    return JSONResponse({"ok": True})


# ── Kimi balance ──────────────────────────────────────────────────────────────

@app.get("/api/kimi-balance")
async def kimi_balance() -> JSONResponse:
    api_key = os.environ.get("MOONSHOT_API_KEY", "")
    if not api_key:
        cfg = MARK_DIR / "kimi_key.txt"
        if cfg.exists():
            try:
                api_key = cfg.read_text(encoding="utf-8").strip()
            except Exception:
                pass
    if not api_key:
        return JSONResponse({"error": "no_key", "available_balance": None})
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                "https://api.moonshot.ai/v1/users/me/balance",
                headers={"Authorization": f"Bearer {api_key}"},
            )
        try:
            data = r.json()
        except Exception:
            return JSONResponse({"error": f"HTTP {r.status_code}: invalid response", "available_balance": None})

        if isinstance(data.get("data"), dict):
            inner = data["data"]
            bal = inner.get("available_balance", inner.get("cash_balance", inner.get("balance")))
            return JSONResponse({
                "available_balance": bal,
                "cash_balance":      inner.get("cash_balance", bal),
                "voucher_balance":   inner.get("voucher_balance", 0),
            })

        if "available_balance" in data:
            return JSONResponse(data)

        err_raw = data.get("error", f"HTTP {r.status_code}")
        err_str = err_raw.get("message", str(err_raw)) if isinstance(err_raw, dict) else str(err_raw)
        return JSONResponse({"error": err_str, "available_balance": None})

    except Exception as e:
        return JSONResponse({"error": str(e)[:200], "available_balance": None})


@app.post("/api/kimi-key")
async def save_kimi_key(req: Request) -> JSONResponse:
    body = await req.json()
    key  = body.get("key", "").strip()
    if not key:
        return JSONResponse({"error": "empty"}, status_code=400)
    try:
        (MARK_DIR / "kimi_key.txt").write_text(key, encoding="utf-8")
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
    return JSONResponse({"ok": True})


# ── Gemini Pro API key management ─────────────────────────────────────────────

@app.get("/api/gemini-key-status")
async def gemini_key_status() -> JSONResponse:
    return JSONResponse({"has_key": bool(GEMINI_API_KEY)})


@app.post("/api/gemini-key")
async def save_gemini_key(req: Request) -> JSONResponse:
    global GEMINI_API_KEY
    body = await req.json()
    key  = body.get("key", "").strip()
    if not key:
        return JSONResponse({"error": "empty"}, status_code=400)
    try:
        _GEMINI_KEY_FILE.write_text(key, encoding="utf-8")
        GEMINI_API_KEY = key
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
    return JSONResponse({"ok": True})


# ── Gemini usage ──────────────────────────────────────────────────────────────

@app.get("/api/gemini-usage")
async def get_gemini_usage() -> JSONResponse:
    now          = time.time()
    day_elapsed  = now - _gemini_usage["day_start"]
    week_elapsed = now - _gemini_usage["week_start"]

    if day_elapsed > 86400:
        _gemini_usage["daily_calls"] = 0
        _gemini_usage["day_start"]   = now
        day_elapsed = 0.0
        _save_gemini_usage()

    if week_elapsed > 7 * 86400:
        _gemini_usage["weekly_calls"] = 0
        _gemini_usage["week_start"]   = now
        week_elapsed = 0.0
        _save_gemini_usage()

    return JSONResponse({
        "daily_calls":      _gemini_usage["daily_calls"],
        "daily_limit":      GEMINI_DAILY_LIMIT,
        "daily_percentage": min(100.0, round(_gemini_usage["daily_calls"] / GEMINI_DAILY_LIMIT * 100, 1)),
        "daily_reset_in":   max(0, 86400 - day_elapsed),
        "weekly_calls":     _gemini_usage["weekly_calls"],
        "weekly_limit":     GEMINI_WEEKLY_LIMIT,
        "weekly_percentage": min(100.0, round(_gemini_usage["weekly_calls"] / GEMINI_WEEKLY_LIMIT * 100, 1)),
        "weekly_reset_in":  max(0, 7 * 86400 - week_elapsed),
        "has_pro_key":      bool(GEMINI_API_KEY),
    })


# ── Prompt optimizer ──────────────────────────────────────────────────────────

@app.post("/api/optimize-prompt")
async def optimize_prompt(req: Request) -> JSONResponse:
    body   = await req.json()
    prompt = body.get("prompt", "").strip()
    if not prompt:
        return JSONResponse({"error": "empty_prompt"}, status_code=400)

    full = (
        "You are an expert prompt engineer. Rewrite the following prompt to be "
        "more specific, better structured, and optimized for large language models. "
        "Return ONLY the rewritten prompt — no explanation, no preamble.\n\n"
        f"Original prompt:\n{prompt}"
    )

    result = await _query_model_smart("gemini", COUNCIL_MODELS["gemini"], full, "", 800)
    if "error" in result:
        return JSONResponse({"error": result["error"]}, status_code=500)
    return JSONResponse({"optimized": result["response"]})


# ── Context Bridge ────────────────────────────────────────────────────────────

@app.post("/api/optimize-context")
async def optimize_context(req: Request) -> JSONResponse:
    body    = await req.json()
    history = body.get("history", "").strip()
    note    = body.get("note", "").strip()

    if not history:
        return JSONResponse({"optimized": None, "error": "no history"})

    system_prompt = (
        "You are an AI context bridge. Analyze the following terminal session and create "
        "a concise, actionable context brief that another AI assistant can use to continue "
        "the work seamlessly.\n\n"
        "Include:\n"
        "1. Current goal/task\n2. What has been done\n3. Current state\n4. Next steps\n\n"
        f"{'User note: ' + note + chr(10) if note else ''}"
        f"Terminal session:\n{history[:4000]}"
    )

    result = await _query_model_smart("gemini", COUNCIL_MODELS["gemini"], system_prompt, "", 1000)
    if "error" in result:
        return JSONResponse({"optimized": None, "error": result["error"]})
    return JSONResponse({"optimized": result.get("response")})


@app.post("/api/strip-ansi")
async def strip_ansi_text(req: Request) -> JSONResponse:
    body    = await req.json()
    text    = body.get("text", "")
    cleaned = _ANSI_RE.sub("", text)
    cleaned = cleaned.replace("\r\n", "\n").replace("\r", "\n")
    return JSONResponse({"cleaned": cleaned})


# ── Second Brain ──────────────────────────────────────────────────────────────

ALLOWED_EXTS = {".md", ".txt", ".json", ".yaml", ".yml", ".py", ".js", ".ts", ".csv"}

def _sb_path(rel: str = "") -> Path:
    base = SECOND_BRAIN
    if not rel:
        return base
    p = (base / rel).resolve()
    if not str(p).startswith(str(base.resolve())):
        return base
    return p


@app.get("/api/second-brain/list")
async def sb_list(path: str = "") -> JSONResponse:
    p = _sb_path(path)
    if not p.exists():
        return JSONResponse({"error": "not_found", "items": [], "path": str(p), "base": str(SECOND_BRAIN)})
    if not p.is_dir():
        return JSONResponse({"error": "not_dir", "items": [], "path": str(p)})
    try:
        items = []
        for item in sorted(p.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
            try:
                rel = str(item.relative_to(SECOND_BRAIN))
                items.append({
                    "name":    item.name,
                    "rel":     rel,
                    "is_dir":  item.is_dir(),
                    "size":    item.stat().st_size if item.is_file() else 0,
                    "ext":     item.suffix.lower() if item.is_file() else "",
                    "readable": item.suffix.lower() in ALLOWED_EXTS if item.is_file() else False,
                })
            except (PermissionError, OSError):
                pass
        parent_rel = str(p.parent.relative_to(SECOND_BRAIN)) if p != SECOND_BRAIN else ""
        return JSONResponse({
            "path":   str(p),
            "rel":    path,
            "parent": parent_rel,
            "items":  items,
        })
    except Exception as e:
        return JSONResponse({"error": str(e), "items": []})


@app.get("/api/second-brain/read")
async def sb_read(path: str) -> JSONResponse:
    p = _sb_path(path)
    if not p.exists() or not p.is_file():
        return JSONResponse({"error": "not_found"})
    if p.suffix.lower() not in ALLOWED_EXTS:
        return JSONResponse({"error": "unsupported_type"})
    try:
        content = p.read_text(encoding="utf-8", errors="replace")
        return JSONResponse({"content": content[:50000], "name": p.name, "ext": p.suffix.lower()})
    except Exception as e:
        return JSONResponse({"error": str(e)})


# ── Folder browser ────────────────────────────────────────────────────────────

@app.get("/api/browse")
async def browse_folder(path: str = "") -> JSONResponse:
    p = Path(path) if path else Path.home()
    try:
        if not p.exists() or not p.is_dir():
            return JSONResponse({"error": "Invalid path", "items": [], "path": str(p)})
        items = []
        for item in sorted(p.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
            try:
                items.append({
                    "name":   item.name,
                    "path":   str(item),
                    "is_dir": item.is_dir(),
                    "size":   item.stat().st_size if item.is_file() else 0,
                })
            except (PermissionError, OSError):
                pass
        return JSONResponse({"path": str(p), "parent": str(p.parent) if p.parent != p else "", "items": items})
    except Exception as e:
        return JSONResponse({"error": str(e), "items": [], "path": str(p)})


# ── File uploads ──────────────────────────────────────────────────────────────

@app.get("/api/uploads")
async def list_uploads() -> JSONResponse:
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    files = [
        {"filename": f.name, "size": f.stat().st_size, "path": str(f)}
        for f in sorted(UPLOADS_DIR.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True)
        if f.is_file()
    ]
    return JSONResponse({"files": files})


@app.post("/api/upload")
async def upload_file(file: UploadFile) -> JSONResponse:
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    dest = UPLOADS_DIR / (file.filename or "upload")
    with dest.open("wb") as fh:
        shutil.copyfileobj(file.file, fh)
    return JSONResponse({"filename": dest.name, "size": dest.stat().st_size, "path": str(dest)})


# ── Web fetch ─────────────────────────────────────────────────────────────────

@app.get("/api/fetch-web")
async def fetch_web(url: str) -> JSONResponse:
    try:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        async with httpx.AsyncClient(timeout=15, follow_redirects=True, headers=headers) as client:
            r = await client.get(url)
            r.raise_for_status()
        soup = BeautifulSoup(r.text, "lxml")
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()
        title = soup.title.string.strip() if soup.title else ""
        lines = [ln.strip() for ln in soup.get_text(separator="\n").split("\n") if ln.strip()]
        text  = "\n".join(lines)[:10000]
        return JSONResponse({"title": title, "text": text, "url": url})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# ── Shutdown ──────────────────────────────────────────────────────────────────

@app.post("/api/shutdown")
async def shutdown_server() -> JSONResponse:
    async def _stop():
        await asyncio.sleep(0.4)
        _cleanup_sessions()
        os.kill(os.getpid(), signal.SIGTERM)
    asyncio.create_task(_stop())
    return JSONResponse({"ok": True})


# ── Council Models ────────────────────────────────────────────────────────────

@app.get("/api/council-models")
async def get_council_models() -> JSONResponse:
    return JSONResponse({"models": COUNCIL_MODELS})


# ── Standard Council (3 parallel responses) ───────────────────────────────────

@app.post("/api/council")
async def council_query(req: Request) -> JSONResponse:
    if not OPENROUTER_KEY and not GEMINI_API_KEY:
        return JSONResponse({"error": "No API key configured (OpenRouter or Gemini Pro)"}, status_code=500)

    body   = await req.json()
    prompt = body.get("prompt", "").strip()
    system = body.get("system", "").strip()

    if not prompt:
        return JSONResponse({"error": "empty_prompt"}, status_code=400)

    tasks   = [_query_model_smart(name, model_id, prompt, system) for name, model_id in COUNCIL_MODELS.items()]
    results = await asyncio.gather(*tasks)
    return JSONResponse({"results": list(results)})


# ── Debate Council (multi-round LLM-Council style) ────────────────────────────

@app.post("/api/council-debate")
async def council_debate(req: Request) -> JSONResponse:
    if not OPENROUTER_KEY and not GEMINI_API_KEY:
        return JSONResponse({"error": "No API key configured"}, status_code=500)

    body   = await req.json()
    prompt = body.get("prompt", "").strip()
    if not prompt:
        return JSONResponse({"error": "empty_prompt"}, status_code=400)

    # ── Round 1: Initial responses ────────────────────────────────────────────
    r1_system = "You are a thoughtful AI expert. Give a clear, reasoned initial response."
    round1 = list(await asyncio.gather(*[
        _query_model_smart(name, mid, prompt, r1_system, 1200)
        for name, mid in COUNCIL_MODELS.items()
    ]))

    # ── Round 2: Critique & debate ────────────────────────────────────────────
    r1_ctx = "\n\n".join(
        f"**{r['model'].upper()}:** {r.get('response', 'Error: ' + str(r.get('error', '')))[:800]}"
        for r in round1
    )
    r2_prompt = (
        f"Original question: {prompt}\n\n"
        f"Initial responses from the 3 AIs:\n{r1_ctx}\n\n"
        "Now engage in debate: Critique what you disagree with, acknowledge what's correct, "
        "and deepen or refine your own position with specific reasoning."
    )
    r2_system = (
        "You are an AI in a structured multi-agent debate. "
        "Engage critically and substantively with the other AI perspectives. "
        "Be direct about disagreements while remaining constructive."
    )
    round2 = list(await asyncio.gather(*[
        _query_model_smart(name, mid, r2_prompt, r2_system, 1200)
        for name, mid in COUNCIL_MODELS.items()
    ]))

    # ── Synthesis: Final unified answer ───────────────────────────────────────
    r2_ctx = "\n\n".join(
        f"**{r['model'].upper()} (Round 2):** {r.get('response', 'Error')[:800]}"
        for r in round2
    )
    synth_prompt = (
        f"Research question: {prompt}\n\n"
        f"Round 1 (Initial):\n{r1_ctx}\n\n"
        f"Round 2 (Debate):\n{r2_ctx}\n\n"
        "Synthesize all perspectives into ONE definitive, comprehensive answer. "
        "Identify consensus, resolve contradictions, and provide the strongest unified response."
    )
    synth_system = (
        "You are a neutral expert synthesizer. "
        "Merge multi-AI debate insights into the single best answer possible."
    )
    # Use Gemini Pro if available, otherwise Claude for synthesis
    synth_model = "gemini" if GEMINI_API_KEY else "claude"
    synthesis = await _query_model_smart(
        synth_model, COUNCIL_MODELS[synth_model], synth_prompt, synth_system, 2000
    )

    return JSONResponse({
        "round1":    round1,
        "round2":    round2,
        "synthesis": synthesis,
    })


# ── Deep Research ─────────────────────────────────────────────────────────────

@app.post("/api/deep-research")
async def deep_research(req: Request) -> JSONResponse:
    body  = await req.json()
    query = body.get("query", "").strip()
    urls  = body.get("urls", [])

    if not query:
        return JSONResponse({"error": "empty"}, status_code=400)
    if not OPENROUTER_KEY and not GEMINI_API_KEY:
        return JSONResponse({"error": "API key required"}, status_code=500)

    # Step 1: Decompose into sub-questions
    decomp_prompt = (
        f"Break this research query into exactly 3 focused sub-questions for comprehensive coverage.\n"
        f"Return ONLY a valid JSON array of 3 strings, nothing else.\n"
        f"Query: {query}\n"
        f'Example: ["Sub-question 1?", "Sub-question 2?", "Sub-question 3?"]'
    )
    decomp = await _query_model_smart("claude", COUNCIL_MODELS["claude"], decomp_prompt, "", 400)
    sub_questions: list[str] = []
    try:
        resp_text = decomp.get("response", "")
        match = re.search(r'\[.*?\]', resp_text, re.DOTALL)
        if match:
            sub_questions = json.loads(match.group())
    except Exception:
        pass
    if not sub_questions:
        sub_questions = [query]

    # Step 2: Optional web fetch
    web_context = ""
    if urls:
        headers = {"User-Agent": "Mozilla/5.0"}
        async with httpx.AsyncClient(timeout=15, follow_redirects=True, headers=headers) as client:
            for url in urls[:3]:
                try:
                    r = await client.get(url)
                    soup = BeautifulSoup(r.text, "lxml")
                    for tag in soup(["script", "style", "nav", "footer"]):
                        tag.decompose()
                    text = soup.get_text(separator="\n")[:2500]
                    web_context += f"\n\n--- Source: {url} ---\n{text}"
                except Exception:
                    pass

    # Step 3: Multi-AI research (parallel)
    research_system = (
        "You are an expert research analyst. Produce thorough, evidence-based analysis with "
        "clear structure. Use ## headers and bullet points."
    )
    research_prompt = (
        f"Research question: {query}\n\n"
        f"Sub-questions to address:\n" +
        "\n".join(f"{i+1}. {q}" for i, q in enumerate(sub_questions)) +
        (f"\n\nWeb sources:\n{web_context[:3000]}" if web_context else "") +
        "\n\nProvide a comprehensive research report with:\n"
        "## Executive Summary\n## Key Findings\n## Detailed Analysis\n## Conclusions\n## Further Reading"
    )

    perspectives = list(await asyncio.gather(*[
        _query_model_smart(name, mid, research_prompt, research_system, 2000)
        for name, mid in COUNCIL_MODELS.items()
    ]))

    # Step 4: Final synthesis
    persp_ctx = "\n\n".join(
        f"**{r['model'].upper()} Research:**\n{r.get('response', 'Error')[:1500]}"
        for r in perspectives
    )
    synth_prompt = (
        f"Research query: {query}\n\n"
        f"Three AI research perspectives:\n{persp_ctx}\n\n"
        "Create the definitive research report by merging the best insights from all 3 perspectives. "
        "Use proper ## headers, resolve any contradictions, and provide an authoritative synthesis."
    )
    synth_name = "gemini" if GEMINI_API_KEY else "claude"
    synthesis = await _query_model_smart(
        synth_name, COUNCIL_MODELS[synth_name], synth_prompt,
        "You are a senior research synthesizer. Create the single best unified research report.",
        3000,
    )

    return JSONResponse({
        "query":         query,
        "sub_questions": sub_questions,
        "perspectives":  perspectives,
        "synthesis":     synthesis.get("response", synthesis.get("error", "Error")),
    })


# ── WebSocket: sys metrics ────────────────────────────────────────────────────

@app.websocket("/ws/metrics")
async def ws_metrics(ws: WebSocket) -> None:
    await ws.accept()
    _net_kb()
    try:
        while True:
            await ws.send_text(json.dumps({
                "cpu":    psutil.cpu_percent(interval=None),
                "mem":    psutil.virtual_memory().percent,
                "net_kb": _net_kb(),
                "gpu":    _gpu(),
                "tmp":    _temp(),
                "uptime": _uptime(),
                "procs":  len(psutil.pids()),
            }))
            await asyncio.sleep(1.5)
    except (WebSocketDisconnect, Exception):
        pass


# ── WebSocket: PTY terminal ───────────────────────────────────────────────────

@app.websocket("/ws/pty/{model}")
async def ws_pty(ws: WebSocket, model: str) -> None:
    if model not in SPAWN_CMD:
        await ws.close(code=1008)
        return

    await ws.accept()

    try:
        session = await _get_session(model)
    except Exception as e:
        await ws.send_text(f"\r\n\x1b[31m[V.A.U.L.T. ERROR] Cannot start {model}: {e}\x1b[0m\r\n")
        await ws.close()
        return

    stop = asyncio.Event()
    loop = asyncio.get_running_loop()

    async def read_loop() -> None:
        while not stop.is_set():
            try:
                data = await loop.run_in_executor(None, lambda: session.read(150))
                if data:
                    await ws.send_text(data)
                else:
                    await asyncio.sleep(0.02)
            except Exception:
                if not stop.is_set():
                    await asyncio.sleep(0.05)

    reader = asyncio.create_task(read_loop())

    try:
        async for raw in ws.iter_text():
            try:
                msg = json.loads(raw)
                if msg.get("type") == "resize":
                    session.resize(msg.get("cols", 220), msg.get("rows", 50))
                    continue
            except (json.JSONDecodeError, TypeError):
                pass
            if session.is_alive():
                session.write(raw)
                if model == "gemini" and "\r" in raw and raw.strip():
                    _gemini_usage["daily_calls"]  += 1
                    _gemini_usage["weekly_calls"] += 1
                    _save_gemini_usage()
            else:
                session = await _get_session(model)
    except WebSocketDisconnect:
        pass
    finally:
        stop.set()
        reader.cancel()
        try:
            await reader
        except asyncio.CancelledError:
            pass


# ── Entry point ───────────────────────────────────────────────────────────────

def _cleanup_sessions() -> None:
    for s in list(_sessions.values()):
        try:
            s.close()
        except Exception:
            pass


atexit.register(_cleanup_sessions)


if __name__ == "__main__":
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    _load_shared_ctx()
    _load_usage()
    _load_gemini_usage()
    print(BANNER)

    async def _startup():
        await asyncio.sleep(0.5)
        for model in SPAWN_CMD:
            try:
                await _get_session(model)
            except Exception:
                pass

    async def _open_browser() -> None:
        await asyncio.sleep(2.5)
        webbrowser.open(f"http://localhost:{PORT}")

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.create_task(_startup())
    loop.create_task(_open_browser())
    cfg = uvicorn.Config(app, host=HOST, port=PORT, log_level="warning", loop="asyncio")
    loop.run_until_complete(uvicorn.Server(cfg).serve())
