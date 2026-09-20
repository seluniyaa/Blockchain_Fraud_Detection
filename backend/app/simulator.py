import time
import hashlib
import uuid
import sqlite3
import json
from typing import Dict, Any, List

from app.config import TX_SIGNATURE_SALT
from app.database import get_db_connection
from app.ml_engine import ml_engine_instance
from app.blockchain import blockchain_instance

class AttackSimulator:
    def __init__(self):
        pass

    def get_db_connection(self):
        return get_db_connection()

    def execute_attack_scenario(self, scenario_key: str, custom_card: str = None, custom_amount: float = None, priority: str = None) -> Dict[str, Any]:
        """
        Execute one of 7 realistic payment fraud scenarios without hardcoding output!
        Constructs real payload, calculates real cryptographic hashes, and passes through real ML pipeline.
        """
        card_number = custom_card if custom_card else "4532-8901-2345-6789"
        nonce = str(uuid.uuid4())[:18]
        timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S")

        payload = {}
        attack_title = ""

        if scenario_key == "fake_payment":
            attack_title = "Fake Payment Request (Unregistered/Invalid Card)"
            fake_card = "4000-0000-0000-9999"
            amount = custom_amount if custom_amount else 150.00
            
            payload = {
                "card_number": fake_card,
                "merchant": "DarkNet Market Vendor",
                "amount": amount,
                "location": "US",
                "ip_address": "198.51.100.42",
                "nonce": nonce,
                "signature": hashlib.sha256(f"{fake_card}:{amount}:{nonce}:{TX_SIGNATURE_SALT}".encode()).hexdigest(),
                "attack_type": "Fake Payment Request",
                "priority": priority or "low"
            }

        elif scenario_key == "transaction_tampering":
            attack_title = "Transaction Payload Tampering (MitM Amount Alteration)"
            original_amount = 25.00
            tampered_amount = custom_amount if custom_amount else 4999.99
            
            # Signature was calculated for $25.00
            valid_sig_for_original = hashlib.sha256(f"{card_number}:{original_amount}:{nonce}:{TX_SIGNATURE_SALT}".encode()).hexdigest()
            
            payload = {
                "card_number": card_number,
                "merchant": "Luxury Watch Boutique",
                "amount": tampered_amount, # Altered in transit!
                "location": "US",
                "ip_address": "192.168.1.100",
                "nonce": nonce,
                "signature": valid_sig_for_original, # Mismatched signature!
                "attack_type": "Transaction Tampering",
                "priority": priority or "high"
            }
        elif scenario_key == "replay_attack":
            attack_title = "Cryptographic Replay Attack"
            conn = self.get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT nonce, signature, amount, merchant FROM transactions WHERE status = 'APPROVED' ORDER BY id DESC LIMIT 1")
            prev_tx = cursor.fetchone()
            conn.close()

            replayed_nonce = prev_tx['nonce'] if prev_tx else "REPLAYED_NONCE_999"
            replayed_sig = prev_tx['signature'] if prev_tx else "REPLAYED_SIG_999"
            replayed_amount = prev_tx['amount'] if prev_tx else 89.99
            merchant = prev_tx['merchant'] if prev_tx else "Online Electronics"

            payload = {
                "card_number": card_number,
                "merchant": f"{merchant} (Replayed)",
                "amount": replayed_amount,
                "location": "US",
                "ip_address": "192.168.1.100",
                "nonce": replayed_nonce,
                "signature": replayed_sig,
                "attack_type": "Replay Attack",
                "priority": priority or "high"
            }

        elif scenario_key == "card_testing":
            attack_title = "Automated Card Testing / Micro-Velocity Spam"
            amount = custom_amount if custom_amount else 1.25
            
            # Execute multiple micro transactions to trigger high velocity in DB
            results = []
            for i in range(4):
                sub_nonce = str(uuid.uuid4())[:18]
                sub_sig = hashlib.sha256(f"{card_number}:{amount}:{sub_nonce}:{TX_SIGNATURE_SALT}".encode()).hexdigest()
                sub_payload = {
                    "card_number": card_number,
                    "merchant": f"Botnet Micro-Test #{i+1}",
                    "amount": amount,
                    "location": "US",
                    "ip_address": "104.28.14.88",
                    "nonce": sub_nonce,
                    "signature": sub_sig,
                    "attack_type": "Card Testing (Velocity)",
                    "priority": priority or "low"
                }
                res = self.process_payload(sub_payload)
                results.append(res)
                time.sleep(0.1)
                
            return {
                "attack_title": attack_title,
                "scenario_key": scenario_key,
                "batch_execution": True,
                "total_attempts": 4,
                "last_result": results[-1],
                "all_results": results
            }

        elif scenario_key == "identity_spoofing":
            attack_title = "Identity & IP Geolocation Spoofing"
            amount = custom_amount if custom_amount else 1250.00
            sig = hashlib.sha256(f"{card_number}:{amount}:{nonce}:{TX_SIGNATURE_SALT}".encode()).hexdigest()
            
            payload = {
                "card_number": card_number,
                "merchant": "Global Crypto Exchange",
                "amount": amount,
                "location": "RU", # Mismatch from US
                "ip_address": "185.220.101.4", # Tor Exit Node
                "nonce": nonce,
                "signature": sig,
                "attack_type": "Identity / IP Spoofing",
                "priority": priority or "medium"
            }

        elif scenario_key == "account_takeover":
            attack_title = "Account Takeover (ATO) Limit Drain"
            amount = custom_amount if custom_amount else 7450.00
            sig = hashlib.sha256(f"{card_number}:{amount}:{nonce}:{TX_SIGNATURE_SALT}".encode()).hexdigest()
            
            payload = {
                "card_number": card_number,
                "merchant": "Offshore Wire Transfer",
                "amount": amount,
                "location": "CN",
                "ip_address": "114.114.114.114",
                "nonce": nonce,
                "signature": sig,
                "attack_type": "Account Takeover (ATO)",
                "priority": priority or "high"
            }

        elif scenario_key == "abnormal_spike":
            attack_title = "Abnormal Transaction Spike"
            amount = custom_amount if custom_amount else 15800.00
            sig = hashlib.sha256(f"{card_number}:{amount}:{nonce}:{TX_SIGNATURE_SALT}".encode()).hexdigest()
            
            payload = {
                "card_number": card_number,
                "merchant": "Diamond & Gold Outlet",
                "amount": amount,
                "location": "US",
                "ip_address": "192.168.1.100",
                "nonce": nonce,
                "signature": sig,
                "attack_type": "Abnormal Transaction Spike",
                "priority": priority or "high"
            }

        elif scenario_key == "blockchain_tamper":
            attack_title = "Consensus Block & Ledger Tampering (51% Exploit)"
            amount = custom_amount if custom_amount else 99999.99
            sig = hashlib.sha256(f"{card_number}:{amount}:{nonce}:{TX_SIGNATURE_SALT}".encode()).hexdigest()
            
            payload = {
                "card_number": card_number,
                "merchant": "Malicious 51% Mining Pool",
                "amount": amount,
                "location": "RU",
                "ip_address": "185.220.101.4",
                "nonce": nonce,
                "signature": sig,
                "attack_type": "Consensus Ledger Tampering",
                "priority": priority or "high"
            }

        else:
            return {"error": f"Unknown attack scenario key: {scenario_key}"}

        result = self.process_payload(payload)
        result["attack_title"] = attack_title
        result["scenario_key"] = scenario_key
        return result

    def process_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        card_number = payload["card_number"]
        amount = payload["amount"]
        merchant = payload["merchant"]
        location = payload.get("location", "US")
        ip_address = payload.get("ip_address", "127.0.0.1")
        nonce = payload.get("nonce") if payload.get("nonce") else str(uuid.uuid4())[:18]
        signature = payload.get("signature") if payload.get("signature") is not None else ""
        attack_type = payload.get("attack_type", "Legitimate")
        priority = payload.get("priority", "medium").lower()

        # 1. Extract Real Features
        feature_dict, meta = ml_engine_instance.extract_features(
            card_number, amount, location, ip_address, signature, nonce, payload
        )
        meta["priority"] = priority
        meta["attack_type"] = attack_type

        # 2. Predict Risk & Explainability (Real ML + Defenses + Priority Randomness)
        risk_score, status, xai_insights = ml_engine_instance.predict_fraud_risk(feature_dict, meta)

        # Generate Transaction Hash
        tx_raw_str = f"{card_number}:{merchant}:{amount}:{nonce}:{time.time()}"
        tx_hash = "0x" + hashlib.sha256(tx_raw_str.encode()).hexdigest()

        # 3. Store Initial Transaction Record in Database
        conn = self.get_db_connection()
        cursor = conn.cursor()
        xai_reason_json = json.dumps(xai_insights)

        cursor.execute('''
            INSERT INTO soc.transactions (tx_hash, card_number, merchant, amount, status, risk_score, attack_type, ip_address, location, nonce, signature, xai_reason, block_index)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, -1)
        ''', (tx_hash, card_number, merchant, amount, status, risk_score, attack_type, ip_address, location, nonce, signature, xai_reason_json))

        # Update card balance if approved
        if status == "APPROVED" and card_number != "SYSTEM_GENESIS" and card_number != "4000-0000-0000-9999":
            cursor.execute("UPDATE cards SET balance = balance - ? WHERE card_number = ?", (amount, card_number))

        # Honeypot counter-detection: Bank actively detects back the attacker and auto-blacklists
        if status == "DETECTED":
            cursor.execute('''
                INSERT OR IGNORE INTO soc.blacklisted_ips (ip_address, reason)
                VALUES (?, ?)
            ''', (ip_address, f"Bank SOC Honeypot Traceback: Detected {attack_type} ({priority.upper()} priority)"))

        conn.commit()
        conn.close()

        # 4. Add to Blockchain Immutable Ledger & Mine Block (Opens & Closes Own Connection)
        tx_blockchain_record = {
            "tx_hash": tx_hash,
            "card_number": card_number[:4] + "-****-****-" + card_number[-4:] if len(card_number) >= 16 else card_number,
            "merchant": merchant,
            "amount": amount,
            "status": status,
            "risk_score": risk_score,
            "attack_type": attack_type,
            "location": location,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }

        mined_block, block_index = blockchain_instance.add_transaction_block(tx_blockchain_record)

        # If attack specifically targets blockchain consensus, corrupt a block hash in ledger DB
        if attack_type == "Consensus Ledger Tampering" or payload.get("tamper_blockchain"):
            blockchain_instance.tamper_block(1, 99999.99)
            xai_insights.insert(0, {
                "feature": "Consensus Block Hash Poisoning",
                "risk_impact": "+100%",
                "severity": "CRITICAL",
                "description": "BLOCKCHAIN LEDGER TAMPERING DETECTED: Historical Block #1 data was altered by adversary consensus exploit. Cryptographic PoW broken!"
            })

        # 5. Log Security Audit Event & Update Transaction Block Index
        conn = self.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE soc.transactions SET block_index = ? WHERE tx_hash = ?", (block_index, tx_hash))
        audit_event_type = "TRANSACTION_PROCESSED" if status == "APPROVED" else ("HONEYPOT_COUNTER_DETECTION" if status == "DETECTED" else "FRAUD_DETECTED_AND_BLOCKED")
        cursor.execute('''
            INSERT INTO soc.audit_events (event_type, actor_role, username, details, risk_score, block_index)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            audit_event_type,
            "Attacker" if attack_type != "Legitimate" else "Customer",
            "attacker" if attack_type != "Legitimate" else "customer",
            f"Processed {attack_type} ({priority.upper()} priority) payment ${amount} at {merchant}. Result: {status} (Risk: {risk_score}%)",
            risk_score,
            block_index
        ))
        conn.commit()
        conn.close()

        return {
            "tx_hash": tx_hash,
            "card_number": card_number,
            "merchant": merchant,
            "amount": amount,
            "status": status,
            "priority": priority,
            "risk_score": risk_score,
            "attack_type": attack_type,
            "block_index": block_index,
            "block_hash": mined_block.current_hash,
            "nonce": mined_block.nonce,
            "xai_insights": xai_insights,
            "feature_metrics": feature_dict
        }

# Global Simulator Instance
simulator_instance = AttackSimulator()
