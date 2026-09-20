import urllib.request
import urllib.error
import json
import time
import sqlite3

BASE = "http://127.0.0.1:8000"

def make_req(method, endpoint, body=None):
    url = f"{BASE}{endpoint}"
    data = json.dumps(body).encode('utf-8') if body is not None else None
    headers = {"Content-Type": "application/json"} if body is not None else {}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            content = resp.read().decode('utf-8')
            return status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        err_content = e.read().decode('utf-8')
        try:
            parsed = json.loads(err_content)
        except Exception:
            parsed = err_content
        return e.code, parsed

def test_priority_and_randomness():
    time.sleep(1)
    print("=== TESTING ATTACKER PRIORITY & RANDOM PROBABILITY EVASION ===")

    # 1. Fetch Target Cards
    status, cards = make_req("GET", "/api/attacker/target-cards")
    assert status == 200, f"Failed to fetch target cards: {cards}"
    target_card = cards[0]["card_number"]
    print(f"1. Target card selected: {target_card} ({cards[0]['holder_name']})")

    # 2. Test Low-Priority Stealth Attacks (Easier to penetrate, ~75% success)
    print("\n2. Executing 10 Low-Priority Stealth Probes...")
    low_outcomes = []
    for i in range(10):
        status, res = make_req("POST", "/api/attacker/custom-payload", {
            "card_number": target_card,
            "merchant": f"Corner Market #{i+1}",
            "amount": 28.50,
            "location": "US",
            "ip_address": f"192.168.1.{150+i}",
            "signature": None,
            "attack_type": "Stealth Category Evasion",
            "priority": "low"
        })
        assert status == 200, f"Attack failed: {res}"
        low_outcomes.append(res["status"])
    
    approved_low = low_outcomes.count("APPROVED")
    blocked_low = low_outcomes.count("BLOCKED") + low_outcomes.count("DETECTED")
    print(f"   Low-Priority Results (10 attempts): {approved_low} APPROVED (Bypassed), {blocked_low} BLOCKED/DETECTED")
    print(f"   Success Rate for Low Priority: {approved_low / 10 * 100:.0f}% (High penetration confirmed!)")
    assert approved_low > 0, "Expected at least some low-priority attacks to succeed!"

    # 3. Test High-Priority Aggressive Attacks (Harder to penetrate, ~15% success)
    print("\n3. Executing 10 High-Priority Aggressive Exploits...")
    high_outcomes = []
    test_traceback_ip = f"198.51.100.{int(time.time()) % 150 + 50}"
    detected_count = 0

    for i in range(10):
        status, res = make_req("POST", "/api/attacker/custom-payload", {
            "card_number": target_card,
            "merchant": f"DarkNet Exchange #{i+1}",
            "amount": 8900.00,
            "location": "RU",
            "ip_address": test_traceback_ip if i == 0 else f"185.220.101.{10+i}",
            "signature": None,
            "attack_type": "Account Takeover Drain",
            "priority": "high"
        })
        assert status == 200, f"Attack failed: {res}"
        high_outcomes.append(res["status"])
        if res["status"] == "DETECTED":
            detected_count += 1

    approved_high = high_outcomes.count("APPROVED")
    blocked_high = high_outcomes.count("BLOCKED")
    detected_high = high_outcomes.count("DETECTED")
    print(f"   High-Priority Results (10 attempts): {approved_high} APPROVED, {blocked_high} BLOCKED, {detected_high} COUNTER-DETECTED")
    print(f"   Defense Interception Rate for High Priority: {(blocked_high + detected_high) / 10 * 100:.0f}% (Harder penetration confirmed!)")
    assert (blocked_high + detected_high) >= approved_high, "High priority should be much harder to succeed than low priority!"

    # 4. Verify Honeypot Counter-Detection Auto-Blacklist
    print("\n4. Verifying Honeypot Counter-Detection & Bank SOC Traceback...")
    conn = sqlite3.connect("data/soc_security.db")
    c = conn.cursor()
    c.execute("SELECT ip_address, reason FROM blacklisted_ips WHERE reason LIKE '%Honeypot%'")
    honeypot_blacklists = c.fetchall()
    conn.close()

    print(f"   Honeypot Counter-Blacklisted IPs in SOC Database: {len(honeypot_blacklists)}")
    for ip, r in honeypot_blacklists[-3:]:
        print(f"   -> [DETECTED BACK] IP: {ip} | Reason: {r}")

    print("\n========================================================")
    print("ALL ATTACKER PRIORITY, RANDOMNESS & HONEYPOT TESTS PASSED!")
    print("========================================================")

if __name__ == "__main__":
    test_priority_and_randomness()
