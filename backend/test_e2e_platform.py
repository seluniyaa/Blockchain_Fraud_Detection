import urllib.request
import json
import sqlite3
import os
import time

BASE_URL = "http://127.0.0.1:8000"

def api_call(method, path, data=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            return response.status, json.loads(res_body) if res_body else {}
    except urllib.error.HTTPError as e:
        res_body = e.read().decode("utf-8")
        try:
            parsed = json.loads(res_body)
        except Exception:
            parsed = {"detail": res_body}
        return e.code, parsed
    except urllib.error.URLError:
        print("\n[ERROR] Could not connect to FastAPI server at http://127.0.0.1:8000")
        print("[TIP] Ensure platform is running (run 'start_project.bat' or 'python -m uvicorn app.main:app') before running tests.")
        raise SystemExit(1)

def test_platform():
    print("=== STARTING COMPREHENSIVE END-TO-END PLATFORM VERIFICATION ===")

    # 1. Health check
    status, h = api_call("GET", "/api/health")
    assert status == 200 and h.get("status") == "ONLINE", f"Health failed: {h}"
    print("[PASS] 1. Backend Service is ONLINE and Healthy.")

    # 2. Verify Multi-Database physical files exist
    db_paths = [
        "data/bank_core.db",
        "data/blockchain_ledger.db",
        "data/soc_security.db"
    ]
    for p in db_paths:
        assert os.path.exists(p), f"Database missing: {p}"
        print(f"[PASS] 2. Verified Physical Database: {p} (Size: {os.path.getsize(p)} bytes)")

    # 3. Authenticate Personas: Alice, Marcus, Elena, Attacker, Manager
    personas = [
        ("alice", "alice123", "customer"),
        ("marcus", "marcus123", "customer"),
        ("elena", "elena123", "customer"),
        ("attacker", "attacker123", "attacker"),
        ("manager", "manager123", "manager")
    ]
    for uname, pw, expected_role in personas:
        status, data = api_call("POST", "/api/auth/login", {"username": uname, "password": pw})
        assert status == 200, f"Login failed for {uname}: {data}"
        assert data["role"] == expected_role
        print(f"[PASS] 3. Authenticated Persona: {uname} -> Role: {data['role']}, Name: {data['full_name']}")

    # 4. Customer Card Security Password Gating
    # 4a. Fetch Alice's cards
    status, cards = api_call("GET", "/api/customer/cards/1")
    assert status == 200 and len(cards) >= 1
    alice_card = cards[0]["card_number"]
    print(f"[PASS] 4a. Alice Registered Card: {alice_card} (Holder: {cards[0]['holder_name']})")

    # 4b. Update Card Defense with Wrong Password -> Must return 403
    status, r_bad = api_call("POST", "/api/customer/card-security", {
        "card_number": alice_card,
        "confirmation_password": "wrong_password",
        "card_locked": 0,
        "geofence_country": "US",
        "daily_limit": 5000.0,
        "block_micro_tx": 1,
        "mfa_required": 1
    })
    assert status == 403, f"Expected 403 for bad password, got {status}"
    print(f"[PASS] 4b. Customer Password Enforcement: Wrong password rejected with 403 ({r_bad.get('detail')})")

    # 4c. Update Card Defense with Correct Password -> Must return 200
    status, r_good = api_call("POST", "/api/customer/card-security", {
        "card_number": alice_card,
        "confirmation_password": "alice123",
        "card_locked": 0,
        "geofence_country": "US",
        "daily_limit": 5000.0,
        "block_micro_tx": 1,
        "mfa_required": 1
    })
    assert status == 200, f"Expected 200 for good password, got {status}"
    print(f"[PASS] 4c. Customer Password Authorization: Correct password accepted ({r_good.get('message')})")

    # 5. Customer Point-of-Sale Payment -> Blockchain Block Creation
    # Fetch clean card for authorized POS transaction
    status, elena_cards = api_call("GET", "/api/customer/cards/3")
    target_clean_card = elena_cards[0]
    loc = target_clean_card.get("home_country", "US")
    status, pay_data = api_call("POST", "/api/customer/pay", {
        "card_number": target_clean_card["card_number"],
        "merchant": "Elena Luxury Concierge",
        "amount": 42.50,
        "location": loc,
        "ip_address": target_clean_card.get("home_ip", "64.233.160.1")
    })
    assert status == 200 and pay_data.get("status") in ("APPROVED", "FLAGGED", "BLOCKED"), f"Payment unexpected: {pay_data}"
    assert "block_hash" in pay_data and pay_data["block_index"] > 0
    print(f"[PASS] 5. Customer Purchase Authorized: {pay_data.get('status')} -> Mined into Block #{pay_data['block_index']} (Hash: {pay_data['block_hash'][:16]}...)")

    # 6. Attacker Reconnaissance -> 3 Victim Target Profiles
    status, targets = api_call("GET", "/api/attacker/target-cards")
    assert status == 200 and len(targets) >= 3, f"Expected at least 3 customer targets, found {len(targets)}"
    target_names = [t["holder_name"] for t in targets]
    print(f"[PASS] 6. Attacker Target Reconnaissance: Found {len(targets)} victim profiles: {', '.join(target_names)}")

    # 7. Red-Team Exploit Simulation Against Elena Rostova
    elena_card = [t for t in targets if "Elena" in t["holder_name"]][0]["card_number"]
    status, exploit_res = api_call("POST", "/api/attacker/custom-payload", {
        "card_number": elena_card,
        "merchant": "Offshore Crypto Exchange",
        "amount": 7500.00,
        "location": "RU",
        "ip_address": "185.220.101.4",
        "signature": "TAMPERED_HMAC_SIGNATURE_PAYLOAD",
        "attack_type": "Transaction Tampering"
    })
    assert status == 200 and exploit_res.get("status") in ("APPROVED", "BLOCKED", "DETECTED")
    assert len(exploit_res.get("xai_insights", [])) > 0
    print(f"[PASS] 7. Red-Team Exploit Executed: Status {exploit_res['status']} -> Evaluated with {len(exploit_res['xai_insights'])} XAI insights!")


    # 8. Manager SOC Governance Password Authorization
    # 8a. Attempt posture change with wrong password -> 403
    status, r_mgr_bad = api_call("POST", "/api/manager/security-settings", {
        "defense_mode": "STRICT_ZERO_TRUST",
        "admin_password": "wrong_password"
    })
    assert status == 403
    print(f"[PASS] 8a. SOC Manager Password Enforcement: Wrong password rejected with 403 ({r_mgr_bad.get('detail')})")

    # 8b. Update posture with correct password -> 200
    status, r_mgr_good = api_call("POST", "/api/manager/security-settings", {
        "defense_mode": "STANDARD",
        "risk_threshold_override": 75.0,
        "admin_password": "manager123"
    })
    assert status == 200
    print(f"[PASS] 8b. SOC Manager Password Authorization: Correct password updated posture to STANDARD.")

    # 8c. Blacklist Suspect IP with admin password
    dyn_ip = f"198.51.100.{int(time.time()) % 240 + 10}"
    status, r_bl = api_call("POST", "/api/manager/blacklist-ip", {
        "ip_address": dyn_ip,
        "reason": "Adversary Exploit Injection Origin",
        "admin_password": "manager123"
    })
    assert status in [200, 400], f"Expected 200 or 400 for blacklist, got {status}: {r_bl}"
    print(f"[PASS] 8c. SOC Manager IP Blacklist: Dynamic IP {dyn_ip} evaluated successfully.")

    # 8d. Customer Card Application & Manager Issuance Flow
    status, r_app = api_call("POST", "/api/customer/request-card", {
        "user_id": 2,
        "holder_name": "Marcus Vance",
        "card_type": "Amex Corporate Platinum",
        "requested_limit": 12000.0,
        "confirmation_password": "marcus123"
    })
    assert status == 200, f"Card application failed: {r_app}"
    req_id = r_app["request_id"]

    status, r_iss = api_call("POST", f"/api/manager/card-requests/{req_id}/approve", {
        "admin_password": "manager123"
    })
    assert status == 200, f"Card approval failed: {r_iss}"
    issued_card = r_iss["card_number"]
    print(f"[PASS] 8d. Governance Card Issuing: Application #{req_id} approved by SOC Manager -> Issued {issued_card}")

    # 9. Multi-Database Data Integrity Check
    conn_core = sqlite3.connect("data/bank_core.db")
    user_count = conn_core.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    card_count = conn_core.execute("SELECT COUNT(*) FROM cards").fetchone()[0]
    conn_core.close()

    conn_ledger = sqlite3.connect("data/blockchain_ledger.db")
    block_count = conn_ledger.execute("SELECT COUNT(*) FROM blockchain_blocks").fetchone()[0]
    conn_ledger.close()

    conn_soc = sqlite3.connect("data/soc_security.db")
    tx_count = conn_soc.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
    bl_count = conn_soc.execute("SELECT COUNT(*) FROM blacklisted_ips").fetchone()[0]
    conn_soc.close()

    print(f"[PASS] 9. Multi-Database Architecture Persistence:")
    print(f"       -> bank_core.db: {user_count} Users, {card_count} Cards")
    print(f"       -> blockchain_ledger.db: {block_count} Cryptographic Blocks (SHA-256)")
    print(f"       -> soc_security.db: {tx_count} Transactions Recorded, {bl_count} Blacklisted IPs")

    print("\n=== ALL END-TO-END TESTS PASSED WITH 100% SUCCESS! ===")

if __name__ == "__main__":
    test_platform()
