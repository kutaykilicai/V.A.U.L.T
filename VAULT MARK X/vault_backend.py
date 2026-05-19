from __future__ import annotations

import asyncio
import json
import os
import shutil
import subprocess
import time
import webbrowser
from pathlib import Path
from typing import AsyncGenerator

import psutil
import uvicorn
from fastapi import FastAPI, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

MARK10_DIR = Path(r"C:\Users\Kutay\VAULT\MARK10")
UPLOADS_DIR = MARK10_DIR / "uploads"
MEMORY_PATH = Path(r"F:\Obsidian_Vault\Claude_Vault\Memory\MEMORY.md")
INDEX_HTML = MARK10_DIR / "index.html"
HOST = "0.0.0.0"
PORT = 8765

BANNER = r"""
  _   _       _    _    _   _     _____
 \ \ / /     / \  | |  | | | |   |_   _|
  \ V /     / _ \ | |  | | | |     | |
   | |     / ___ \| |__| |_| |_    | |
   |_|    /_/   \_\_____\_____|   |_|

  Virtual Assistant for Universal & Local Tasks
  MARK X — Initializing on http://localhost:8765
"""

app = FastAPI(title="V.A.U.L.T. MARK X")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_net_bytes_prev: int = 0
_net_time_prev: float = 0.0


def _gpu_usage() -> float:
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=utilization.gpu", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=2,
        )
        if result.returncode == 0:
            return float(result.stdout.strip().split("\n")[0])
    except Exception:
        pass
    return 0.0


def _cpu_temp() -> float:
    try:
        temps = psutil.sensors_temperatures()
        if temps:
            for key in ("coretemp", "k10temp", "cpu_thermal"):
                if key in temps and temps[key]:
                    return float(temps[key][0].current)
            first = next(iter(temps.values()))
            if first:
                return float(first[0].current)
    except Exception:
        pass
    return 0.0


def _net_kb() -> float:
    global _net_bytes_prev, _net_time_prev
    now = time.monotonic()
    counters = psutil.net_io_counters()
    total = counters.bytes_sent + counters.bytes_recv
    elapsed = now - _net_time_prev if _net_time_prev else 1.5
    delta_kb = (total - _net_bytes_prev) / 1024 / max(elapsed, 0.1) if _net_bytes_prev else 0.0
    _net_bytes_prev = total
    _net_time_prev = now
    return round(max(delta_kb, 0.0), 1)


def _uptime_str() -> str:
    boot = psutil.boot_time()
    seconds = int(time.time() - boot)
    h, rem = divmod(seconds, 3600)
    m, _ = divmod(rem, 60)
    return f"{h:02d}:{m:02d}"


@app.get("/")
async def serve_index() -> FileResponse:
    if INDEX_HTML.exists():
        return FileResponse(str(INDEX_HTML), media_type="text/html")
    return FileResponse(str(INDEX_HTML))


@app.get("/api/memory")
async def get_memory() -> JSONResponse:
    if MEMORY_PATH.exists():
        content = MEMORY_PATH.read_text(encoding="utf-8", errors="replace")
    else:
        content = "Memory vault offline."
    return JSONResponse({"content": content})


@app.post("/api/upload")
async def upload_file(file: UploadFile) -> JSONResponse:
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    dest = UPLOADS_DIR / (file.filename or "upload")
    with dest.open("wb") as fh:
        shutil.copyfileobj(file.file, fh)
    return JSONResponse({"filename": dest.name, "size": dest.stat().st_size, "path": str(dest)})


@app.websocket("/ws/metrics")
async def ws_metrics(websocket: WebSocket) -> None:
    await websocket.accept()
    _net_kb()
    try:
        while True:
            payload = {
                "cpu": psutil.cpu_percent(interval=None),
                "mem": psutil.virtual_memory().percent,
                "net_kb": _net_kb(),
                "gpu": _gpu_usage(),
                "tmp": _cpu_temp(),
                "uptime": _uptime_str(),
                "procs": len(psutil.pids()),
            }
            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(1.5)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass


def _build_command(model: str, command: str) -> list[str]:
    escaped = command.replace('"', '\\"')
    if model == "claude":
        return [
            "powershell.exe", "-NoProfile", "-NonInteractive", "-Command",
            f'claude --print "{escaped}"',
        ]
    if model == "gemini":
        return [
            "powershell.exe", "-NoProfile", "-NonInteractive", "-Command",
            f'gemini -p "{escaped}"',
        ]
    if model == "kimi":
        kimi_bin = Path(r"C:\Users\Kutay\.local\bin\kimi.exe")
        bin_path = str(kimi_bin) if kimi_bin.exists() else "kimi"
        return [bin_path, "--print", "--yolo", "-p", command]
    raise ValueError(f"Unknown model: {model}")


async def _stream_process(cmd: list[str]) -> AsyncGenerator[bytes, None]:
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    assert proc.stdout is not None
    while True:
        chunk = await proc.stdout.read(512)
        if not chunk:
            break
        yield chunk
    await proc.wait()
    yield b"\x00" + proc.returncode.to_bytes(4, "little")


@app.websocket("/ws/terminal")
async def ws_terminal(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            model: str = msg.get("model", "claude")
            command: str = msg.get("command", "")

            await websocket.send_text(json.dumps({"type": "start", "model": model, "command": command}))

            try:
                cmd = _build_command(model, command)
            except ValueError as exc:
                await websocket.send_text(json.dumps({"type": "error", "message": str(exc)}))
                continue

            try:
                exit_code = 0
                async for chunk in _stream_process(cmd):
                    if len(chunk) == 5 and chunk[0] == 0:
                        exit_code = int.from_bytes(chunk[1:], "little")
                        break
                    text = chunk.decode("utf-8", errors="replace")
                    await websocket.send_text(json.dumps({"type": "chunk", "data": text}))
                await websocket.send_text(json.dumps({"type": "done", "code": exit_code}))
            except FileNotFoundError:
                await websocket.send_text(json.dumps({"type": "error", "message": f"{model} binary not found."}))
            except Exception as exc:
                await websocket.send_text(json.dumps({"type": "error", "message": str(exc)}))

    except WebSocketDisconnect:
        pass
    except Exception:
        pass


if __name__ == "__main__":
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    print(BANNER)

    async def _open_browser() -> None:
        await asyncio.sleep(1.5)
        webbrowser.open(f"http://localhost:{PORT}")

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.create_task(_open_browser())

    config = uvicorn.Config(app, host=HOST, port=PORT, log_level="warning", loop="asyncio")
    server = uvicorn.Server(config)
    loop.run_until_complete(server.serve())
