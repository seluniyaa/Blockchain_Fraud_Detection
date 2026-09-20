import os

# Application Settings
SECRET_KEY = "blockchain-credit-card-fraud-detection-secret-key-2026"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

# Multi-Database Paths (Real-world Enterprise Tier Architecture)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

CORE_DB_PATH = os.path.join(DATA_DIR, "bank_core.db")
BLOCKCHAIN_DB_PATH = os.path.join(DATA_DIR, "blockchain_ledger.db")
SOC_DB_PATH = os.path.join(DATA_DIR, "soc_security.db")
DB_PATH = CORE_DB_PATH # Default / unified entry point

MODEL_PATH = os.path.join(DATA_DIR, "fraud_model.pkl")

# ML Risk Thresholds
LOW_RISK_THRESHOLD = 30.0     # Scores < 30 -> Approved
HIGH_RISK_THRESHOLD = 70.0    # Scores >= 70 -> Blocked (30-70 -> Flagged for review/verification)

# Cryptographic Salt for Transaction Payload Signatures
TX_SIGNATURE_SALT = "secure_banking_hmac_secret_key_v1"

# Blockchain Configuration
BLOCKCHAIN_DIFFICULTY = 2     # Number of leading zeros for SHA-256 Proof-of-Work
BLOCKCHAIN_MINER_REWARD = 0.0 # Private audit chain
