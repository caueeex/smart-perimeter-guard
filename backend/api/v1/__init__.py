# API v1 package
from fastapi import APIRouter
from .auth import router as auth_router
from .cameras import router as cameras_router
from .events import router as events_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["authentication"])
api_router.include_router(cameras_router, prefix="/cameras", tags=["cameras"])
api_router.include_router(events_router, prefix="/events", tags=["events"])