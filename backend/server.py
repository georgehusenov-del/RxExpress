#!/usr/bin/env python3
"""
RX Expresss Backend Launcher
Replaces the original FastAPI backend - now launches .NET Core backend.
This script is called by supervisor via uvicorn, but we exec to .NET instead.
"""
import os
import sys
import subprocess

DOTNET_PATH = "/usr/share/dotnet"
BACKEND_EXE = "/app/backend-dotnet/RxExpresss/bin/Release/net8.0/RxExpresss"

def main():
    env = os.environ.copy()
    env["PATH"] = f"{DOTNET_PATH}:{env.get('PATH', '')}"
    env["DOTNET_ROOT"] = DOTNET_PATH
    
    print(f"[RX Expresss] Starting .NET Backend...", flush=True)
    print(f"[RX Expresss] Executable: {BACKEND_EXE}", flush=True)
    
    # Replace this process with the .NET backend
    os.chdir(os.path.dirname(BACKEND_EXE))
    os.execve(BACKEND_EXE, [BACKEND_EXE, "--urls", "http://0.0.0.0:8001"], env)

if __name__ == "__main__":
    main()

# Dummy FastAPI app for uvicorn (won't be used - we exec before this matters)
from fastapi import FastAPI
app = FastAPI()
