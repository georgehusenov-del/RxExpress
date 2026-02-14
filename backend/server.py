"""
RX Expresss Backend - .NET Launcher Wrapper
This FastAPI app manages the lifecycle of the .NET backend.
The actual business logic is in /app/backend-dotnet (ASP.NET Core 8)
"""
import subprocess
import os
import sys
import signal
import time
import threading
import atexit
from fastapi import FastAPI

# Configuration
DOTNET_PATH = "/usr/share/dotnet"
DOTNET_ROOT = "/usr/share/dotnet"
BACKEND_EXE = "/app/backend-dotnet/RxExpresss/bin/Release/net8.0/RxExpresss"

# Global process reference
dotnet_process = None

def start_dotnet_backend():
    """Start the .NET backend process"""
    global dotnet_process
    
    env = os.environ.copy()
    env["PATH"] = f"{DOTNET_PATH}:{env.get('PATH', '')}"
    env["DOTNET_ROOT"] = DOTNET_ROOT
    
    print(f"[Launcher] Starting .NET Backend: {BACKEND_EXE}", flush=True)
    
    # Check if executable exists
    if not os.path.exists(BACKEND_EXE):
        print(f"[Launcher] ERROR: .NET executable not found at {BACKEND_EXE}", flush=True)
        return None
    
    try:
        dotnet_process = subprocess.Popen(
            [BACKEND_EXE, "--urls", "http://0.0.0.0:8001"],
            env=env,
            cwd=os.path.dirname(BACKEND_EXE),
            stdout=sys.stdout,
            stderr=sys.stderr
        )
        print(f"[Launcher] .NET Backend started with PID: {dotnet_process.pid}", flush=True)
        return dotnet_process
    except Exception as e:
        print(f"[Launcher] ERROR starting .NET backend: {e}", flush=True)
        return None

def stop_dotnet_backend():
    """Stop the .NET backend process"""
    global dotnet_process
    if dotnet_process and dotnet_process.poll() is None:
        print("[Launcher] Stopping .NET backend...", flush=True)
        dotnet_process.terminate()
        try:
            dotnet_process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            dotnet_process.kill()
        print("[Launcher] .NET backend stopped", flush=True)

def monitor_dotnet_backend():
    """Monitor and restart the .NET backend if it crashes"""
    global dotnet_process
    while True:
        if dotnet_process:
            return_code = dotnet_process.poll()
            if return_code is not None:
                print(f"[Launcher] .NET backend exited with code {return_code}, restarting...", flush=True)
                time.sleep(2)
                start_dotnet_backend()
        time.sleep(5)

# Register cleanup
atexit.register(stop_dotnet_backend)

# Start the .NET backend in a background thread
start_dotnet_backend()

# Start monitor thread
monitor_thread = threading.Thread(target=monitor_dotnet_backend, daemon=True)
monitor_thread.start()

# Create minimal FastAPI app (uvicorn expects this)
# This app does nothing - the .NET backend handles all requests
app = FastAPI(
    title="RX Expresss Launcher",
    description="This is a launcher wrapper. Actual API is served by .NET on the same port."
)

# Note: This FastAPI app won't actually serve any requests because
# the .NET backend binds to port 8001 first. This is just to satisfy
# uvicorn's requirement for an 'app' object.
