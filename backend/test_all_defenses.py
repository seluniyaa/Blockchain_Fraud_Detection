import urllib.request
import json

def test_api(url, data=None):
    payload_bytes = json.dumps(data).encode() if data is not None else None
    headers = {'Content-Type': 'application/json'} if data is not None else {}
    req = urllib.request.Request(url, data=payload_bytes, headers=headers)
    res = urllib.request.urlopen(req)
    return json.loads(res.read().decode())

print("==================================================")
print("=== DUAL-SIDE PREBUILT DEFENSE SYSTEM VERIFICATION ===")
print("==================================================")

# 1. Customer Card Freeze Defense
test_api('http://127.0.0.1:8000/api/customer/card-security', {'card_number': '4532-8901-2345-6789', 'card_locked': 1})
r1 = test_api('http://127.0.0.1:8000/api/customer/pay', {'card_number': '4532-8901-2345-6789', 'merchant': 'Apple Store', 'amount': 150.0, 'location': 'US'})
print(f"1. Customer Card Freeze Defense: [{r1['status']}] (Risk: {r1['risk_score']}%) -> XAI: {r1['xai_insights'][0]['description']}")

# 2. Customer Geofencing Defense
test_api('http://127.0.0.1:8000/api/customer/card-security', {'card_number': '4532-8901-2345-6789', 'card_locked': 0, 'geofence_country': 'US'})
r2 = test_api('http://127.0.0.1:8000/api/customer/pay', {'card_number': '4532-8901-2345-6789', 'merchant': 'London Boutique', 'amount': 250.0, 'location': 'UK'})
print(f"2. Customer Geofence Lock Defense: [{r2['status']}] (Risk: {r2['risk_score']}%) -> XAI: {r2['xai_insights'][0]['description']}")

# 3. Customer Daily Spending Limit Cap Defense
test_api('http://127.0.0.1:8000/api/customer/card-security', {'card_number': '4532-8901-2345-6789', 'daily_limit': 500.0})
r3 = test_api('http://127.0.0.1:8000/api/customer/pay', {'card_number': '4532-8901-2345-6789', 'merchant': 'Luxury Electronics', 'amount': 1800.0, 'location': 'US'})
print(f"3. Customer Spending Cap Defense: [{r3['status']}] (Risk: {r3['risk_score']}%) -> XAI: {r3['xai_insights'][0]['description']}")

# 4. Customer Micro-Transaction Botnet Lock
test_api('http://127.0.0.1:8000/api/customer/card-security', {'card_number': '4532-8901-2345-6789', 'daily_limit': 3500.0, 'block_micro_tx': 1})
r4 = test_api('http://127.0.0.1:8000/api/customer/pay', {'card_number': '4532-8901-2345-6789', 'merchant': 'Botnet Probe', 'amount': 1.25, 'location': 'US'})
print(f"4. Customer Micro-Lock Defense: [{r4['status']}] (Risk: {r4['risk_score']}%) -> XAI: {r4['xai_insights'][0]['description']}")

# Reset card settings back to clean state
test_api('http://127.0.0.1:8000/api/customer/card-security', {'card_number': '4532-8901-2345-6789', 'card_locked': 0, 'geofence_country': 'US', 'daily_limit': 3500.0, 'block_micro_tx': 0})

# 5. Manager SOC IP Blacklist Defense
try:
    test_api('http://127.0.0.1:8000/api/manager/blacklist-ip', {'ip_address': '185.220.101.44', 'reason': 'Known Tor Exit Node'})
except: pass

r5 = test_api('http://127.0.0.1:8000/api/attacker/custom-payload', {'card_number': '4532-8901-2345-6789', 'merchant': 'Crypto Exchange', 'amount': 200.0, 'location': 'US', 'ip_address': '185.220.101.44', 'attack_type': 'Blacklisted IP Attack'})
print(f"5. Manager IP Blacklist Defense: [{r5['status']}] (Risk: {r5['risk_score']}%) -> XAI: {r5['xai_insights'][0]['description']}")

# 6. Manager SOC Emergency Lockdown Mode
test_api('http://127.0.0.1:8000/api/manager/security-settings', {'defense_mode': 'EMERGENCY_LOCKDOWN', 'risk_threshold_override': 40.0})
r6 = test_api('http://127.0.0.1:8000/api/customer/pay', {'card_number': '4532-8901-2345-6789', 'merchant': 'Foreign Shopping', 'amount': 250.0, 'location': 'UK'})
print(f"6. Manager Emergency Lockdown: [{r6['status']}] (Risk: {r6['risk_score']}%) -> XAI: {r6['xai_insights'][0]['description']}")

# Reset manager settings back to standard
test_api('http://127.0.0.1:8000/api/manager/security-settings', {'defense_mode': 'STANDARD', 'risk_threshold_override': 70.0})

# 7. Blockchain Tamper & Auto-Repair Engine
tamper_res = test_api('http://127.0.0.1:8000/api/blockchain/tamper-test', {'block_index': 1, 'tampered_amount': 99999.99})
v_before = test_api('http://127.0.0.1:8000/api/blockchain/verify')
print(f"7a. Blockchain Tamper Test: Valid={v_before['is_valid']} -> {v_before['reason']}")

repair_res = test_api('http://127.0.0.1:8000/api/manager/repair-blockchain', {})
v_after = test_api('http://127.0.0.1:8000/api/blockchain/verify')
print(f"7b. Manager Auto-Repair Result: Valid={v_after['is_valid']} -> {repair_res['message']}")

print("==================================================")
print("=== DUAL-SIDE PREBUILT DEFENSE SYSTEM VERIFIED ===")
print("==================================================")
