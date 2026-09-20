import urllib.request
import urllib.error
import json
import time

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

def test_governance_card_workflow():
    time.sleep(1)
    
    # 1. Login as Alice
    print("1. Logging in as Alice...")
    status, alice_data = make_req("POST", "/api/auth/login", {"username": "alice", "password": "alice123"})
    assert status == 200, f"Alice login failed: {alice_data}"
    user_id = alice_data["user_id"]
    print(f"   Logged in as {alice_data['full_name']} (User ID: {user_id})")

    # 2. Check initial pending card requests
    status, initial_reqs = make_req("GET", f"/api/customer/card-requests/{user_id}")
    assert status == 200, f"Fetch pending requests failed: {initial_reqs}"
    print(f"2. Initial pending card requests for Alice: {len(initial_reqs)}")

    # 3. Apply for a new card with wrong password
    print("3. Attempting card application with invalid password...")
    status, res = make_req("POST", "/api/customer/request-card", {
        "user_id": user_id,
        "holder_name": "Alice Smith",
        "card_type": "Mastercard World Elite",
        "requested_limit": 8500.0,
        "confirmation_password": "wrongpassword"
    })
    assert status == 403, f"Expected 403 for wrong password, got {status}: {res}"
    print("   Correctly rejected with 403 Forbidden!")

    # 4. Apply for a new card with correct password
    print("4. Applying for new card with correct cardholder password...")
    status, app_res = make_req("POST", "/api/customer/request-card", {
        "user_id": user_id,
        "holder_name": "Alice Smith",
        "card_type": "Mastercard World Elite",
        "requested_limit": 8500.0,
        "confirmation_password": "alice123"
    })
    assert status == 200, f"Application submission failed: {app_res}"
    req_id = app_res["request_id"]
    print(f"   Success! Application #{req_id} submitted for Bank Manager Review.")

    # 5. Manager checks card applications queue
    print("5. Manager fetching applications queue...")
    status, all_reqs = make_req("GET", "/api/manager/card-requests")
    assert status == 200, f"Manager fetch failed: {all_reqs}"
    pending = [q for q in all_reqs if q["id"] == req_id]
    assert len(pending) > 0, f"Request #{req_id} not found in manager queue!"
    print(f"   Manager sees application #{req_id}: {pending[0]['card_type']} for {pending[0]['holder_name']} (${pending[0]['requested_limit']})")

    # 6. Manager tries to approve with wrong password
    print("6. Manager attempting approval with invalid password...")
    status, res = make_req("POST", f"/api/manager/card-requests/{req_id}/approve", {
        "admin_password": "wrong_manager_pass"
    })
    assert status == 403, f"Expected 403, got {status}: {res}"
    print("   Correctly rejected with 403 Forbidden!")

    # 7. Manager approves with correct password manager123
    print("7. Manager approving application with manager123...")
    status, approval_res = make_req("POST", f"/api/manager/card-requests/{req_id}/approve", {
        "admin_password": "manager123"
    })
    assert status == 200, f"Approval failed: {approval_res}"
    new_card_number = approval_res["card_number"]
    print(f"   Success! New card officially issued: {new_card_number}")

    # 8. Customer verifies newly issued card exists in their card accounts
    print("8. Customer checking card accounts...")
    status, cards = make_req("GET", f"/api/customer/cards/{user_id}")
    assert status == 200, f"Customer fetch cards failed: {cards}"
    card_nums = [c["card_number"] for c in cards]
    assert new_card_number in card_nums, f"Newly issued card {new_card_number} not found in customer cards list: {card_nums}"
    print(f"   Verified! Customer account now has {len(cards)} active cards, including {new_card_number}!")

    print("\n==============================================")
    print("ALL GOVERNANCE & CARD WORKFLOW TESTS PASSED!")
    print("==============================================")

if __name__ == "__main__":
    test_governance_card_workflow()
