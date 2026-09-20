from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
import sqlite3

from app.database import get_db_connection
from app.simulator import simulator_instance

router = APIRouter(prefix="/api/attacker", tags=["Attacker Sandbox"])

class LaunchAttackRequest(BaseModel):
    scenario_key: str
    custom_card: Optional[str] = None
    custom_amount: Optional[float] = None
    custom_location: Optional[str] = None
    custom_ip: Optional[str] = None
    priority: Optional[str] = None

class CustomPayloadRequest(BaseModel):
    card_number: str
    merchant: str
    amount: float
    location: str = "US"
    ip_address: str = "127.0.0.1"
    nonce: Optional[str] = None
    signature: Optional[str] = None
    attack_type: str = "Custom Fraud Injection"
    priority: Optional[str] = "medium"

@router.get("/target-cards")
def get_target_cards():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.card_number, c.holder_name, c.balance, c.home_country, c.geofence_country, 
               c.card_locked, c.daily_limit, c.vip_tier, c.card_type, u.username 
        FROM cards c JOIN users u ON c.user_id = u.id
        WHERE u.role = 'customer'
        GROUP BY c.user_id
        ORDER BY c.user_id ASC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.post("/launch")
def launch_attack_scenario(req: LaunchAttackRequest):
    valid_scenarios = [
        "fake_payment", "transaction_tampering", "replay_attack",
        "card_testing", "identity_spoofing", "account_takeover", "abnormal_spike",
        "blockchain_tamper"
    ]
    if req.scenario_key not in valid_scenarios:
        raise HTTPException(status_code=400, detail=f"Invalid scenario. Allowed: {valid_scenarios}")

    result = simulator_instance.execute_attack_scenario(
        scenario_key=req.scenario_key,
        custom_card=req.custom_card,
        custom_amount=req.custom_amount,
        priority=req.priority
    )
    return result

@router.post("/custom-payload")
def test_custom_payload(req: CustomPayloadRequest):
    payload = {
        "card_number": req.card_number,
        "merchant": req.merchant,
        "amount": req.amount,
        "location": req.location,
        "ip_address": req.ip_address,
        "nonce": req.nonce,
        "signature": req.signature,
        "attack_type": req.attack_type,
        "priority": req.priority or "medium"
    }

    result = simulator_instance.process_payload(payload)
    return result
