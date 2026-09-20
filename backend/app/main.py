from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import time

from app.database import init_db
from app.blockchain import blockchain_instance
from app.ml_engine import ml_engine_instance

from app.routers import (
    auth_router,
    customer_router,
    attacker_router,
    manager_router,
    blockchain_router
)

# Initialize database tables & seed data on app start
init_db()

app = FastAPI(
    title="Blockchain Credit Card Fraud Detection System API",
    description="Real-Time Machine Learning Fraud Detection with Immutable Blockchain Audit Trail",
    version="1.0.0"
)

# Enable CORS for local Vite React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(auth_router.router)
app.include_router(customer_router.router)
app.include_router(attacker_router.router)
app.include_router(manager_router.router)
app.include_router(blockchain_router.router)

@app.get("/")
@app.get("/api/health")
def health_check():
    chain_health = blockchain_instance.validate_chain_integrity()
    return {
        "status": "ONLINE",
        "system": "Blockchain Credit Card Fraud Detection Platform",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "blockchain_valid": chain_health["is_valid"],
        "total_blocks": chain_health.get("total_blocks", 0),
        "ml_model_active": ml_engine_instance.model is not None
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
