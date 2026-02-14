#!/bin/bash
export PATH="$PATH:/usr/share/dotnet"
export DOTNET_ROOT="/usr/share/dotnet"
cd /app/backend-dotnet/RxExpresss/bin/Debug/net8.0
exec ./RxExpresss --urls "http://0.0.0.0:8001"
