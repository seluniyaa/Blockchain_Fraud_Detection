import os
import pickle
import numpy as np
import pandas as pd
import sqlite3
import hashlib
import time
import random
from typing import Dict, Any, Tuple, List

from app.config import MODEL_PATH, TX_SIGNATURE_SALT, LOW_RISK_THRESHOLD, HIGH_RISK_THRESHOLD
from app.database import get_db_connection

class FraudMLEngine:
    def __init__(self):
        self.model = None
        self.anomaly_detector = None
        self.feature_names = [
            "amount", "amount_zscore", "velocity_1m", "velocity_1h",
            "country_mismatch", "time_diff_sec", "is_small_test_amount",
            "signature_valid", "nonce_replayed"
        ]
        self.load_or_create_model()

    def get_db_connection(self):
        return get_db_connection()

    def load_or_create_model(self):
        if os.path.exists(MODEL_PATH):
            try:
                with open(MODEL_PATH, "rb") as f:
                    data = pickle.load(f)
                    self.model = data.get("model")
                    self.anomaly_detector = data.get("anomaly_detector")
                return
            except Exception as e:
                print(f"Error loading model pkl: {e}. Rebuilding model...")

        self.train_default_model()

    def train_default_model(self):
        from sklearn.ensemble import RandomForestClassifier, IsolationForest
        
        np.random.seed(42)
        n_samples = 2000
        
        n_legit = int(n_samples * 0.85)
        legit_amount = np.random.exponential(scale=45, size=n_legit) + 5
        legit_zscore = np.random.normal(loc=0, scale=0.8, size=n_legit)
        legit_vel_1m = np.random.poisson(lam=0.2, size=n_legit)
        legit_vel_1h = np.random.poisson(lam=1.1, size=n_legit)
        legit_country_mismatch = np.random.choice([0, 1], p=[0.97, 0.03], size=n_legit)
        legit_time_diff = np.random.exponential(scale=3600, size=n_legit) + 60
        legit_small_test = np.zeros(n_legit)
        legit_sig_valid = np.ones(n_legit)
        legit_replayed = np.zeros(n_legit)
        
        legit_X = np.column_stack([
            legit_amount, legit_zscore, legit_vel_1m, legit_vel_1h,
            legit_country_mismatch, legit_time_diff, legit_small_test,
            legit_sig_valid, legit_replayed
        ])
        legit_y = np.zeros(n_legit)

        n_fraud = n_samples - n_legit
        fraud_amount = np.random.uniform(300, 5000, size=n_fraud)
        fraud_zscore = np.random.normal(loc=3.5, scale=1.2, size=n_fraud)
        fraud_vel_1m = np.random.randint(3, 15, size=n_fraud)
        fraud_vel_1h = np.random.randint(8, 30, size=n_fraud)
        fraud_country_mismatch = np.random.choice([0, 1], p=[0.3, 0.7], size=n_fraud)
        fraud_time_diff = np.random.uniform(0, 10, size=n_fraud)
        fraud_small_test = np.random.choice([0, 1], p=[0.4, 0.6], size=n_fraud)
        fraud_sig_valid = np.random.choice([0, 1], p=[0.5, 0.5], size=n_fraud)
        fraud_replayed = np.random.choice([0, 1], p=[0.6, 0.4], size=n_fraud)

        fraud_X = np.column_stack([
            fraud_amount, fraud_zscore, fraud_vel_1m, fraud_vel_1h,
            fraud_country_mismatch, fraud_time_diff, fraud_small_test,
            fraud_sig_valid, fraud_replayed
        ])
        fraud_y = np.ones(n_fraud)

        X = np.vstack([legit_X, fraud_X])
        y = np.hstack([legit_y, fraud_y])

        self.model = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42)
        self.model.fit(X, y)

        self.anomaly_detector = IsolationForest(n_estimators=50, contamination=0.15, random_state=42)
        self.anomaly_detector.fit(X)

        with open(MODEL_PATH, "wb") as f:
            pickle.dump({"model": self.model, "anomaly_detector": self.anomaly_detector}, f)

    def extract_features(self, card_number: str, amount: float, location: str, ip_address: str, 
                         signature: str, nonce: str, raw_payload: Dict[str, Any]) -> Tuple[Dict[str, float], Dict[str, Any]]:
        conn = self.get_db_connection()
        cursor = conn.cursor()

        clean_card = card_number.replace("-", "").replace(" ", "").strip()
        cursor.execute("SELECT * FROM cards WHERE REPLACE(REPLACE(card_number, '-', ''), ' ', '') = ?", (clean_card,))
        card_row = cursor.fetchone()
        
        home_country = card_row['home_country'] if card_row else "US"

        cursor.execute("""
            SELECT amount, strftime('%s', timestamp) as ts_sec, location, nonce, signature
            FROM transactions 
            WHERE card_number = ? 
            ORDER BY id DESC LIMIT 50
        """, (card_number,))
        recent_txs = cursor.fetchall()

        # Manager Security Settings & Blacklist Checks
        cursor.execute("SELECT * FROM security_settings ORDER BY id DESC LIMIT 1")
        sec_row = cursor.fetchone()
        
        cursor.execute("SELECT COUNT(*) FROM blacklisted_ips WHERE ip_address = ?", (ip_address,))
        is_blacklisted = cursor.fetchone()[0] > 0

        conn.close()

        current_time = time.time()
        
        velocity_1m = 0
        velocity_1h = 0
        amounts_list = []
        last_tx_time = None
        replay_detected = False

        for r in recent_txs:
            tx_time = float(r['ts_sec']) if r['ts_sec'] else current_time
            if last_tx_time is None:
                last_tx_time = tx_time
                
            time_diff = current_time - tx_time
            if time_diff <= 60:
                velocity_1m += 1
            if time_diff <= 3600:
                velocity_1h += 1
            amounts_list.append(r['amount'])
            
            if r['nonce'] == nonce or (r['signature'] == signature and len(signature) > 10):
                replay_detected = True

        if amounts_list and len(amounts_list) >= 2:
            mean_amt = np.mean(amounts_list)
            std_amt = np.std(amounts_list) if np.std(amounts_list) > 0 else 10.0
            amount_zscore = float((amount - mean_amt) / std_amt)
        else:
            amount_zscore = 0.5 if amount > 500 else 0.0

        time_diff_sec = float(current_time - last_tx_time) if last_tx_time else 86400.0
        country_mismatch = 1.0 if location.upper() != home_country.upper() else 0.0
        is_small_test = 1.0 if (0.10 <= amount <= 3.00 and velocity_1m >= 2) else 0.0

        expected_sig_str = f"{card_number}:{amount}:{nonce}:{TX_SIGNATURE_SALT}"
        computed_sig = hashlib.sha256(expected_sig_str.encode()).hexdigest()
        
        if signature and signature != "SIMULATED_VALID_SIG":
            signature_valid = 1.0 if signature == computed_sig else 0.0
        else:
            signature_valid = 1.0

        feature_dict = {
            "amount": float(amount),
            "amount_zscore": float(amount_zscore),
            "velocity_1m": float(velocity_1m),
            "velocity_1h": float(velocity_1h),
            "country_mismatch": float(country_mismatch),
            "time_diff_sec": float(time_diff_sec),
            "is_small_test_amount": float(is_small_test),
            "signature_valid": float(signature_valid),
            "nonce_replayed": 1.0 if replay_detected else 0.0
        }

        meta = {
            "card_row": dict(card_row) if card_row else None,
            "sec_row": dict(sec_row) if sec_row else None,
            "is_blacklisted_ip": is_blacklisted,
            "home_country": home_country,
            "current_location": location,
            "replay_detected": replay_detected,
            "signature_valid": signature_valid == 1.0
        }

        return feature_dict, meta

    def predict_fraud_risk(self, feature_dict: Dict[str, float], meta: Dict[str, Any] = None) -> Tuple[float, str, List[Dict[str, Any]]]:
        card_row = meta.get("card_row") if meta else None
        sec_row = meta.get("sec_row") if meta else None
        is_blacklisted_ip = meta.get("is_blacklisted_ip", False) if meta else False

        print("DEBUG PREDICT_FRAUD_RISK meta card_row:", card_row)

        priority = meta.get("priority", "medium").lower() if meta else "medium"
        attack_type = meta.get("attack_type", "Legitimate") if meta else "Legitimate"
        is_attacker = attack_type != "Legitimate"

        # --- 1. GLOBAL PREBUILT DEFENSE CHECKS (APPLIES TO ALL ROLES) ---
        
        # 1a. Manager IP Blacklist Defense
        if is_blacklisted_ip:
            return 100.0, "BLOCKED", [{
                "feature": "Manager SOC Blacklist Defense",
                "risk_impact": "+100%",
                "severity": "CRITICAL",
                "description": "SECURITY OFFICER BLOCK: Request IP address is blacklisted by Manager SOC for previous malicious activity."
            }]

        # 1b. Customer Prebuilt Card Freeze Defense
        if card_row and (card_row.get("card_locked") == 1 or card_row.get("card_locked") == "1"):
            return 100.0, "BLOCKED", [{
                "feature": "Customer Card Lock Defense",
                "risk_impact": "+100%",
                "severity": "CRITICAL",
                "description": "CUSTOMER ACTIVE DEFENSE: Transaction denied. Card has been frozen/locked by the cardholder."
            }]

        # 1c. Hard Cryptographic HMAC Signature Mismatch Override
        if feature_dict.get("signature_valid") == 0.0:
            return 99.8, "BLOCKED", [{
                "feature": "Cryptographic Signature Mismatch",
                "risk_impact": "+99%",
                "severity": "CRITICAL",
                "description": "PAYLOAD TAMPERING: Cryptographic HMAC signature does not match transaction parameters. Altered in transit."
            }]

        # 1d. Hard Cryptographic Nonce Replay Attack Override
        if feature_dict.get("nonce_replayed") == 1.0:
            return 100.0, "BLOCKED", [{
                "feature": "Replay Attack Nonce Collision",
                "risk_impact": "+100%",
                "severity": "CRITICAL",
                "description": "REPLAY ATTACK: Transaction nonce was already recorded on the blockchain ledger. Replay denied."
            }]

        # 1e. Customer Prebuilt Geofencing Defense
        if card_row and card_row.get("geofence_country") and card_row.get("geofence_country") != "ANY":
            allowed_country = card_row.get("geofence_country")
            current_location = meta.get("current_location", "US")
            if current_location.upper() != allowed_country.upper():
                return 99.5, "BLOCKED", [{
                    "feature": "Customer Geofence Defense",
                    "risk_impact": "+99%",
                    "severity": "CRITICAL",
                    "description": f"CUSTOMER GEOFENCE ENFORCED: Payment origin '{current_location}' blocked for card restricted to '{allowed_country}'."
                }]

        # 1f. Customer Prebuilt Daily Spending Cap Defense
        if card_row and card_row.get("daily_limit"):
            daily_cap = float(card_row.get("daily_limit"))
            if feature_dict["amount"] > daily_cap:
                return 98.0, "BLOCKED", [{
                    "feature": "Customer Spending Cap Defense",
                    "risk_impact": "+98%",
                    "severity": "HIGH",
                    "description": f"CUSTOMER SPENDING CAP EXCEEDED: Amount ${feature_dict['amount']} exceeds custom card cap ${daily_cap}."
                }]

        # 1g. Customer Micro-Transaction Botnet Lock Defense
        if card_row and card_row.get("block_micro_tx") == 1 and feature_dict["amount"] <= 3.00:
            return 95.0, "BLOCKED", [{
                "feature": "Micro-Transaction Botnet Lock",
                "risk_impact": "+95%",
                "severity": "HIGH",
                "description": "CUSTOMER MICRO-LOCK: Small payment ($0.10-$3.00) blocked by customer micro-transaction filter."
            }]

        # --- 2. ATTACKER EXPLOIT EVALUATION (AMOUNT CONSTRAINT & VIP SECURITY TIER) ---
        if is_attacker:
            amount = feature_dict["amount"]
            vip_tier = card_row.get("vip_tier", "STANDARD") if card_row else "STANDARD"
            holder_name = card_row.get("holder_name", "Target Account") if card_row else "Target Account"

            # Rule A: High amounts (> $500.00) CANNOT succeed regardless of priority
            if amount > 500.0:
                status = "BLOCKED"
                risk_score = min(99.9, round(92.0 + (amount / 1000.0) * 1.5, 1))
                xai_insights = [{
                    "feature": "High-Value Transaction Anomaly",
                    "risk_impact": "+95%",
                    "severity": "CRITICAL",
                    "description": f"HIGH AMOUNT INTERCEPTION: Siphon of ${amount:,.2f} exceeds stealth cutoff ($500.00). Extreme volume deviation flagged by ML anomaly detector."
                }, {
                    "feature": f"Cardholder Profile ({vip_tier.replace('_', ' ')})",
                    "risk_impact": "+80%",
                    "severity": "HIGH",
                    "description": f"ACCOUNT CONTEXT: Target cardholder {holder_name} is protected under {vip_tier.replace('_', ' ')} policy controls."
                }]
                return risk_score, status, xai_insights

            # Rule B: Mid amounts ($150.00 - $500.00) blocked on VIP accounts, tightly capped on standard
            if 150.0 < amount <= 500.0:
                if vip_tier in ("GOLD_VIP", "PLATINUM_VIP"):
                    status = "BLOCKED"
                    risk_score = 91.5
                    xai_insights = [{
                        "feature": f"VIP Concierge Defense ({vip_tier.replace('_', ' ')})",
                        "risk_impact": "+90%",
                        "severity": "CRITICAL",
                        "description": f"VIP PROTECTION INTERCEPTION: Cardholder {holder_name} has {vip_tier.replace('_', ' ')} status. Unscheduled transactions over $150.00 are strictly intercepted."
                    }]
                    return risk_score, status, xai_insights
                else:
                    # Standard cards have a tiny chance of bypass on mid amounts (~8%)
                    success_threshold = 0.08
                    honeypot_rate = 0.15
            else:
                # Rule C: Low amounts (<= $150.00) have realistic evasion probability scaled by VIP Tier and Priority
                if vip_tier == "PLATINUM_VIP":
                    # Elena Rostova - Private Wealth Ultra-VIP: Zero-tolerance neural concierge
                    if feature_dict.get("country_mismatch") == 1.0:
                        # Instant honeypot traceback on unverified geographic origin
                        return 99.5, "DETECTED", [{
                            "feature": "Ultra-VIP Honeypot Counter-Traceback",
                            "risk_impact": "+100%",
                            "severity": "CRITICAL",
                            "description": f"VIP COUNTER-DETECTION: Elena Rostova (Private Wealth Ultra-VIP) triggered zero-tolerance geofence honeypot. Attacker IP was detected back and automatically blacklisted."
                        }]
                    # Stealth amounts have tiny probability
                    success_threshold = 0.14 if priority == "low" else (0.05 if priority == "medium" else 0.01)
                    honeypot_rate = 0.45
                elif vip_tier == "GOLD_VIP":
                    # Marcus Vance - Executive Gold VIP: Elevated monitoring (+35% defense sensitivity)
                    if amount > 120.0:
                        return 89.0, "BLOCKED", [{
                            "feature": "Executive VIP Velocity Cap",
                            "risk_impact": "+85%",
                            "severity": "HIGH",
                            "description": f"EXECUTIVE THRESHOLD: Marcus Vance (Executive Gold VIP) enforces strict $120.00 ad-hoc transfer cap on unverified merchants."
                        }]
                    success_threshold = 0.38 if priority == "low" else (0.22 if priority == "medium" else 0.08)
                    honeypot_rate = 0.25
                else:
                    # Alice Smith - Standard Retail: Standard heuristic & ML model
                    success_threshold = 0.78 if priority == "low" else (0.45 if priority == "medium" else 0.18)
                    honeypot_rate = 0.12

            # Roll stochastic outcome
            roll = random.random()

            if roll < success_threshold:
                status = "APPROVED"
                risk_score = round(random.uniform(16.0, 42.0), 1)
                xai_insights = [{
                    "feature": f"Low-Amount Stealth Evasion ({priority.capitalize()} Tier)",
                    "risk_impact": f"+{int(risk_score * 0.6)}%",
                    "severity": "LOW" if risk_score < 30 else "MEDIUM",
                    "description": f"EXPLOIT BYPASS SUCCESS: Low-dollar siphon (${amount:.2f}) mimicked routine retail traffic, evading anomaly cutoffs on {holder_name}'s account."
                }, {
                    "feature": f"Target Security Profile: {vip_tier.replace('_', ' ')}",
                    "risk_impact": "+15%",
                    "severity": "LOW",
                    "description": f"VIP TIER: {holder_name} ({vip_tier.replace('_', ' ')}). Lower stealth amounts slipped under anomaly sensitivity thresholds."
                }]
            else:
                sub_roll = random.random()
                if sub_roll < honeypot_rate:
                    status = "DETECTED"
                    risk_score = round(random.uniform(88.0, 99.5), 1)
                    xai_insights = [{
                        "feature": "Bank SOC Honeypot Counter-Detection",
                        "risk_impact": "+100%",
                        "severity": "CRITICAL",
                        "description": f"BANK SOC COUNTER-DETECTION: Exploit payload tripped internal SOC honeypot alarms. Attacker origin was traced back and automatically blacklisted."
                    }, {
                        "feature": f"VIP Security Scrutiny ({vip_tier.replace('_', ' ')})",
                        "risk_impact": "+90%",
                        "severity": "CRITICAL",
                        "description": f"SECURITY SHIELD: {holder_name}'s {vip_tier.replace('_', ' ')} defenses triggered active forensic counter-traceback."
                    }]
                else:
                    status = "BLOCKED"
                    risk_score = round(random.uniform(72.0, 89.0), 1)
                    xai_insights = [{
                        "feature": "Enterprise SOC Defense Wall",
                        "risk_impact": f"+{int(risk_score)}%",
                        "severity": "HIGH",
                        "description": f"DEFENSE INTERCEPTION: {priority.capitalize()}-priority vector against {holder_name} intercepted by multi-layer neural defense."
                    }, {
                        "feature": f"VIP Tier Governance ({vip_tier.replace('_', ' ')})",
                        "risk_impact": "+75%",
                        "severity": "HIGH",
                        "description": f"VIP RULES ENFORCED: Cardholder tier {vip_tier.replace('_', ' ')} applied strict cutoff to incoming payload."
                    }]

            return risk_score, status, xai_insights


        # --- STANDARD ML MODEL PREDICTION (LEGITIMATE TRANSACTIONS) ---
        X_input = np.array([[
            feature_dict["amount"],
            feature_dict["amount_zscore"],
            feature_dict["velocity_1m"],
            feature_dict["velocity_1h"],
            feature_dict["country_mismatch"],
            feature_dict["time_diff_sec"],
            feature_dict["is_small_test_amount"],
            feature_dict["signature_valid"],
            feature_dict["nonce_replayed"]
        ]])

        prob_fraud = float(self.model.predict_proba(X_input)[0][1])
        anomaly_flag = self.anomaly_detector.predict(X_input)[0]

        raw_risk_score = prob_fraud * 100.0
        if anomaly_flag == -1 and raw_risk_score < 50:
            raw_risk_score += 25.0

        risk_score = min(99.9, max(1.0, round(raw_risk_score, 1)))

        # Manager Threshold Override Evaluation
        block_threshold = sec_row.get("risk_threshold_override", HIGH_RISK_THRESHOLD) if sec_row else HIGH_RISK_THRESHOLD
        defense_mode = sec_row.get("defense_mode", "STANDARD") if sec_row else "STANDARD"

        if defense_mode == "EMERGENCY_LOCKDOWN":
            block_threshold = 40.0

        if risk_score >= block_threshold:
            status = "BLOCKED"
        elif risk_score >= LOW_RISK_THRESHOLD:
            status = "FLAGGED"
        else:
            status = "APPROVED"

        # Generate Explainable AI (XAI) Feature Importances
        xai_insights = []

        if defense_mode != "STANDARD":
            xai_insights.append({
                "feature": f"Manager Defense Mode ({defense_mode})",
                "risk_impact": "+20%",
                "severity": "MEDIUM",
                "description": f"SOC SECURITY RULE: Active defense posture '{defense_mode}' evaluating stricter block boundaries."
            })
        
        if feature_dict["velocity_1m"] >= 3:
            xai_insights.append({
                "feature": "High Velocity Window (1 Min)",
                "risk_impact": f"+{min(45, int(feature_dict['velocity_1m'] * 12))}%",
                "severity": "HIGH",
                "description": f"CARD TESTING PATTERN: Detected {int(feature_dict['velocity_1m'])} transactions executed within 60 seconds."
            })
            
        if feature_dict["country_mismatch"] == 1.0:
            xai_insights.append({
                "feature": "Geographic Origin Mismatch",
                "risk_impact": "+35%",
                "severity": "HIGH",
                "description": f"LOCATION ANOMALY: Transaction initiated from unusual location."
            })

        if feature_dict["amount_zscore"] > 2.5:
            xai_insights.append({
                "feature": "Unusual Amount Volume Spike",
                "risk_impact": f"+{min(40, int(feature_dict['amount_zscore'] * 10))}%",
                "severity": "MEDIUM",
                "description": f"ABNORMAL AMOUNT: Payment ${feature_dict['amount']} is {feature_dict['amount_zscore']:.1f} standard deviations above historical average."
            })

        if not xai_insights and status == "APPROVED":
            xai_insights.append({
                "feature": "Standard Behavioral Profile",
                "risk_impact": "0%",
                "severity": "LOW",
                "description": "LEGITIMATE TRANSACTION: Passed customer defenses, manager SOC checks, and ML anomaly classification."
            })

        return risk_score, status, xai_insights

# Global ML Engine Instance
ml_engine_instance = FraudMLEngine()
