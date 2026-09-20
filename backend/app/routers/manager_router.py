from fastapi import APIRouter, Response, HTTPException
from pydantic import BaseModel
import sqlite3
import json
import csv
import io
import time
from typing import Optional, List

from app.database import get_db_connection
from app.blockchain import blockchain_instance, Block

router = APIRouter(prefix="/api/manager", tags=["Manager SOC Dashboard"])

class UpdateSecuritySettingsRequest(BaseModel):
    admin_password: Optional[str] = None
    defense_mode: Optional[str] = None
    risk_threshold_override: Optional[float] = None
    auto_block_suspicious_ip: Optional[int] = None

class BlacklistIpRequest(BaseModel):
    admin_password: Optional[str] = None
    ip_address: str
    reason: str = "Compromised / Suspicious Activity"

class RepairBlockchainRequest(BaseModel):
    admin_password: Optional[str] = None

@router.get("/metrics")
def get_dashboard_metrics():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM transactions")
    total_tx = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM transactions WHERE status = 'APPROVED'")
    approved_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM transactions WHERE status = 'FLAGGED'")
    flagged_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM transactions WHERE status IN ('BLOCKED', 'DETECTED')")
    blocked_count = cursor.fetchone()[0]

    cursor.execute("SELECT SUM(amount) FROM transactions WHERE status IN ('BLOCKED', 'DETECTED')")
    prevented_loss = cursor.fetchone()[0] or 0.0

    cursor.execute("SELECT AVG(risk_score) FROM transactions")
    avg_risk_score = cursor.fetchone()[0] or 0.0

    health = blockchain_instance.validate_chain_integrity()

    cursor.execute("""
        SELECT attack_type, COUNT(*) as count 
        FROM transactions 
        GROUP BY attack_type 
        ORDER BY count DESC
    """)
    threat_distribution = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM security_settings ORDER BY id DESC LIMIT 1")
    sec_settings = dict(cursor.fetchone() or {})

    cursor.execute("SELECT COUNT(*) FROM blacklisted_ips")
    blacklisted_ip_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM transactions WHERE status = 'APPROVED' AND attack_type != 'Legitimate'")
    adversary_approved_count = cursor.fetchone()[0]

    conn.close()

    return {
        "total_transactions": total_tx,
        "approved_count": approved_count,
        "flagged_count": flagged_count,
        "blocked_count": blocked_count,
        "prevented_loss_usd": round(prevented_loss, 2),
        "average_risk_score": round(avg_risk_score, 1),
        "blockchain_status": "INTACT" if health["is_valid"] else "CORRUPTED",
        "adversary_settled_count": adversary_approved_count,
        "blockchain_health": health,
        "threat_distribution": threat_distribution,
        "security_settings": sec_settings,
        "blacklisted_ip_count": blacklisted_ip_count
    }

@router.get("/security-settings")
def get_security_settings():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM security_settings ORDER BY id DESC LIMIT 1")
    sec = dict(cursor.fetchone() or {})
    
    cursor.execute("SELECT * FROM blacklisted_ips ORDER BY created_at DESC")
    ips = [dict(r) for r in cursor.fetchall()]
    
    conn.close()

    return {
        "settings": sec,
        "blacklisted_ips": ips
    }

@router.post("/security-settings")
def update_security_settings(req: UpdateSecuritySettingsRequest):
    if req.admin_password != "manager123":
        raise HTTPException(status_code=403, detail="Unauthorized SOC Operation: Invalid administrative password.")

    conn = get_db_connection()
    cursor = conn.cursor()

    if req.defense_mode is not None:
        cursor.execute("UPDATE soc.security_settings SET defense_mode = ?", (req.defense_mode,))
    if req.risk_threshold_override is not None:
        cursor.execute("UPDATE soc.security_settings SET risk_threshold_override = ?", (req.risk_threshold_override,))
    if req.auto_block_suspicious_ip is not None:
        cursor.execute("UPDATE soc.security_settings SET auto_block_suspicious_ip = ?", (req.auto_block_suspicious_ip,))

    conn.commit()

    cursor.execute('''
        INSERT INTO soc.audit_events (event_type, actor_role, username, details, risk_score)
        VALUES ('MANAGER_SOC_DEFENSE_UPDATED', 'Manager', 'manager', ?, 0.0)
    ''', (f"Updated SOC Defense Posture: Mode={req.defense_mode}, Threshold={req.risk_threshold_override}%",))

    conn.commit()
    conn.close()

    return {"message": "Manager SOC Active Threat Settings updated successfully!"}

