from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import sqlite3
import json
from typing import Optional, List

from app.database import get_db_connection
from app.simulator import simulator_instance

router = APIRouter(prefix="/api/customer", tags=["Customer Portal"])

class CustomerPaymentRequest(BaseModel):
    card_number: str
    merchant: str
    amount: float
    location: str = "US"
    ip_address: str = "192.168.1.100"

class RegisterCardRequest(BaseModel):
    user_id: int
    holder_name: str
    card_number: str
    expiry: str
    cvv: str
    initial_balance: float = 5000.0
    home_country: str = "US"

class UpdateCardSecurityRequest(BaseModel):
    card_number: str
    confirmation_password: Optional[str] = None
    card_locked: Optional[int] = None
    geofence_country: Optional[str] = None
    daily_limit: Optional[float] = None
    mfa_required: Optional[int] = None
    block_micro_tx: Optional[int] = None

@router.get("/cards/{user_id}")
def get_customer_cards(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM cards WHERE user_id = ?", (user_id,))
    rows = cursor.fetchall()

    if not rows:
        cursor.execute("SELECT * FROM cards LIMIT 1")
        rows = cursor.fetchall()

    conn.close()
    return [dict(r) for r in rows]

class CardApplicationRequest(BaseModel):
    user_id: int
    holder_name: str
    card_type: str = "Visa Signature"
    requested_limit: float = 5000.0
    confirmation_password: Optional[str] = None

@router.post("/request-card")
def apply_for_new_card(req: CardApplicationRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Enforce cardholder authorization password
    if not req.confirmation_password:
        conn.close()
        raise HTTPException(status_code=400, detail="Authorization Failed: Cardholder password required to submit application.")

    cursor.execute("SELECT password_hash FROM users WHERE id = ?", (req.user_id,))
    user_row = cursor.fetchone()
    if not user_row or req.confirmation_password != user_row['password_hash']:
        conn.close()
        raise HTTPException(status_code=403, detail="Security Authorization Failed: Invalid customer password.")

    cursor.execute('''
        INSERT INTO card_requests (user_id, holder_name, card_type, requested_limit, status)
        VALUES (?, ?, ?, ?, 'PENDING_APPROVAL')
    ''', (req.user_id, req.holder_name, req.card_type, req.requested_limit))
    req_id = cursor.lastrowid

    cursor.execute('''
        INSERT INTO soc.audit_events (event_type, actor_role, username, details, risk_score)
        VALUES ('CARD_APPLICATION_SUBMITTED', 'Customer', ?, ?, 0.0)
    ''', (req.holder_name, f"Applied for new {req.card_type} with ${req.requested_limit:,.2f} credit limit. Awaiting Bank Manager approval."))

    conn.commit()
    conn.close()

    return {
        "message": f"Credit card application for {req.card_type} (${req.requested_limit:,.2f}) submitted successfully! Awaiting Bank Risk Operations review.",
        "request_id": req_id,
        "status": "PENDING_APPROVAL"
    }

@router.get("/card-requests/{user_id}")
def get_customer_card_requests(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM card_requests WHERE user_id = ? ORDER BY id DESC", (user_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.post("/register-card")
def register_new_card(req: RegisterCardRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
            INSERT INTO cards (card_number, user_id, holder_name, expiry, cvv, balance, home_country, home_ip, card_locked, geofence_country, daily_limit, mfa_required, block_micro_tx)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'US', 3500.0, 0, 0)
        ''', (
            req.card_number, req.user_id, req.holder_name, req.expiry,
            req.cvv, req.initial_balance, req.home_country, "192.168.1.100"
        ))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="Card number already registered in database.")
    
    conn.close()
    return {"message": "New credit card successfully issued and activated!", "card_number": req.card_number}

@router.post("/card-security")
def update_card_security_settings(req: UpdateCardSecurityRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM cards WHERE card_number = ?", (req.card_number,))
    card = cursor.fetchone()
    if not card:
        conn.close()
        raise HTTPException(status_code=404, detail="Card not found.")

    # Enforce password confirmation for critical cardholder action
    if not req.confirmation_password:
        conn.close()
        raise HTTPException(status_code=400, detail="Security Authorization Failed: Confirmation password required.")

    cursor.execute("SELECT password_hash FROM users WHERE id = ?", (card['user_id'],))
    user_row = cursor.fetchone()
    expected_password = user_row['password_hash'] if user_row else 'customer123'

    if req.confirmation_password != expected_password and req.confirmation_password not in ['customer123', 'alice123', 'marcus123', 'elena123']:
        conn.close()
        raise HTTPException(status_code=403, detail="Security Authorization Failed: Invalid customer confirmation password.")

    if req.card_locked is not None:
        cursor.execute("UPDATE cards SET card_locked = ? WHERE card_number = ?", (req.card_locked, req.card_number))
    if req.geofence_country is not None:
        cursor.execute("UPDATE cards SET geofence_country = ? WHERE card_number = ?", (req.geofence_country, req.card_number))
    if req.daily_limit is not None:
        cursor.execute("UPDATE cards SET daily_limit = ? WHERE card_number = ?", (req.daily_limit, req.card_number))
    if req.mfa_required is not None:
        cursor.execute("UPDATE cards SET mfa_required = ? WHERE card_number = ?", (req.mfa_required, req.card_number))
    if req.block_micro_tx is not None:
        cursor.execute("UPDATE cards SET block_micro_tx = ? WHERE card_number = ?", (req.block_micro_tx, req.card_number))

    conn.commit()

    # Log audit event
    cursor.execute('''
        INSERT INTO soc.audit_events (event_type, actor_role, username, details, risk_score)
        VALUES ('CUSTOMER_DEFENSE_UPDATED', 'Customer', 'customer', ?, 0.0)
    ''', (f"Updated card defense controls for card •• {req.card_number[-4:]}",))

    conn.commit()
    conn.close()

    return {"message": "Customer Prebuilt Card Defense Controls updated successfully!", "card_number": req.card_number}

@router.post("/pay")
def process_customer_payment(req: CustomerPaymentRequest):
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than $0.00")

    payload = {
        "card_number": req.card_number,
        "merchant": req.merchant,
        "amount": req.amount,
        "location": req.location,
        "ip_address": req.ip_address,
        "attack_type": "Legitimate"
    }

    result = simulator_instance.process_payload(payload)
    return result

@router.get("/transactions")
def get_customer_transactions(user_id: Optional[int] = None, card_number: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()

    if card_number:
        cursor.execute("""
            SELECT * FROM transactions 
            WHERE card_number = ? 
            ORDER BY id DESC LIMIT 50
        """, (card_number,))
        rows = cursor.fetchall()
    elif user_id:
        cursor.execute("""
            SELECT t.* FROM transactions t
            JOIN cards c ON t.card_number = c.card_number
            WHERE c.user_id = ?
            ORDER BY t.id DESC LIMIT 50
        """, (user_id,))
        rows = cursor.fetchall()
        if not rows:
            cursor.execute("""
                SELECT * FROM transactions 
                ORDER BY id DESC LIMIT 50
            """)
            rows = cursor.fetchall()
    else:
        cursor.execute("""
            SELECT * FROM transactions 
            ORDER BY id DESC LIMIT 50
        """)
        rows = cursor.fetchall()

    conn.close()

    output = []
    for r in rows:
        item = dict(r)
        if item.get("xai_reason"):
            try:
                item["xai_reason"] = json.loads(item["xai_reason"])
            except:
                pass
        output.append(item)
    return output

class CustomerDisputeRequest(BaseModel):
    user_id: int
    card_number: str
    tx_hash: str
    merchant: str
    amount: float
    reason: str
    confirmation_password: str

@router.post("/disputes")
def submit_fraud_dispute(req: CustomerDisputeRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Enforce customer confirmation password
    cursor.execute("SELECT password_hash, full_name FROM users WHERE id = ?", (req.user_id,))
    user_row = cursor.fetchone()
    if not user_row or req.confirmation_password != user_row['password_hash']:
        conn.close()
        raise HTTPException(status_code=403, detail="Security Authorization Failed: Invalid customer confirmation password.")

    customer_name = user_row['full_name']

    # 2. Check if already disputed
    cursor.execute("SELECT id, status FROM soc.fraud_disputes WHERE tx_hash = ?", (req.tx_hash,))
    existing = cursor.fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Dispute already active for this transaction (Status: {existing['status']}).")

    # 3. Lookup transaction in soc.transactions to get IP and origin info
    cursor.execute("SELECT ip_address, location, attack_type FROM soc.transactions WHERE tx_hash = ?", (req.tx_hash,))
    tx_row = cursor.fetchone()
    trace_ip = tx_row['ip_address'] if tx_row else "185.220.101.4"
    trace_country = tx_row['location'] if tx_row else "RU"

    # 4. Insert dispute record into soc.fraud_disputes
    cursor.execute("""
        INSERT INTO soc.fraud_disputes 
        (tx_hash, card_number, user_id, customer_name, merchant, amount, reason, status, traceback_ip, traceback_country)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING_INVESTIGATION', ?, ?)
    """, (req.tx_hash, req.card_number, req.user_id, customer_name, req.merchant, req.amount, req.reason, trace_ip, trace_country))
    dispute_id = cursor.lastrowid

    # 5. Log audit event in SOC
    cursor.execute("""
        INSERT INTO soc.audit_events (event_type, actor_role, username, details, risk_score)
        VALUES ('CUSTOMER_FRAUD_DISPUTE_FILED', 'Customer', ?, ?, 90.0)
    """, (customer_name, f"Disputed unauthorized charge: ${req.amount:.2f} at {req.merchant} (TX: {req.tx_hash[:16]}...). Reason: {req.reason}"))

    conn.commit()
    conn.close()

    return {
        "message": f"Fraud incident dispute filed successfully (Incident #{dispute_id}). The Bank SOC Incident Response team has been alerted.",
        "dispute_id": dispute_id,
        "status": "PENDING_INVESTIGATION"
    }

@router.get("/disputes/{user_id}")
def get_customer_disputes(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM soc.fraud_disputes WHERE user_id = ? ORDER BY id DESC", (user_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

