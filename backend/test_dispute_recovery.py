import urllib.request
import urllib.error
import json
import sqlite3

BASE_URL = "http://127.0.0.1:8000"

def req_api(method, path, body=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    data = json.dumps(body).encode('utf-8') if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))
    except urllib.error.URLError:
        print("\n[ERROR] Could not connect to FastAPI server at http://127.0.0.1:8000")
        print("[TIP] Ensure platform is running (run 'start_project.bat' or 'python -m uvicorn app.main:app') before running tests.")
        raise SystemExit(1)

def test_dispute_and_recovery():
    print("=== TESTING CUSTOMER DISPUTE & SOC FORENSIC RECOVERY ===")

    # 1. Fetch recent transactions for Alice (Card 4532-8901-2345-6789)
    status, txs = req_api("GET", "/api/customer/transactions?card_number=4532-8901-2345-6789")
    assert status == 200 and len(txs) > 0, "Expected transactions for Alice"
    target_tx = txs[0]
    print(f"[PASS] 1. Retrieved Alice's transaction: {target_tx['merchant']} (${target_tx['amount']:.2f}, TX: {target_tx['tx_hash'][:16]}...)")

    # 2. Customer Dispute: Attempt with WRONG password -> Expect 403
    status, bad_res = req_api("POST", "/api/customer/disputes", {
        "user_id": 1,
        "card_number": "4532-8901-2345-6789",
        "tx_hash": target_tx["tx_hash"],
        "merchant": target_tx["merchant"],
        "amount": target_tx["amount"],
        "reason": "Unrecognized foreign purchase",
        "confirmation_password": "wrong_password"
    })
    assert status == 403, f"Expected 403 for wrong password, got {status}"
    print(f"[PASS] 2. Customer Dispute Enforcement: Wrong password rejected with 403 ({bad_res.get('detail')})")

    # 3. Customer Dispute: Submit with CORRECT password (alice123) -> Expect 200
    import time
    test_hash = f"0xTEST_DISPUTE_{int(time.time())}_{target_tx['id']}"
    conn = sqlite3.connect("data/soc_security.db")
    conn.execute("""
        INSERT OR IGNORE INTO transactions 
        (tx_hash, card_number, merchant, amount, status, risk_score, attack_type, ip_address, location, nonce, signature)
        VALUES (?, '4532-8901-2345-6789', 'Luxury Boutique Fraud Siphon', 115.00, 'APPROVED', 75.0, 'Stealth Siphon', '185.220.101.5', 'RU', '9999', 'VALID_SIG')
    """, (test_hash,))
    conn.commit()
    conn.close()

    status, good_res = req_api("POST", "/api/customer/disputes", {
        "user_id": 1,
        "card_number": "4532-8901-2345-6789",
        "tx_hash": test_hash,
        "merchant": "Luxury Boutique Fraud Siphon",
        "amount": 115.00,
        "reason": "Adversary drained $115 from Russian IP while I was asleep",
        "confirmation_password": "alice123"
    })
    assert status == 200, f"Expected 200 for valid dispute, got {status}: {good_res}"
    dispute_id = good_res["dispute_id"]
    print(f"[PASS] 3. Customer Dispute Filed: Incident #{dispute_id} created for $115.00 ({good_res.get('message')})")

    # 4. Customer Retrieves Disputes
    status, customer_disputes = req_api("GET", "/api/customer/disputes/1")
    assert status == 200 and any(d["id"] == dispute_id for d in customer_disputes)
    print(f"[PASS] 4. Customer Dispute Statement: Found dispute in customer statement list.")

    # 5. Manager SOC Retrieves All Disputes
    status, all_disputes = req_api("GET", "/api/manager/disputes")
    assert status == 200 and any(d["id"] == dispute_id for d in all_disputes)
    print(f"[PASS] 5. Manager SOC Queue: Incident #{dispute_id} populated in Manager Incident Queue.")

    # 6. Manager Executes Reverse Forensic Traceback
    status, trace_res = req_api("POST", f"/api/manager/disputes/{dispute_id}/traceback")
    assert status == 200, f"Traceback failed: {trace_res}"
    assert "Tor Exit Node" in trace_res["traceback_asn"] or "Adman" in trace_res["traceback_asn"]
    print(f"[PASS] 6. Reverse Traceback Forensics: Identified hacker ASN: {trace_res['traceback_asn']} (Threat: {trace_res['threat_actor']})")

    # 7. Manager Active Countermeasure Sinkholing
    # 7a. With wrong password -> 403
    status, bad_cm = req_api("POST", f"/api/manager/disputes/{dispute_id}/countermeasure", {"admin_password": "bad"})
    assert status == 403
    print(f"[PASS] 7a. Countermeasure Authorization: Wrong admin password rejected with 403.")

    # 7b. With correct password -> 200
    status, good_cm = req_api("POST", f"/api/manager/disputes/{dispute_id}/countermeasure", {"admin_password": "manager123"})
    assert status == 200
    assert good_cm["status"] == "SINKHOLED"
    print(f"[PASS] 7b. Active Countermeasure Executed: Adversary node {good_cm['blacklisted_ip']} quarantined into SOC Firewall.")

    # 8. Manager Asset Recovery & Reversal Blockchain Minting
    # Fetch initial card balance
    conn_core = sqlite3.connect("data/bank_core.db")
    initial_bal = conn_core.execute("SELECT balance FROM cards WHERE card_number = '4532-8901-2345-6789'").fetchone()[0]
    conn_core.close()

    # 8a. With wrong password -> 403
    status, bad_rec = req_api("POST", f"/api/manager/disputes/{dispute_id}/recover-funds", {"admin_password": "bad"})
    assert status == 403

    # 8b. With correct password -> 200
    status, good_rec = req_api("POST", f"/api/manager/disputes/{dispute_id}/recover-funds", {"admin_password": "manager123"})
    assert status == 200, f"Asset recovery failed: {good_rec}"
    assert good_rec["recovered_amount"] == 115.00
    assert good_rec["reversal_block_index"] > 0
    print(f"[PASS] 8. Asset Recovery Succeeded: Restored $115.00 to Alice. Mined Reversal Block #{good_rec['reversal_block_index']} (TX: {good_rec['reversal_tx_hash'][:16]}...)")

    # Verify balance was actually credited in bank_core.db
    conn_core = sqlite3.connect("data/bank_core.db")
    updated_bal = conn_core.execute("SELECT balance FROM cards WHERE card_number = '4532-8901-2345-6789'").fetchone()[0]
    conn_core.close()
    assert round(updated_bal - initial_bal, 2) == 115.00, f"Expected +115.00 balance increase, got {updated_bal - initial_bal}"
    print(f"[PASS] 8c. Physical Bank Core Verification: Alice balance credited from ${initial_bal:,.2f} -> ${updated_bal:,.2f}.")

    # 9. Verify Blockchain Consensus Integrity
    status, v_res = req_api("GET", "/api/blockchain/verify")
    assert status == 200 and v_res["is_valid"] is True
    print(f"[PASS] 9. Blockchain Integrity Confirmed: 100% INTACT with new Proof-of-Work reversal block.")

    print("\n=== ALL DISPUTE, REVERSE TRACEBACK & ASSET RECOVERY TESTS PASSED! ===")

if __name__ == "__main__":
    test_dispute_and_recovery()
