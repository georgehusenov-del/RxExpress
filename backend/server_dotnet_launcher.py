"""
ASP.NET Core Backend Proxy
This file ensures the supervisor can start the backend using its existing Python config.
It starts the .NET backend and proxies all requests to it.
"""
import subprocess
import os
import sys
import signal
import time
import threading

# Start the .NET backend
dotnet_process = None

def start_dotnet():
    global dotnet_process
    env = os.environ.copy()
    env["PATH"] = env.get("PATH", "") + ":/usr/share/dotnet"
    env["DOTNET_ROOT"] = "/usr/share/dotnet"
    
    dotnet_process = subprocess.Popen(
        ["dotnet", "run", "--urls", "http://0.0.0.0:8001"],
        cwd="/app/backend-dotnet/RxExpresss",
        env=env,
        stdout=sys.stdout,
        stderr=sys.stderr
    )
    dotnet_process.wait()

def signal_handler(sig, frame):
    if dotnet_process:
        dotnet_process.terminate()
    sys.exit(0)

signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

if __name__ == "__main__":
    start_dotnet()
