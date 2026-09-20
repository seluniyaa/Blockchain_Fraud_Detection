import sqlite3
import json
import os

from app.config import CORE_DB_PATH, BLOCKCHAIN_DB_PATH, SOC_DB_PATH, DB_PATH

def get_core_db():
    conn = sqlite3.connect(CORE_DB_PATH, timeout=30.0)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=30000")
    conn.row_factory = sqlite3.Row
    return conn

def get_blockchain_db():
    conn = sqlite3.connect(BLOCKCHAIN_DB_PATH, timeout=30.0)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=30000")
    conn.row_factory = sqlite3.Row
    return conn

def get_soc_db():
    conn = sqlite3.connect(SOC_DB_PATH, timeout=30.0)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=30000")
    conn.row_factory = sqlite3.Row
    return conn

def get_db_connection():
    """
    Unified multi-database connector with attached schemas:
    - Primary (main): bank_core.db (users, cards)
    - ledger: blockchain_ledger.db (blockchain_blocks)
    - soc: soc_security.db (transactions, security_settings, blacklisted_ips, audit_events)
    """
    conn = sqlite3.connect(CORE_DB_PATH, timeout=30.0)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=30000")
    conn.row_factory = sqlite3.Row

    ledger_abs = os.path.abspath(BLOCKCHAIN_DB_PATH).replace(os.sep, '/')
    soc_abs = os.path.abspath(SOC_DB_PATH).replace(os.sep, '/')

    conn.execute(f"ATTACH DATABASE '{ledger_abs}' AS ledger")
    conn.execute(f"ATTACH DATABASE '{soc_abs}' AS soc")

    # Transparent read views
    conn.execute("CREATE TEMP VIEW IF NOT EXISTS blockchain_blocks AS SELECT * FROM ledger.blockchain_blocks")
    conn.execute("CREATE TEMP VIEW IF NOT EXISTS transactions AS SELECT * FROM soc.transactions")
    conn.execute("CREATE TEMP VIEW IF NOT EXISTS security_settings AS SELECT * FROM soc.security_settings")
    conn.execute("CREATE TEMP VIEW IF NOT EXISTS blacklisted_ips AS SELECT * FROM soc.blacklisted_ips")
    conn.execute("CREATE TEMP VIEW IF NOT EXISTS audit_events AS SELECT * FROM soc.audit_events")
    conn.execute("CREATE TEMP VIEW IF NOT EXISTS fraud_disputes AS SELECT * FROM soc.fraud_disputes")

    return conn

