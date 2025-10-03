"""
Endpoints para gerenciamento de câmeras web
"""
import cv2
from fastapi import APIRouter, HTTPException, status
from typing import List, Dict

router = APIRouter()


@router.get("/devices")
def get_available_cameras():
    """Listar câmeras disponíveis no sistema"""
    try:
        available_cameras = []
        
        # Testar índices de câmera de 0 a 10
        for i in range(10):
            cap = cv2.VideoCapture(i)
            if cap.isOpened():
                # Tentar ler um frame para verificar se a câmera está funcionando
                ret, frame = cap.read()
                if ret:
                    # Obter propriedades da câmera
                    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                    fps = cap.get(cv2.CAP_PROP_FPS)
                    
                    available_cameras.append({
                        "index": i,
                        "name": f"Câmera {i}",
                        "resolution": f"{width}x{height}",
                        "fps": fps,
                        "stream_url": f"webcam://{i}"
                    })
                cap.release()
        
        return {
            "cameras": available_cameras,
            "total": len(available_cameras)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar câmeras: {str(e)}"
        )


@router.get("/test/{camera_index}")
def test_camera(camera_index: int):
    """Testar câmera específica"""
    try:
        cap = cv2.VideoCapture(camera_index)
        if not cap.isOpened():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Câmera {camera_index} não encontrada"
            )
        
        # Tentar ler um frame
        ret, frame = cap.read()
        cap.release()
        
        if ret:
            return {
                "success": True,
                "message": f"Câmera {camera_index} está funcionando",
                "camera_index": camera_index
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Câmera {camera_index} não está respondendo"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao testar câmera: {str(e)}"
        )
