import urllib.request
import json
import random

BASE_URL = "http://127.0.0.1:8000"

def post_json(endpoint, data):
    req = urllib.request.Request(
        f"{BASE_URL}{endpoint}",
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.URLError:
        print("\n[ERROR] Could not connect to FastAPI server at http://127.0.0.1:8000")
        print("[TIP] Ensure platform is running (run 'start_project.bat' or 'python -m uvicorn app.main:app') before running tests.")
        raise SystemExit(1)

def get_json(endpoint):
    try:
        with urllib.request.urlopen(f"{BASE_URL}{endpoint}") as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.URLError:
        print("\n[ERROR] Could not connect to FastAPI server at http://127.0.0.1:8000")
        print("[TIP] Ensure platform is running (run 'start_project.bat' or 'python -m uvicorn app.main:app') before running tests.")
        raise SystemExit(1)

def test_autorepair_and_randomness():
    print("=== 1. TESTING BLOCKCHAIN AUTO-REPAIR ENDPOINTS ===")
    
    # 1. Tamper Block #1
    t_res = post_json("/api/blockchain/tamper-test", {
        "block_index": 1,
        "tampered_amount": 99999.99
    })
    print("Tamper Triggered:", t_res["message"])
    
    # 2. Check Verify (Should be False)
    v1 = get_json("/api/blockchain/verify")
    assert v1["is_valid"] is False, "Blockchain should be marked INVALID after tamper!"
    print(f"Tamper Alert Confirmed: {v1['reason']}")
    
    # 3. Call Auto-Repair with wrong password (Must fail with 403)
    try:
        post_json("/api/blockchain/repair", {"admin_password": "wrong_password"})
        assert False, "Should have rejected wrong password!"
    except urllib.error.HTTPError as e:
        assert e.code == 403, f"Expected 403 Forbidden, got {e.code}"
        print("Blockchain Auto-Repair correctly rejected wrong password with 403 Forbidden.")

    # 4. Call Auto-Repair via /api/blockchain/repair with correct password
    r1 = post_json("/api/blockchain/repair", {"admin_password": "manager123"})
    assert r1["success"] is True, "Blockchain repair should succeed!"
    print(f"Auto-Repair Result: {r1['message']}")
    
    # 5. Check Verify (Must be True)
    v2 = get_json("/api/blockchain/verify")
    assert v2["is_valid"] is True, "Blockchain must be 100% INTACT after auto-repair!"
    print("Post-Repair Integrity Confirmed: 100% Intact!\n")

    # 6. Tamper again and test /api/manager/repair-blockchain
    post_json("/api/blockchain/tamper-test", {"block_index": 1, "tampered_amount": 88888.88})
    
    # Test manager repair with wrong password
    try:
        post_json("/api/manager/repair-blockchain", {"admin_password": "wrong_password"})
        assert False, "Should have rejected wrong password!"
    except urllib.error.HTTPError as e:
        assert e.code == 403, f"Expected 403 Forbidden, got {e.code}"
        print("Manager Auto-Repair correctly rejected wrong password with 403 Forbidden.")

    r2 = post_json("/api/manager/repair-blockchain", {"admin_password": "manager123"})
    assert r2["success"] is True, "Manager auto-repair should succeed!"
    v3 = get_json("/api/blockchain/verify")
    assert v3["is_valid"] is True, "Blockchain must be 100% INTACT after manager repair!"
    print("Manager Auto-Repair Endpoint Confirmed: 100% Intact!\n")

    print("=== 2. TESTING FULLY RANDOM ATTACK SUCCESS & EVASION ===")
    outcomes = {"APPROVED": 0, "BLOCKED": 0, "DETECTED": 0}
    low_outcomes = {"APPROVED": 0, "BLOCKED": 0, "DETECTED": 0}
    high_outcomes = {"APPROVED": 0, "BLOCKED": 0, "DETECTED": 0}

    test_cards = ["4532-8901-2345-6789", "5412-7511-9842-3104", "4916-2281-5509-1138"]
    
    # 30 trials across various priorities
    for i in range(30):
        priority = random.choice(["low", "medium", "high"])
        rand_ip = f"194.26.{random.randint(10, 250)}.{random.randint(2, 250)}"
        if priority == "low":
            amount = round(random.uniform(15.0, 65.0), 2)
            sig = None
            loc = "US"
        elif priority == "medium":
            amount = round(random.uniform(80.0, 150.0), 2)
            sig = None
            loc = random.choice(["US", "UK"])
        else:
            amount = round(random.uniform(600.0, 5000.0), 2)
            sig = "TAMPERED_INVALID_HMAC_SIG_9999" if random.random() > 0.5 else None
            loc = random.choice(["RU", "CN"])

        res = post_json("/api/attacker/custom-payload", {
            "card_number": random.choice(test_cards),
            "merchant": f"Merchant Test #{i}",
            "amount": amount,
            "location": loc,
            "ip_address": rand_ip,
            "signature": sig,
            "attack_type": "Random Probe Assault",
            "priority": priority
        })
        
        status = res.get("status")
        outcomes[status] = outcomes.get(status, 0) + 1
        if priority == "low":
            low_outcomes[status] = low_outcomes.get(status, 0) + 1
        elif priority == "high":
            high_outcomes[status] = high_outcomes.get(status, 0) + 1

    print(f"Overall Outcomes across 30 random attacks: {outcomes}")
    print(f"Low-Priority Distribution: {low_outcomes}")
    print(f"High-Priority Distribution: {high_outcomes}")

    # Verify that randomness exhibits multiple distinct outcomes
    assert outcomes["APPROVED"] > 0, "Expected at least one APPROVED exploit!"
    assert outcomes["BLOCKED"] > 0, "Expected at least one BLOCKED exploit!"
    assert (outcomes.get("DETECTED", 0) + outcomes.get("BLOCKED", 0)) > 0, "Expected defense interceptions!"
    
    # Verify low priority has higher approval rate than high priority
    low_total = sum(low_outcomes.values())
    high_total = sum(high_outcomes.values())
    low_rate = low_outcomes["APPROVED"] / low_total if low_total > 0 else 0
    high_rate = high_outcomes["APPROVED"] / high_total if high_total > 0 else 0
    print(f"Low Priority Penetration Rate: {low_rate*100:.1f}%")
    print(f"High Priority Penetration Rate: {high_rate*100:.1f}%")
    assert low_rate > high_rate, "Low priority attacks should penetrate easier than high priority!"

    print("\nALL AUTO-REPAIR & RANDOMNESS TESTS PASSED WITH 100% SUCCESS!")

if __name__ == "__main__":
    test_autorepair_and_randomness()
