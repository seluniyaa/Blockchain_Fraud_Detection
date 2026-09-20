import os
import sys
import sqlite3
import time
import json
import hashlib
import uuid

# Set path so app imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config import CORE_DB_PATH, BLOCKCHAIN_DB_PATH, SOC_DB_PATH, TX_SIGNATURE_SALT, BLOCKCHAIN_DIFFICULTY
from app.database import init_db, get_core_db, get_blockchain_db, get_soc_db
from app.blockchain import Block

def seed_database():
    print("Initializing fresh 3-tier enterprise database architecture...")
    
    # Remove existing DB files to start completely clean
    for path in [CORE_DB_PATH, BLOCKCHAIN_DB_PATH, SOC_DB_PATH, os.path.join(os.path.dirname(CORE_DB_PATH), "fraud_detection.db")]:
        if os.path.exists(path):
            try:
                os.remove(path)
                print(f"Cleaned {os.path.basename(path)}")
            except Exception as e:
                print(f"Notice: Could not remove {path} ({e})")

    # Initialize all 3 physical databases
    init_db()

    conn_core = get_core_db()
    conn_ledger = get_blockchain_db()
    conn_soc = get_soc_db()

    cur_core = conn_core.cursor()
    cur_ledger = conn_ledger.cursor()
    cur_soc = conn_soc.cursor()

    print("Seeding realistic customers and role accounts into bank_core.db...")

    # 1. Realistic Users (3 distinct customer accounts + attacker + manager)
    users_data = [
        ("alice", "alice123", "customer", "Alice Smith"),
        ("marcus", "marcus123", "customer", "Marcus Vance"),
        ("elena", "elena123", "customer", "Elena Rostova"),
        ("customer", "customer123", "customer", "Alice Smith (Demo Corporate)"),
        ("attacker", "attacker123", "attacker", "Adversary Red-Team Simulator"),
        ("manager", "manager123", "manager", "Admin Security Officer")
    ]

    user_ids = {}
    for u, p, r, n in users_data:
        cur_core.execute("INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)",
                         (u, p, r, n))
        user_ids[u] = cur_core.lastrowid

    # 2. Realistic Credit Cards with Prebuilt Defenses
    cards_data = [
        ("4532-8901-2345-6789", user_ids["alice"], "Alice Smith", "08/29", "882", 14250.0, "US", "192.168.1.100", 0, "US", 5000.0, 0, 0),
        ("5412-7511-9842-3104", user_ids["marcus"], "Marcus Vance", "11/28", "419", 18200.0, "US", "172.56.21.90", 0, "UK", 3000.0, 0, 0),
        ("4916-2281-5509-1138", user_ids["elena"], "Elena Rostova", "04/30", "731", 6800.0, "UK", "81.2.69.142", 0, "UK", 2500.0, 0, 0)
    ]

    for card_no, uid, hname, exp, cvv, bal, country, ip, locked, geo, dlimit, mfa, micro in cards_data:
        cur_core.execute('''
            INSERT INTO cards (card_number, user_id, holder_name, expiry, cvv, balance, home_country, home_ip, card_locked, geofence_country, daily_limit, mfa_required, block_micro_tx)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (card_no, uid, hname, exp, cvv, bal, country, ip, locked, geo, dlimit, mfa, micro))

    conn_core.commit()

    print("Generating pre-built transactions into soc_security.db & mined blocks into blockchain_ledger.db...")

    base_time = time.time() - (3600 * 24 * 3) # 3 days ago

    raw_tx_seeds = [
        # Legitimate Batch 1
        ("4532-8901-2345-6789", "Starbucks Coffee #4920", 14.75, "APPROVED", 12.0, "Legitimate", "US", "192.168.1.100"),
        ("5412-7511-9842-3104", "Amazon Web Services", 249.00, "APPROVED", 15.5, "Legitimate", "US", "172.56.21.90"),
        ("4916-2281-5509-1138", "Tesco Superstore London", 45.30, "APPROVED", 18.0, "Legitimate", "UK", "81.2.69.142"),
        
        # Legitimate Batch 2
        ("4532-8901-2345-6789", "Apple Store Fifth Ave", 1299.00, "APPROVED", 28.5, "Legitimate", "US", "192.168.1.100"),
        ("5412-7511-9842-3104", "Uber Mobility Ride", 28.50, "APPROVED", 14.0, "Legitimate", "US", "172.56.21.90"),
        ("4532-8901-2345-6789", "Whole Foods Market", 92.40, "APPROVED", 16.0, "Legitimate", "US", "192.168.1.100"),
        
        # Fraud Attack 1: Payload Tampering
        ("4532-8901-2345-6789", "Luxury Watch Boutique", 4999.99, "BLOCKED", 99.8, "Transaction Tampering", "US", "192.168.1.100"),
        
        # Legitimate Batch 3
        ("4916-2281-5509-1138", "British Airways Express", 340.00, "APPROVED", 22.0, "Legitimate", "UK", "81.2.69.142"),
        ("5412-7511-9842-3104", "Nordstrom Department Store", 215.80, "APPROVED", 19.0, "Legitimate", "US", "172.56.21.90"),
        
        # Fraud Attack 2: Replay Attack
        ("5412-7511-9842-3104", "Binance Crypto Exchange (Replayed)", 1500.00, "BLOCKED", 100.0, "Replay Attack", "US", "172.56.21.90"),
        
        # Fraud Attack 3: Card Testing Velocity Spam
        ("4532-8901-2345-6789", "Botnet Micro-Test Vendor #1", 1.25, "BLOCKED", 88.5, "Card Testing (Velocity)", "US", "104.28.14.88"),
        ("4532-8901-2345-6789", "Botnet Micro-Test Vendor #2", 1.25, "BLOCKED", 92.0, "Card Testing (Velocity)", "US", "104.28.14.88"),
        ("4532-8901-2345-6789", "Botnet Micro-Test Vendor #3", 1.25, "BLOCKED", 95.2, "Card Testing (Velocity)", "US", "104.28.14.88"),
        
        # Legitimate Batch 4
        ("4532-8901-2345-6789", "Target Superstore", 184.20, "APPROVED", 18.0, "Legitimate", "US", "192.168.1.100"),
        ("5412-7511-9842-3104", "Delta Air Lines Ticket", 580.00, "APPROVED", 25.0, "Legitimate", "US", "172.56.21.90"),
        ("4916-2281-5509-1138", "Sainsbury Local Market", 32.10, "APPROVED", 15.0, "Legitimate", "UK", "81.2.69.142"),
        
        # Fraud Attack 4: Identity & IP Spoofing
        ("4532-8901-2345-6789", "Offshore Digital Exchange", 3450.00, "BLOCKED", 82.0, "Identity / IP Spoofing", "RU", "185.220.101.4"),
        
        # Legitimate Batch 5
        ("5412-7511-9842-3104", "Steam Games Network", 59.99, "APPROVED", 14.0, "Legitimate", "US", "172.56.21.90"),
        ("4532-8901-2345-6789", "Netflix Subscription", 19.99, "APPROVED", 10.0, "Legitimate", "US", "192.168.1.100"),
        
        # Fraud Attack 5: Account Takeover
        ("4916-2281-5509-1138", "Global Wire Transfer Outbound", 9800.00, "BLOCKED", 94.2, "Account Takeover (ATO)", "CN", "114.114.114.114"),
        
        # Fraud Attack 6: Abnormal Volume Spike
        ("4532-8901-2345-6789", "Diamond & Jewelry Emporium", 14500.00, "BLOCKED", 91.0, "Abnormal Transaction Spike", "US", "192.168.1.100"),
        
        # Legitimate Batch 6 (Recent)
        ("4532-8901-2345-6789", "Uber Eats Delivery", 34.50, "APPROVED", 15.0, "Legitimate", "US", "192.168.1.100"),
        ("5412-7511-9842-3104", "Best Buy Electronics", 420.00, "APPROVED", 22.0, "Legitimate", "US", "172.56.21.90"),
        ("4916-2281-5509-1138", "Shell Gas Station", 55.00, "APPROVED", 16.0, "Legitimate", "UK", "81.2.69.142")
    ]

    # Create Genesis Block in blockchain_ledger.db
    genesis_tx = [{
        "tx_hash": "GENESIS_TX_00000000000000000000000000000000",
        "card_number": "SYSTEM_GENESIS",
        "merchant": "PRIVATE_BLOCKCHAIN_NODE_INIT",
        "amount": 0.0,
        "status": "APPROVED",
        "risk_score": 0.0,
        "attack_type": "Genesis Block",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(base_time))
    }]
    
    genesis_block = Block(0, base_time, genesis_tx, "0" * 64)
    genesis_block.mine_block(BLOCKCHAIN_DIFFICULTY)
    
    cur_ledger.execute('''
        INSERT INTO blockchain_blocks (block_index, timestamp, previous_hash, current_hash, nonce, tx_count, transactions_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (genesis_block.index, genesis_block.timestamp, genesis_block.previous_hash,
          genesis_block.current_hash, genesis_block.nonce, len(genesis_tx), json.dumps(genesis_tx)))
    conn_ledger.commit()

    prev_hash = genesis_block.current_hash
    current_time_offset = base_time + 300 # step 5 min

    block_index = 1
    chunk_size = 3
    
    for i in range(0, len(raw_tx_seeds), chunk_size):
        chunk = raw_tx_seeds[i:i + chunk_size]
        block_tx_list = []
        
        for cnum, mer, amt, stat, risk, att_type, loc, ip in chunk:
            current_time_offset += 600 # 10 mins apart
            formatted_time = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(current_time_offset))
            
            nonce_val = str(uuid.uuid4())[:18]
            sig_val = hashlib.sha256(f"{cnum}:{amt}:{nonce_val}:{TX_SIGNATURE_SALT}".encode()).hexdigest()
            if att_type == "Transaction Tampering":
                sig_val = hashlib.sha256(f"{cnum}:25.00:{nonce_val}:{TX_SIGNATURE_SALT}".encode()).hexdigest()

            tx_hash_val = "0x" + hashlib.sha256(f"{cnum}:{mer}:{amt}:{nonce_val}:{formatted_time}".encode()).hexdigest()

            # Generate XAI insights
            xai_insights = []
            if att_type == "Transaction Tampering":
                xai_insights.append({
                    "feature": "Cryptographic HMAC Mismatch",
                    "risk_impact": "+99%",
                    "severity": "CRITICAL",
                    "description": "PAYLOAD TAMPERING: Calculated HMAC signature does not match amount payload in transit."
                })
            elif att_type == "Replay Attack":
                xai_insights.append({
                    "feature": "Replay Nonce Collision",
                    "risk_impact": "+100%",
                    "severity": "CRITICAL",
                    "description": "REPLAY ATTACK: The transaction nonce or hash was already recorded on the ledger."
                })
            elif att_type == "Card Testing (Velocity)":
                xai_insights.append({
                    "feature": "High Velocity Window (1 Min)",
                    "risk_impact": "+45%",
                    "severity": "HIGH",
                    "description": "CARD TESTING PATTERN: Multiple rapid micro-payments executed within seconds."
                })
            elif att_type == "Identity / IP Spoofing":
                xai_insights.append({
                    "feature": "Geographic Origin Mismatch",
                    "risk_impact": "+35%",
                    "severity": "HIGH",
                    "description": "LOCATION ANOMALY: Transaction initiated from RU Tor Exit node while card home is US."
                })
            elif att_type == "Account Takeover (ATO)":
                xai_insights.append({
                    "feature": "Account Limit Ratio Anomaly",
                    "risk_impact": "+45%",
                    "severity": "HIGH",
                    "description": "LIMIT DRAIN: Transfer of $9,800 exceeds 95% of available card balance baseline."
                })
            elif att_type == "Abnormal Transaction Spike":
                xai_insights.append({
                    "feature": "Unusual Amount Volume Spike",
                    "risk_impact": "+40%",
                    "severity": "MEDIUM",
                    "description": "ABNORMAL AMOUNT: Payment $14,500.00 is 4.8 standard deviations above card history average."
                })
            else:
                xai_insights.append({
                    "feature": "Standard Behavioral Profile",
                    "risk_impact": "0%",
                    "severity": "LOW",
                    "description": "LEGITIMATE TRANSACTION: Verified card metrics, location, and normal transaction amount."
                })

            xai_json = json.dumps(xai_insights)

            cur_soc.execute('''
                INSERT INTO transactions (tx_hash, card_number, merchant, amount, status, risk_score, attack_type, timestamp, ip_address, location, nonce, signature, xai_reason, block_index)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (tx_hash_val, cnum, mer, amt, stat, risk, att_type, formatted_time, ip, loc, nonce_val, sig_val, xai_json, block_index))

            # Audit event
            cur_soc.execute('''
                INSERT INTO audit_events (timestamp, event_type, actor_role, username, details, risk_score, block_index)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (formatted_time, "TX_PROCESSED", "Customer" if stat == "APPROVED" else "Attacker",
                  "customer" if stat == "APPROVED" else "attacker",
                  f"{stat} payment of ${amt:.2f} at {mer} ({att_type})", risk, block_index))

            block_tx_list.append({
                "tx_hash": tx_hash_val,
                "card_number": cnum,
                "merchant": mer,
                "amount": amt,
                "status": stat,
                "risk_score": risk,
                "attack_type": att_type,
                "timestamp": formatted_time
            })

        # Mine block in blockchain_ledger.db
        block = Block(block_index, current_time_offset, block_tx_list, prev_hash)
        block.mine_block(BLOCKCHAIN_DIFFICULTY)

        cur_ledger.execute('''
            INSERT INTO blockchain_blocks (block_index, timestamp, previous_hash, current_hash, nonce, tx_count, transactions_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (block.index, block.timestamp, block.previous_hash, block.current_hash, block.nonce, len(block_tx_list), json.dumps(block_tx_list)))
        
        prev_hash = block.current_hash
        block_index += 1

    conn_core.commit()
    conn_ledger.commit()
    conn_soc.commit()

    conn_core.close()
    conn_ledger.close()
    conn_soc.close()

    print(f"Successfully seeded 3 distinct databases:")
    print(f"  -> bank_core.db: 6 users, 3 cards")
    print(f"  -> blockchain_ledger.db: {block_index} mined SHA-256 blocks")
    print(f"  -> soc_security.db: {len(raw_tx_seeds)} transactions & audit logs")

if __name__ == '__main__':
    seed_database()
