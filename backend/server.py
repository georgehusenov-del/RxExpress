# Backend moved to .NET - see /app/rxexpresss-solution/
# This file is kept as placeholder for supervisor
from fastapi import FastAPI
app = FastAPI()

@app.get("/")
def root():
    return {"message": "API moved to .NET Core - port 8001"}
