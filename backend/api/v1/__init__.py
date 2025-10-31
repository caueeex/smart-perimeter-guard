# API v1 package
from fastapi import APIRouter
from .auth import router as auth_router
from .cameras import router as cameras_router
from .events import router as events_router
from .webcam import router as webcam_router
from .stream import router as stream_router
from .detection import router as detection_router
from .monitoring import router as monitoring_router
from .youtube import router as youtube_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["authentication"])
api_router.include_router(cameras_router, prefix="/cameras", tags=["cameras"])
api_router.include_router(events_router, prefix="/events", tags=["events"])
api_router.include_router(webcam_router, prefix="/webcam", tags=["webcam"])
api_router.include_router(stream_router, prefix="/stream", tags=["stream"])
api_router.include_router(detection_router, prefix="/detection", tags=["detection"])
api_router.include_router(monitoring_router, prefix="/monitoring", tags=["monitoring"])
api_router.include_router(youtube_router, prefix="/youtube", tags=["youtube"])