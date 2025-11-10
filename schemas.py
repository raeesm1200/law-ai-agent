"""
Pydantic schemas for request/response validation
"""

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserLogin(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    questions_used: int = 0
    
    class Config:
        from_attributes = True

class UserWithSubscription(UserResponse):
    subscriptions: List['SubscriptionResponse'] = []

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Subscription schemas
class SubscriptionBase(BaseModel):
    plan_type: str
    status: str

class SubscriptionCreate(BaseModel):
    plan_type: str  # 'monthly' or 'yearly'

class SubscriptionResponse(SubscriptionBase):
    id: int
    user_id: int
    stripe_subscription_id: str
    start_date: datetime
    end_date: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True

# Stripe schemas
class CreateCheckoutSessionRequest(BaseModel):
    plan_type: str  # 'monthly' or 'yearly'
    currency: Optional[str] = "usd"  # 'usd' or 'eur'

class CreateCheckoutSessionResponse(BaseModel):
    session_id: str
    session_url: str

class BillingPortalResponse(BaseModel):
    portal_url: str

# Chat schemas (enhanced from existing)
class ChatRequest(BaseModel):
    message: str
    country: Optional[str] = "italy"
    language: Optional[str] = "english"
    conversation_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    conversation_id: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    message: str

class ClearHistoryRequest(BaseModel):
    conversation_id: Optional[str] = None

# Update forward references
UserWithSubscription.model_rebuild()
