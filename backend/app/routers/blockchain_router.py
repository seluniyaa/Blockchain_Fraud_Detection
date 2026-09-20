from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.blockchain import blockchain_instance

router = APIRouter(prefix="/api/blockchain", tags=["Blockchain Explorer"])

class TamperTestRequest(BaseModel):
    block_index: int
    tampered_amount: float = 99999.99

@router.get("/chain")
def get_blockchain_ledger():
    chain = blockchain_instance.get_chain()
    return {
        "total_blocks": len(chain),
        "chain": chain
    }

@router.get("/verify")
def verify_blockchain_integrity():
    result = blockchain_instance.validate_chain_integrity()
    return result

@router.post("/tamper-test")
def simulate_block_tamper(req: TamperTestRequest):
    result = blockchain_instance.simulate_tamper_block(req.block_index, req.tampered_amount)
    return result

@router.get("/latest")
def get_latest_block():
    latest = blockchain_instance.get_latest_block()
    return latest.to_dict()

class BlockchainRepairRequest(BaseModel):
    admin_password: str

@router.post("/repair")
def repair_blockchain_ledger(req: BlockchainRepairRequest):
    if req.admin_password != "manager123":
        raise HTTPException(status_code=403, detail="Unauthorized Ledger Operation: Invalid administrator authorization password.")
    result = blockchain_instance.repair_chain()
    return result


