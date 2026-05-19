from __future__ import annotations

import asyncio
import atexit
import json
import os
import shutil
import subprocess
import time
import webbrowser
from pathlib import Path
from typing import Optional

import psutil
import uvicorn
from fastapi import FastAPI, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from winpty import PtyProcess

MARK_DIR = Path(__file__).parent
UPLOADS_DIR = MARK_DIR / "uploads"
MEMORY_PATH = Path(r"F:\Obsidian_Vault\Claude_Vault\Memory\MEMORY.md")
INDEX_HTML = MARK_DIR / "index.html"
HOST = "0.0.0.0"
PORT = 8765

KIMI_BIN = Path(r"C:\Users\Kutay\.local\bin\kimi.exe")

# For claude and gemini: spawn powershell as host, then launch the tool inside it.
# For kimi: spawn kimi.exe directly — prompt_toolkit's Win32Output fails when
# kimi is a grandchild of ConPTY (GetConsoleScreenBufferInfo errors), but works
# when kimi IS the direct ConPTY-attached process.
SPAWN_CMD = {
    "claude": "powershell.exe -NoProfile -NoLogo",
    "kimi": str(KIMI_BIN) if KIMI_BIN.exists() else "kimi",
    "gemini": "powershell.exe -NoProfile -NoLogo",
}

TOOL_LAUNCH = {
    "claude": "claude\r\n",
    "gemini": "gemini\r\n",
}

BANNER = r"""
  _   _       _    _    _   _     _____
 \ \ / /     / \  | |  | | | |   |_   _|
  \ V /     / _ \ | |  | | | |     | |
   | |     / ___ \| |__| |_| |_    | |
   |_|    /_/   \_\_____\_____|   |_|

  Virtual Assistant for Universal & Local Tasks
  MARK XI — Real Terminal Hub on http://localhost:8765
"""

app = FastAPI(title="V.A.U.L.T. MARK XI")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Sys metrics ───────────────────────────────────────────────────────────────

_net_prev_bytes: int = 0
_net_prev_time: float = 0.0


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


def _temp() -> float:
    try:
        temps = psutil.sensors_temperatures()
        if temps:
            for k in ("coretemp", "k10temp", "cpu_thermal"):
                if k in temps and temps[k]:
                    return float(temps[k][0].current)
    except Exception:
        pass
    return 0.0


def _net_kb() -> float:
    global _net_prev_bytes, _net_prev_time
    now = time.monotonic()
    c = psutil.net_io_counters()
    total = c.bytes_sent + c.bytes_recv
    elapsed = now - _net_prev_time if _net_prev_time else 1.5
    delta = (total - _net_prev_bytes) / 1024 / max(elapsed, 0.1) if _net_prev_bytes else 0.0
    _net_prev_bytes = total
    _net_prev_time = now
    return round(max(delta, 0.0), 1)


def _uptime() -> str:
    s = int(time.time() - psutil.boot_time())
    h, rem = divmod(s, 3600)
    m, _ = divmod(rem, 60)
    return f"{h:02d}:{m:02d}"


# ── PTY session manager ────────────────────────────────────────────────────────

class PtySession:
    def __init__(self, model: str, cols: int = 220, rows: int = 50):
        self.model = model
        env = os.environ.copy()
        self.proc: PtyProcess = PtyProcess.spawn(
            SPAWN_CMD[model],
            dimensions=(rows, cols),
            env=env,
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


_sessions: dict[str, PtySession] = {}
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
        # Let PS initialise, then launch the tool
        asyncio.create_task(_launch_tool(session, model))
        return session


async def _launch_tool(session: PtySession, model: str) -> None:
    if model == "kimi":
        # kimi.exe is the PTY process itself — no host shell to launch through
        session._launched = True
        return
    await asyncio.sleep(1.2)
    if session.is_alive():
        session.write("chcp 65001 | Out-Null\r\n")
        await asyncio.sleep(0.3)
        session.write(TOOL_LAUNCH[model])
        session._launched = True


# ── HTTP routes ────────────────────────────────────────────────────────────────

@app.get("/")
async def serve_index() -> FileResponse:
    return FileResponse(str(INDEX_HTML), media_type="text/html")


@app.get("/api/memory")
async def get_memory() -> JSONResponse:
    content = MEMORY_PATH.read_text(encoding="utf-8", errors="replace") if MEMORY_PATH.exists() else "Memory vault offline."
    return JSONResponse({"content": content})


@app.post("/api/upload")
async def upload_file(file: UploadFile) -> JSONResponse:
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    dest = UPLOADS_DIR / (file.filename or "upload")
    with dest.open("wb") as fh:
        shutil.copyfileobj(file.file, fh)
    return JSONResponse({"filename": dest.name, "size": dest.stat().st_size, "path": str(dest)})


# ── WebSocket: sys metrics ─────────────────────────────────────────────────────

@app.websocket("/ws/metrics")
async def ws_metrics(ws: WebSocket) -> None:
    await ws.accept()
    _net_kb()
    try:
        while True:
            await ws.send_text(json.dumps({
                "cpu": psutil.cpu_percent(interval=None),
                "mem": psutil.virtual_memory().percent,
                "net_kb": _net_kb(),
                "gpu": _gpu(),
                "tmp": _temp(),
                "uptime": _uptime(),
                "procs": len(psutil.pids()),
            }))
            await asyncio.sleep(1.5)
    except (WebSocketDisconnect, Exception):
        pass


# ── WebSocket: PTY terminal ────────────────────────────────────────────────────

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
    loop = asyncio.get_event_loop()

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
            # Plain text = keystroke input
            if session.is_alive():
                session.write(raw)
            else:
                # Session died — restart it
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


# ── Entry point ────────────────────────────────────────────────────────────────

def _cleanup_sessions() -> None:
    for s in list(_sessions.values()):
        try:
            s.close()
        except Exception:
            pass

atexit.register(_cleanup_sessions)


if __name__ == "__main__":
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    print(BANNER)

    async def _open_browser() -> None:
        await asyncio.sleep(2.0)
        webbrowser.open(f"http://localhost:{PORT}")

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.create_task(_open_browser())
    cfg = uvicorn.Config(app, host=HOST, port=PORT, log_level="warning", loop="asyncio")
    loop.run_until_complete(uvicorn.Server(cfg).serve())