def init_db():
    # 1. Initialize Bank Core Database (users, cards)
    c_core = get_core_db()
    c_core.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            full_name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    c_core.execute('''
        CREATE TABLE IF NOT EXISTS cards (
            card_number TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            holder_name TEXT NOT NULL,
            expiry TEXT NOT NULL,
            cvv TEXT NOT NULL,
            balance REAL NOT NULL DEFAULT 5000.0,
            home_country TEXT NOT NULL DEFAULT 'US',
            home_ip TEXT NOT NULL DEFAULT '192.168.1.100',
            card_locked INTEGER NOT NULL DEFAULT 0,
            geofence_country TEXT NOT NULL DEFAULT 'US',
            daily_limit REAL NOT NULL DEFAULT 3500.0,
            mfa_required INTEGER NOT NULL DEFAULT 0,
            block_micro_tx INTEGER NOT NULL DEFAULT 0,
            vip_tier TEXT NOT NULL DEFAULT 'STANDARD',
            card_type TEXT NOT NULL DEFAULT 'Visa Signature',
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')

    # Safe column migrations for existing databases
    try:
        c_core.execute("ALTER TABLE cards ADD COLUMN vip_tier TEXT NOT NULL DEFAULT 'STANDARD'")
    except sqlite3.OperationalError:
        pass
    try:
        c_core.execute("ALTER TABLE cards ADD COLUMN card_type TEXT NOT NULL DEFAULT 'Visa Signature'")
    except sqlite3.OperationalError:
        pass

    # Ensure existing cards have their respective VIP tiers set
    c_core.execute("UPDATE cards SET vip_tier = 'PLATINUM_VIP', card_type = 'Amex Corporate Platinum' WHERE holder_name LIKE '%Elena%'")
    c_core.execute("UPDATE cards SET vip_tier = 'GOLD_VIP', card_type = 'Mastercard World Elite' WHERE holder_name LIKE '%Marcus%'")
    c_core.execute("UPDATE cards SET vip_tier = 'STANDARD', card_type = 'Visa Signature' WHERE holder_name LIKE '%Alice%' AND vip_tier IS NULL")

    c_core.execute('''
        CREATE TABLE IF NOT EXISTS card_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            holder_name TEXT NOT NULL,
            card_type TEXT NOT NULL DEFAULT 'Visa Signature',
            requested_limit REAL NOT NULL DEFAULT 5000.0,
            status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            approved_by TEXT,
            card_number TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    c_core.commit()
    c_core.close()

    # 2. Initialize Blockchain Ledger Database (blockchain_blocks)
    c_ledger = get_blockchain_db()
    c_ledger.execute('''
        CREATE TABLE IF NOT EXISTS blockchain_blocks (
            block_index INTEGER PRIMARY KEY,
            timestamp REAL NOT NULL,
            previous_hash TEXT NOT NULL,
            current_hash TEXT NOT NULL,
            nonce INTEGER NOT NULL,
            tx_count INTEGER NOT NULL,
            transactions_json TEXT NOT NULL
        )
    ''')
    c_ledger.commit()
    c_ledger.close()

    # 3. Initialize SOC Security Database (transactions, settings, blacklists, audit)
    c_soc = get_soc_db()
    c_soc.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tx_hash TEXT UNIQUE NOT NULL,
            card_number TEXT NOT NULL,
            merchant TEXT NOT NULL,
            amount REAL NOT NULL,
            status TEXT NOT NULL,
            risk_score REAL NOT NULL,
            attack_type TEXT NOT NULL DEFAULT 'Legitimate',
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ip_address TEXT NOT NULL,
            location TEXT NOT NULL,
            nonce TEXT NOT NULL,
            signature TEXT NOT NULL,
            xai_reason TEXT,
            block_index INTEGER DEFAULT -1
        )
    ''')
    c_soc.execute('''
        CREATE TABLE IF NOT EXISTS security_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            defense_mode TEXT NOT NULL DEFAULT 'STANDARD',
            risk_threshold_override REAL NOT NULL DEFAULT 70.0,
            auto_block_suspicious_ip INTEGER NOT NULL DEFAULT 1,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    c_soc.execute('''
        CREATE TABLE IF NOT EXISTS blacklisted_ips (
            ip_address TEXT PRIMARY KEY,
            reason TEXT NOT NULL,
            added_by TEXT NOT NULL DEFAULT 'Manager SOC',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    c_soc.execute('''
        CREATE TABLE IF NOT EXISTS audit_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            event_type TEXT NOT NULL,
            actor_role TEXT NOT NULL,
            username TEXT NOT NULL,
            details TEXT NOT NULL,
            risk_score REAL,
            block_index INTEGER
        )
    ''')
    c_soc.execute('''
        CREATE TABLE IF NOT EXISTS fraud_disputes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tx_hash TEXT NOT NULL,
            card_number TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            customer_name TEXT NOT NULL,
            merchant TEXT NOT NULL,
            amount REAL NOT NULL,
            reason TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'PENDING_INVESTIGATION',
            disputed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            resolved_at TIMESTAMP,
            resolution_notes TEXT,
            recovered_amount REAL DEFAULT 0.0,
            traceback_ip TEXT,
            traceback_asn TEXT,
            traceback_country TEXT,
            countermeasure_log TEXT,
            reversal_block_index INTEGER,
            reversal_tx_hash TEXT
        )
    ''')

    # Defaults for SOC
    cursor = c_soc.cursor()
    cursor.execute("SELECT COUNT(*) FROM security_settings")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO security_settings (defense_mode, risk_threshold_override, auto_block_suspicious_ip) VALUES ('STANDARD', 70.0, 1)")

    cursor.execute("SELECT COUNT(*) FROM blacklisted_ips")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT OR IGNORE INTO blacklisted_ips (ip_address, reason, added_by) VALUES ('185.220.101.4', 'Known Tor Exit Node & Spoofing Source', 'Admin Security Officer')")

    c_soc.commit()
    c_soc.close()
