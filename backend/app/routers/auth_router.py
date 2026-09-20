from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import sqlite3

from app.config import CORE_DB_PATH

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    username: str
    password: str
    quick_role: str = None  # Quick role login option ('alice', 'marcus', 'elena', 'customer', 'attacker', 'manager')

class UserResponse(BaseModel):
    user_id: int
    username: str
    role: str
    full_name: str
    access_token: str

def get_db_connection():
    conn = sqlite3.connect(CORE_DB_PATH, timeout=30.0)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=30000")
    conn.row_factory = sqlite3.Row
    return conn

@router.post("/login", response_model=UserResponse)
def login(req: LoginRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    if req.quick_role:
        cursor.execute("SELECT * FROM users WHERE username = ? OR role = ? LIMIT 1", (req.quick_role, req.quick_role))
        user = cursor.fetchone()
    else:
        cursor.execute("SELECT * FROM users WHERE username = ?", (req.username,))
        user = cursor.fetchone()

        if not user or user['password_hash'] != req.password:
            conn.close()
            raise HTTPException(status_code=401, detail="Invalid username or password credentials")

    conn.close()

    fake_jwt = f"jwt-bearer-token-{user['role']}-{user['id']}-2026"

    return UserResponse(
        user_id=user['id'],
        username=user['username'],
        role=user['role'],
        full_name=user['full_name'],
        access_token=fake_jwt
    )

@router.get("/users")
def get_all_users():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, role, full_name FROM users")
    users = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return users
