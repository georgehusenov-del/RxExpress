"""
RX Expresss Backend Launcher
This script launches the .NET backend since supervisor is configured to run Python.
The actual backend is now ASP.NET Core in /app/backend-dotnet
"""
import subprocess
import os
import sys
import signal
import time

DOTNET_PATH = "/usr/share/dotnet"
DOTNET_ROOT = "/usr/share/dotnet"
BACKEND_PATH = "/app/backend-dotnet/RxExpresss/bin/Release/net8.0/RxExpresss"

def main():
    # Set environment
    env = os.environ.copy()
    env["PATH"] = f"{DOTNET_PATH}:{env.get('PATH', '')}"
    env["DOTNET_ROOT"] = DOTNET_ROOT
    
    print(f"Starting .NET Backend: {BACKEND_PATH}")
    
    # Start the .NET process
    process = subprocess.Popen(
        [BACKEND_PATH, "--urls", "http://0.0.0.0:8001"],
        env=env,
        cwd=os.path.dirname(BACKEND_PATH),
        stdout=sys.stdout,
        stderr=sys.stderr
    )
    
    # Handle signals to gracefully stop the .NET process
    def signal_handler(signum, frame):
        print(f"Received signal {signum}, stopping .NET backend...")
        process.terminate()
        process.wait(timeout=10)
        sys.exit(0)
    
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    
    # Wait for the process
    return_code = process.wait()
    print(f".NET backend exited with code {return_code}")
    sys.exit(return_code)

if __name__ == "__main__":
    main()
