"""
Endpoints para streaming de câmeras
"""
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import StreamingResponse
from typing import Optional
from services.stream_service import stream_service
from schemas.user import User
from services.auth_service import AuthService

router = APIRouter()


@router.get("/start/{camera_id}")
def start_camera_stream(
    camera_id: int, 
    stream_url: str,
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Iniciar stream de câmera"""
    try:
        print(f"Iniciando stream para câmera {camera_id} com URL: {stream_url}")
        success = stream_service.start_stream(camera_id, stream_url)
        if success:
            return {"message": f"Stream iniciado para câmera {camera_id}", "success": True}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Erro ao iniciar stream da câmera {camera_id}"
            )
    except Exception as e:
        print(f"Erro ao iniciar stream: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao iniciar stream: {str(e)}"
        )


@router.get("/stop/{camera_id}")
def stop_camera_stream(
    camera_id: int,
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Parar stream de câmera"""
    try:
        stream_service.stop_stream(camera_id)
        return {"message": f"Stream parado para câmera {camera_id}"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao parar stream: {str(e)}"
        )


@router.get("/mjpeg/{camera_id}")
def get_mjpeg_stream(camera_id: int):
    """Obter stream MJPEG da câmera"""
    try:
        if not stream_service.is_stream_active(camera_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Stream não está ativo para câmera {camera_id}"
            )
            
        return StreamingResponse(
            stream_service.generate_mjpeg_stream(camera_id),
            media_type="multipart/x-mixed-replace; boundary=frame"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter stream: {str(e)}"
        )


@router.get("/frame/{camera_id}")
def get_camera_frame(
    camera_id: int,
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Obter frame atual da câmera"""
    try:
        frame_base64 = stream_service.get_frame_as_base64(camera_id)
        if frame_base64:
            return {
                "camera_id": camera_id,
                "frame": frame_base64,
                "format": "base64_jpeg"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Frame não disponível para câmera {camera_id}"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter frame: {str(e)}"
        )


@router.get("/info/{camera_id}")
def get_stream_info(
    camera_id: int,
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Obter informações do stream"""
    try:
        info = stream_service.get_stream_info(camera_id)
        return info
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter informações: {str(e)}"
        )
