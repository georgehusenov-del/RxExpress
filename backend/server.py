"""
RX Expresss Backend - .NET Launcher via FastAPI
This FastAPI app acts as a reverse proxy to the .NET backend.
Since uvicorn must bind to 8001, we run .NET on 8002 and proxy requests.
"""
import os
import sys
import subprocess
import signal
import asyncio
import httpx
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from contextlib import asynccontextmanager

DOTNET_PATH = "/usr/share/dotnet"
BACKEND_EXE = "/app/backend-dotnet/RxExpresss/bin/Release/net8.0/RxExpresss"
DOTNET_PORT = 8002
DOTNET_URL = f"http://127.0.0.1:{DOTNET_PORT}"

dotnet_process = None

def start_dotnet():
    global dotnet_process
    env = os.environ.copy()
    env["PATH"] = f"{DOTNET_PATH}:{env.get('PATH', '')}"
    env["DOTNET_ROOT"] = DOTNET_PATH
    
    print(f"[Launcher] Starting .NET Backend on port {DOTNET_PORT}...", flush=True)
    
    if not os.path.exists(BACKEND_EXE):
        print(f"[Launcher] ERROR: Executable not found: {BACKEND_EXE}", flush=True)
        return None
        
    dotnet_process = subprocess.Popen(
        [BACKEND_EXE, "--urls", f"http://0.0.0.0:{DOTNET_PORT}"],
        env=env,
        cwd=os.path.dirname(BACKEND_EXE),
        stdout=sys.stdout,
        stderr=sys.stderr
    )
    print(f"[Launcher] .NET Backend started with PID: {dotnet_process.pid}", flush=True)
    return dotnet_process

def stop_dotnet():
    global dotnet_process
    if dotnet_process and dotnet_process.poll() is None:
        print("[Launcher] Stopping .NET backend...", flush=True)
        dotnet_process.terminate()
        try:
            dotnet_process.wait(timeout=5)
        except:
            dotnet_process.kill()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    start_dotnet()
    await asyncio.sleep(2)  # Wait for .NET to start
    yield
    # Shutdown
    stop_dotnet()

app = FastAPI(
    title="RX Expresss Proxy",
    lifespan=lifespan
)

# Proxy all requests to .NET backend
@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
async def proxy(request: Request, path: str):
    async with httpx.AsyncClient(timeout=30.0) as client:
        url = f"{DOTNET_URL}/{path}"
        
        # Build headers (exclude host)
        headers = {k: v for k, v in request.headers.items() if k.lower() not in ['host', 'content-length']}
        
        # Get body
        body = await request.body()
        
        try:
            response = await client.request(
                method=request.method,
                url=url,
                headers=headers,
                content=body,
                params=request.query_params
            )
            
            # Return response with same status and headers
            return JSONResponse(
                content=response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text,
                status_code=response.status_code,
                headers={k: v for k, v in response.headers.items() if k.lower() not in ['content-length', 'transfer-encoding', 'content-encoding']}
            )
        except httpx.ConnectError:
            raise HTTPException(status_code=503, detail="Backend service unavailable")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