@router.post("/blacklist-ip")
def blacklist_ip_address(req: BlacklistIpRequest):
    if req.admin_password != "manager123":
        raise HTTPException(status_code=403, detail="Unauthorized SOC Operation: Invalid administrative password.")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("INSERT INTO soc.blacklisted_ips (ip_address, reason, added_by) VALUES (?, ?, 'Admin Security Officer')",
                       (req.ip_address, req.reason))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="IP address is already blacklisted.")

    cursor.execute('''
        INSERT INTO soc.audit_events (event_type, actor_role, username, details, risk_score)
        VALUES ('IP_BLACK_LISTED', 'Manager', 'manager', ?, 100.0)
    ''', (f"Blacklisted IP Address {req.ip_address}: {req.reason}",))

    conn.commit()
    conn.close()

    return {"message": f"IP address {req.ip_address} successfully blacklisted in SOC system!"}

@router.delete("/blacklist-ip/{ip_address}")
def unblacklist_ip_address(ip_address: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM soc.blacklisted_ips WHERE ip_address = ?", (ip_address,))
    conn.commit()
    conn.close()

    return {"message": f"IP address {ip_address} unblocked."}

@router.post("/repair-blockchain")
def repair_corrupted_blockchain(req: Optional[RepairBlockchainRequest] = None):
    """
    Auto-repair tool for Manager: Recalculates and re-mines any tampered block or broken link
    to restore 100% ledger integrity across the entire chain!
    """
    if not req or not req.admin_password or req.admin_password != "manager123":
        raise HTTPException(status_code=403, detail="Unauthorized SOC Operation: Invalid administrator authorization password.")

    
    result = blockchain_instance.repair_chain()

    # Log to SOC audit
    try:
        conn = get_db_connection()
        conn.execute('''
            INSERT INTO soc.audit_events (event_type, actor_role, username, details, risk_score)
            VALUES ('BLOCKCHAIN_AUTO_REPAIRED', 'Manager', 'manager', ?, 0.0)
        ''', (result.get("message", "Blockchain auto-repair executed"),))
        conn.commit()
        conn.close()
    except Exception:
        pass

    return result


@router.get("/timeline")
def get_attack_timeline():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 
            strftime('%H:%M', timestamp) as time_window,
            SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN status = 'FLAGGED' THEN 1 ELSE 0 END) as flagged,
            SUM(CASE WHEN status = 'BLOCKED' THEN 1 ELSE 0 END) as blocked
        FROM transactions
        GROUP BY time_window
        ORDER BY time_window DESC
        LIMIT 15
    """)
    rows = cursor.fetchall()
    conn.close()

    timeline = [dict(r) for r in reversed(rows)]
    return timeline

@router.get("/transactions")
def get_all_transactions(status: Optional[str] = None, limit: int = 50):
    conn = get_db_connection()
    cursor = conn.cursor()

    if status and status.upper() != "ALL":
        cursor.execute("""
            SELECT * FROM transactions 
            WHERE status = ? 
            ORDER BY id DESC LIMIT ?
        """, (status.upper(), limit))
    else:
        cursor.execute("""
            SELECT * FROM transactions 
            ORDER BY id DESC LIMIT ?
        """, (limit,))

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

@router.get("/export-report")
def export_csv_report():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, tx_hash, card_number, merchant, amount, status, risk_score, attack_type, timestamp, ip_address, location, block_index FROM transactions ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["ID", "Transaction Hash", "Card Number", "Merchant", "Amount ($)", "Status", "Risk Score (%)", "Attack Type", "Timestamp", "IP Address", "Location", "Blockchain Block #"])
    
    for r in rows:
        writer.writerow([
            r['id'], r['tx_hash'], r['card_number'], r['merchant'], r['amount'],
            r['status'], r['risk_score'], r['attack_type'], r['timestamp'],
            r['ip_address'], r['location'], r['block_index']
        ])

    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=Blockchain_Fraud_Audit_Report.csv"
    return response

class CardApprovalRequest(BaseModel):
    admin_password: Optional[str] = None

@router.get("/card-requests")
def get_pending_card_applications():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT cr.id, cr.user_id, cr.holder_name, cr.card_type, cr.requested_limit, cr.status, cr.created_at, u.username
        FROM card_requests cr
        LEFT JOIN users u ON cr.user_id = u.id
        ORDER BY cr.id DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.post("/card-requests/{request_id}/approve")
def approve_card_application(request_id: int, req: CardApprovalRequest):
    if req.admin_password != "manager123":
        raise HTTPException(status_code=403, detail="Unauthorized SOC Operation: Invalid administrative password to approve credit card.")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM card_requests WHERE id = ?", (request_id,))
    app_row = cursor.fetchone()
    if not app_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Card application request not found.")

    if app_row['status'] == 'APPROVED':
        conn.close()
        raise HTTPException(status_code=400, detail="Card application is already approved.")

    import random
    prefix = "4242" if "Visa" in app_row['card_type'] else "5500"
    rand_suffix = f"{random.randint(1000,9999)}-{random.randint(1000,9999)}-{random.randint(1000,9999)}"
    card_num = f"{prefix}-{rand_suffix}"
    cvv = f"{random.randint(100,999)}"
    expiry = "11/30"

    cursor.execute('''
        INSERT INTO cards (card_number, user_id, holder_name, expiry, cvv, balance, home_country, home_ip, card_locked, geofence_country, daily_limit, mfa_required, block_micro_tx)
        VALUES (?, ?, ?, ?, ?, ?, 'US', '192.168.1.100', 0, 'US', ?, 0, 0)
    ''', (card_num, app_row['user_id'], app_row['holder_name'], expiry, cvv, app_row['requested_limit'], app_row['requested_limit']))

    cursor.execute('''
        UPDATE card_requests
        SET status = 'APPROVED', approved_by = 'Admin Security Officer', card_number = ?
        WHERE id = ?
    ''', (card_num, request_id))

    cursor.execute('''
        INSERT INTO soc.audit_events (event_type, actor_role, username, details, risk_score)
        VALUES ('CARD_APPROVED_AND_ISSUED', 'Manager', 'manager', ?, 0.0)
    ''', (f"Approved card application #{request_id} for {app_row['holder_name']}. New {app_row['card_type']} issued: {card_num} (${app_row['requested_limit']:,.2f} limit).",))

    conn.commit()
    conn.close()

    return {
        "message": f"Card application #{request_id} approved! New {app_row['card_type']} {card_num} successfully issued to {app_row['holder_name']}.",
        "card_number": card_num,
        "status": "APPROVED"
    }

@router.post("/card-requests/{request_id}/reject")
def reject_card_application(request_id: int, req: CardApprovalRequest):
    if req.admin_password != "manager123":
        raise HTTPException(status_code=403, detail="Unauthorized SOC Operation: Invalid administrative password.")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE card_requests SET status = 'REJECTED', approved_by = 'Admin Security Officer' WHERE id = ?", (request_id,))
    conn.commit()
    conn.close()

    return {"message": f"Card application #{request_id} declined.", "status": "REJECTED"}

# =========================================================================
# SOC INCIDENT FORENSICS, REVERSE TRACEBACK & ASSET RECOVERY
# =========================================================================

class AdminActionRequest(BaseModel):
    admin_password: Optional[str] = None

@router.get("/disputes")
def get_all_fraud_disputes():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT d.*, t.risk_score, t.attack_type, t.block_index, t.timestamp as tx_timestamp
        FROM soc.fraud_disputes d
        LEFT JOIN soc.transactions t ON d.tx_hash = t.tx_hash
        ORDER BY d.id DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.post("/disputes/{dispute_id}/traceback")
def execute_hacker_traceback(dispute_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM soc.fraud_disputes WHERE id = ?", (dispute_id,))
    dispute = cursor.fetchone()
    if not dispute:
        conn.close()
        raise HTTPException(status_code=404, detail="Fraud dispute incident not found.")

    ip = dispute['traceback_ip'] or "185.220.101.4"
    country = dispute['traceback_country'] or "RU"

    # Deep Forensic Attribution Simulation
    if "185.220." in ip:
        asn = "AS49505 Adman Media Ltd (Tor Exit Node Cluster / Darknet Relay)"
        threat_actor = "UNC2452 - Advanced Persistent Threat (APT) Financially Motivated Group"
        is_proxy = True
    elif "198.51." in ip or "194.26." in ip:
        asn = "AS13335 Cloudflare / Multi-Homed Proxy Node"
        threat_actor = "Adversary Micro-Testing Botnet / Automated Script Harness"
        is_proxy = True
    else:
        asn = "AS9009 M247 Ltd Dedicated Hosting Infrastructure"
        threat_actor = "Uncategorized Commercial Proxy Threat Actor"
        is_proxy = False

    forensic_summary = f"[ATTRIBUTION CONFIRMED] Origin IP {ip} identified via {asn}. Geolocation: {country}. Threat Group: {threat_actor}. Proxy/Anonymizer: {'YES' if is_proxy else 'NO'}."

    cursor.execute("""
        UPDATE soc.fraud_disputes
        SET status = 'INVESTIGATING', traceback_asn = ?, resolution_notes = ?
        WHERE id = ?
    """, (asn, forensic_summary, dispute_id))

    cursor.execute("""
        INSERT INTO soc.audit_events (event_type, actor_role, username, details, risk_score)
        VALUES ('REVERSE_TRACEBACK_EXECUTED', 'Manager', 'manager', ?, 95.0)
    """, (f"Executed reverse forensic traceback on Incident #{dispute_id} (IP: {ip}, ASN: {asn}).",))

    conn.commit()
    conn.close()

    return {
        "message": "Reverse forensic attribution completed successfully.",
        "dispute_id": dispute_id,
        "traceback_ip": ip,
        "traceback_country": country,
        "traceback_asn": asn,
        "threat_actor": threat_actor,
        "is_proxy_or_tor": is_proxy,
        "forensic_summary": forensic_summary,
        "status": "INVESTIGATING"
    }

@router.post("/disputes/{dispute_id}/countermeasure")
def deploy_active_countermeasure(dispute_id: int, req: AdminActionRequest):
    if req.admin_password != "manager123":
        raise HTTPException(status_code=403, detail="Unauthorized SOC Operation: Administrator password required to deploy active countermeasures.")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM soc.fraud_disputes WHERE id = ?", (dispute_id,))
    dispute = cursor.fetchone()
    if not dispute:
        conn.close()
        raise HTTPException(status_code=404, detail="Fraud dispute incident not found.")

    ip = dispute['traceback_ip'] or "185.220.101.4"

    # 1. Add adversary IP to perimeter blacklist
    cursor.execute("""
        INSERT OR REPLACE INTO soc.blacklisted_ips (ip_address, reason, added_by)
        VALUES (?, ?, 'Admin Security Officer (SOC Active Response)')
    """, (ip, f"Automated Honeytoken Sinkhole: Dispute #{dispute_id}"))

    # 2. Log countermeasure
    log_msg = f"[ACTIVE SINKHOLE ENGAGED] Adversary socket {ip} blacklisted in SOC perimeter firewalls. Poisoned canary tokens injected back into connection channel. Host telemetry quarantined."

    cursor.execute("""
        UPDATE soc.fraud_disputes
        SET countermeasure_log = ?, status = 'SINKHOLED'
        WHERE id = ?
    """, (log_msg, dispute_id))

    cursor.execute("""
        INSERT INTO soc.audit_events (event_type, actor_role, username, details, risk_score)
        VALUES ('ACTIVE_COUNTERMEASURE_DEPLOYED', 'Manager', 'manager', ?, 100.0)
    """, (f"Adversary node {ip} quarantined via active sinkhole for Dispute #{dispute_id}.",))

    conn.commit()
    conn.close()

    return {
        "message": f"Active countermeasure successfully executed against adversary node {ip}!",
        "dispute_id": dispute_id,
        "blacklisted_ip": ip,
        "countermeasure_log": log_msg,
        "status": "SINKHOLED"
    }

@router.post("/disputes/{dispute_id}/recover-funds")
def recover_stolen_funds_to_customer(dispute_id: int, req: AdminActionRequest):
    import hashlib

    if req.admin_password != "manager123":
        raise HTTPException(status_code=403, detail="Unauthorized SOC Operation: Administrator authorization password required to execute financial asset recovery.")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM soc.fraud_disputes WHERE id = ?", (dispute_id,))
    dispute = cursor.fetchone()
    if not dispute:
        conn.close()
        raise HTTPException(status_code=404, detail="Fraud dispute incident not found.")

    if dispute['status'] == 'FUNDS_RECOVERED':
        conn.close()
        raise HTTPException(status_code=400, detail="Financial recovery has already been completed for this dispute.")

    card_number = dispute['card_number']
    amount = float(dispute['amount'])
    customer_name = dispute['customer_name']

    # 1. Restore balance in bank_core.db
    cursor.execute("UPDATE cards SET balance = balance + ? WHERE card_number = ?", (amount, card_number))
    cursor.execute("SELECT balance FROM cards WHERE card_number = ?", (card_number,))
    new_balance = cursor.fetchone()['balance']

    # 2. Mine a Proof-of-Work Compensating Reversal Block into blockchain_ledger.db
    reversal_tx = {
        "tx_hash": f"0xREFUND_{hashlib.sha256(f'{dispute_id}:{card_number}:{time.time()}'.encode()).hexdigest()[:32]}",
        "card_number": card_number,
        "merchant": f"REFUND REVERSAL: {dispute['merchant']}",
        "amount": amount,
        "status": "RECOVERED",
        "risk_score": 0.0,
        "attack_type": "Compensating Ledger Refund",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }

    new_block, new_block_index = blockchain_instance.add_transaction_block(reversal_tx)

    # 3. Update dispute record
    res_notes = f"[RECOVERY RESOLVED] Stolen amount (${amount:,.2f}) fully restored to customer account. Proof-of-Work compensating refund block #{new_block_index} mined into blockchain ledger."
    cursor.execute("""
        UPDATE soc.fraud_disputes
        SET status = 'FUNDS_RECOVERED',
            recovered_amount = ?,
            reversal_block_index = ?,
            reversal_tx_hash = ?,
            resolved_at = CURRENT_TIMESTAMP,
            resolution_notes = ?
        WHERE id = ?
    """, (amount, new_block_index, reversal_tx['tx_hash'], res_notes, dispute_id))

    # 4. Log audit event
    cursor.execute("""
        INSERT INTO soc.audit_events (event_type, actor_role, username, details, risk_score, block_index)
        VALUES ('ASSET_RECOVERY_COMPENSATION', 'Manager', 'manager', ?, 0.0, ?)
    """, (f"Restored ${amount:,.2f} to {customer_name} ({card_number}). Mined compensating reversal Block #{new_block_index}.", new_block_index))

    conn.commit()
    conn.close()

    return {
        "message": f"Asset Recovery Complete! Restored ${amount:,.2f} USD to cardholder {customer_name}. Mined Proof-of-Work Compensating Reversal Block #{new_block_index}.",
        "dispute_id": dispute_id,
        "recovered_amount": amount,
        "new_card_balance": new_balance,
        "reversal_block_index": new_block_index,
        "reversal_tx_hash": reversal_tx['tx_hash'],
        "status": "FUNDS_RECOVERED"
    }

