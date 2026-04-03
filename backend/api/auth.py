from fastapi import APIRouter, Depends, HTTPException, status, Query, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, List
import jwt
import hashlib
import os

from database.database import get_db
from database.models import User
from api.schemas import UserLogin, UserRegister, UserResponse, TokenResponse

router = APIRouter()

_bearer_scheme = HTTPBearer(auto_error=False)


def require_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(
        _bearer_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Dependency that requires a valid JWT Bearer token. Attach to any protected router."""
    token: Optional[str] = None

    if credentials and credentials.credentials:
        token = credentials.credentials

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.username ==
                                 payload.get("username")).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    return user


# Get JWT secret from environment or use default for development
SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours


def hash_password(password: str) -> str:
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verify password against hash"""
    return hash_password(plain_password) == password_hash


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> dict:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
        return {"username": username}
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


@router.post("/auth/register", response_model=UserResponse)
def register(user: UserRegister, db: Session = Depends(get_db)):
    """Register a new user (first user will be admin)"""

    # Check if user already exists
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )

    # First user is admin
    user_count = db.query(User).count()
    role = "admin" if user_count == 0 else "user"

    # Create new user
    new_user = User(
        username=user.username,
        email=user.email,  # Optional email
        password_hash=hash_password(user.password),
        role=role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.post("/auth/login", response_model=TokenResponse)
def login(user: UserLogin, db: Session = Depends(get_db)):
    """Login user and return JWT token"""

    # Find user by username
    db_user = db.query(User).filter(User.username == user.username).first()

    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    if not db_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    # Update last login
    db_user.last_login = datetime.utcnow()
    db.commit()

    # Create access token
    access_token = create_access_token(data={"sub": db_user.username})

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=db_user
    )


@router.get("/auth/me", response_model=UserResponse)
def get_current_user(current_user: User = Depends(require_auth)):
    """Get current authenticated user — validates the Bearer token server-side."""
    return current_user


@router.post("/auth/logout")
def logout():
    """Logout user (token invalidation is handled client-side)"""
    return {"message": "Successfully logged out"}


@router.post("/auth/admin/create-user", response_model=UserResponse)
def admin_create_user(user: UserRegister, token: str = Query(...), db: Session = Depends(get_db)):
    """Admin-only endpoint to create new users"""

    # Verify admin token
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    # Check if user is admin
    admin_user = db.query(User).filter(
        User.username == payload.get("username")).first()
    if not admin_user or admin_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    # Check if user already exists
    existing_user = db.query(User).filter(
        User.username == user.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )

    # Create new user with specified role (default: CRM OPS)
    # Supported roles: admin, CRM OPS, Translation Team, Optimization Team
    valid_roles = ["admin", "CRM OPS", "Translation Team", "Optimization Team"]
    selected_role = user.role if user.role in valid_roles else "CRM OPS"

    new_user = User(
        username=user.username,
        email=user.email,  # Optional email
        password_hash=hash_password(user.password),
        role=selected_role,
        is_active=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.get("/auth/users", response_model=List[UserResponse])
def list_users(token: str = Query(...), db: Session = Depends(get_db)):
    """Admin-only endpoint to list all users"""

    # Verify admin token
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    # Check if user is admin
    admin_user = db.query(User).filter(
        User.username == payload.get("username")).first()
    if not admin_user or admin_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    # Get all users
    users = db.query(User).all()
    return users


@router.delete("/auth/users/{user_id}")
def delete_user(user_id: int, token: str = Query(...), db: Session = Depends(get_db)):
    """Admin-only endpoint to delete a user"""

    # Verify admin token
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    # Check if user is admin
    admin_user = db.query(User).filter(
        User.username == payload.get("username")).first()
    if not admin_user or admin_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    # Prevent deleting yourself
    if admin_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself"
        )

    # Find and delete user
    user_to_delete = db.query(User).filter(User.id == user_id).first()
    if not user_to_delete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    db.delete(user_to_delete)
    db.commit()

    return {"message": f"User {user_to_delete.username} deleted successfully"}


@router.post("/migrate-email-nullable")
async def migrate_email_nullable(db: Session = Depends(get_db)):
    """
    One-time migration endpoint to make email column nullable.
    Can be called by anyone, runs once, then remove this endpoint.
    """
    from sqlalchemy import text

    try:
        # Make email column nullable
        db.execute(text("ALTER TABLE users ALTER COLUMN email DROP NOT NULL;"))
        db.commit()

        return {
            "status": "success",
            "message": "Email column is now nullable. Remove this endpoint from code."
        }
    except Exception as e:
        db.rollback()
        return {
            "status": "error",
            "message": f"Migration failed: {str(e)}",
            "note": "Column might already be nullable, or database doesn't support this operation"
        }
