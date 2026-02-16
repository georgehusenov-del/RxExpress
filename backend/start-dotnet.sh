#!/bin/bash
export PATH="$PATH:/usr/share/dotnet"
export DOTNET_ROOT="/usr/share/dotnet"
cd /app/backend-dotnet/RxExpresss
exec dotnet run --urls "http://0.0.0.0:8001"
