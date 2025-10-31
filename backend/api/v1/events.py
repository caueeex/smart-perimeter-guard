"""
Endpoints de eventos
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os
import shutil

from database import get_db
from schemas.event import Event, EventCreate, EventUpdate, EventStats, HeatmapData
from schemas.user import User
from services.event_service import EventService
from services.auth_service import AuthService
from models.event import EventType
from config import settings

router = APIRouter()


@router.post("/", response_model=Event, status_code=status.HTTP_201_CREATED)
def create_event(
    event: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Criar novo evento"""
    return EventService.create_event(db, event)


@router.get("/", response_model=List[Event])
def get_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    camera_id: Optional[int] = Query(None),
    event_type: Optional[EventType] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Obter lista de eventos com filtros"""
    return EventService.get_events(
        db, skip=skip, limit=limit, camera_id=camera_id,
        event_type=event_type, start_date=start_date, end_date=end_date
    )


@router.get("/{event_id}", response_model=Event)
def get_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Obter evento por ID"""
    event = EventService.get_event(db, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento não encontrado"
        )
    return event


@router.put("/{event_id}", response_model=Event)
def update_event(
    event_id: int,
    event_update: EventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Atualizar evento"""
    event = EventService.update_event(db, event_id, event_update)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento não encontrado"
        )
    return event


@router.delete("/{event_id}")
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_admin_user)
):
    """Deletar evento"""
    success = EventService.delete_event(db, event_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento não encontrado"
        )
    return {"message": "Evento deletado com sucesso"}


@router.get("/stats/summary", response_model=EventStats)
def get_event_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Obter estatísticas de eventos"""
    return EventService.get_event_stats(db)


@router.get("/camera/{camera_id}", response_model=List[Event])
def get_events_by_camera(
    camera_id: int,
    limit: int = Query(50, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Obter eventos por câmera"""
    return EventService.get_events_by_camera(db, camera_id, limit)


@router.get("/recent/list", response_model=List[Event])
def get_recent_events(
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Obter eventos recentes"""
    return EventService.get_recent_events(db, limit)


@router.post("/{event_id}/mark-notified")
def mark_event_as_notified(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Marcar evento como notificado"""
    success = EventService.mark_event_as_notified(db, event_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento não encontrado"
        )
    return {"message": "Evento marcado como notificado"}


@router.get("/export/data")
def export_events(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    camera_id: Optional[int] = Query(None),
    event_type: Optional[EventType] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Exportar eventos para relatório"""
    return EventService.export_events(
        db, start_date=start_date, end_date=end_date,
        camera_id=camera_id, event_type=event_type
    )


@router.get("/heatmap/{camera_id}", response_model=HeatmapData)
def get_heatmap_data(
    camera_id: int,
    date_range: str = Query("7d", description="Período: 1d, 7d, 30d"),
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Obter dados do heatmap"""
    from services.detection_service import detection_service
    return detection_service.get_heatmap_data(camera_id, date_range)


@router.post("/screenshot")
def save_screenshot(
    file: UploadFile = File(...),
    area: str = Form(...),
    object: str = Form(...),
    timestamp: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Salvar screenshot de intrusão"""
    try:
        # Criar diretório de screenshots se não existir
        screenshots_dir = os.path.join("uploads", "screenshots")
        os.makedirs(screenshots_dir, exist_ok=True)
        
        # Salvar arquivo
        file_path = os.path.join(screenshots_dir, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Criar evento no banco de dados
        event_data = EventCreate(
            camera_id=1,  # Câmera padrão para área de teste
            event_type="intrusion",
            description=f"Intrusão detectada na área '{area}' - Objeto: {object}",
            confidence=0.95,
            image_path=file_path,
            detected_objects=[object],
            bounding_boxes=[],
            is_processed=True,
            is_notified=True
        )

        event = EventService.create_event(db, event_data)
        return {
            "message": "Screenshot salvo com sucesso",
            "file_path": file_path,
            "event_id": event.id
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao salvar screenshot: {str(e)}"
        )


@router.get("/{event_id}/image")
def get_event_image(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Servir a imagem do evento por ID com fallback de caminho."""
    event = EventService.get_event(db, event_id)
    if not event or not event.image_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Imagem não encontrada")

    # Normalizar caminho: se vier como URL pública (/uploads/...), mapear para disco
    image_path = event.image_path
    try:
        if image_path.startswith("/uploads/"):
            # Remover prefixo inicial '/' e basear no settings.upload_dir
            rel = image_path[len("/uploads/"):]
            if os.path.sep != '/':
                rel = rel.replace('/', os.path.sep)
            abs_path = os.path.join(settings.upload_dir, rel)
        else:
            abs_path = image_path

        if not os.path.exists(abs_path):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo não existe")
        return FileResponse(abs_path, media_type="image/jpeg")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erro ao servir imagem: {e}")


@router.get("/images/list")
def list_screenshots(
    limit: int = Query(20, ge=1, le=200),
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Listar screenshots mais recentes diretamente do diretório de uploads."""
    try:
        shots_dir = os.path.join(settings.upload_dir, 'screenshots')
        if not os.path.isdir(shots_dir):
            return []
        files = [f for f in os.listdir(shots_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        files.sort(key=lambda f: os.path.getmtime(os.path.join(shots_dir, f)), reverse=True)
        files = files[:limit]
        return [
            {
                'filename': name,
                'url': f"/uploads/screenshots/{name}",
                'mtime': os.path.getmtime(os.path.join(shots_dir, name)),
                'size': os.path.getsize(os.path.join(shots_dir, name)),
            }
            for name in files
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar screenshots: {e}")


@router.get("/images/{filename}")
def get_screenshot_file(
    filename: str,
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Servir um arquivo de screenshot pelo nome."""
    try:
        safe_name = filename.replace('..', '').replace('\\', '/').split('/')[-1]
        abs_path = os.path.join(settings.upload_dir, 'screenshots', safe_name)
        if not os.path.exists(abs_path):
            raise HTTPException(status_code=404, detail='Arquivo não encontrado')
        return FileResponse(abs_path, media_type='image/jpeg')
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao servir arquivo: {e}")

