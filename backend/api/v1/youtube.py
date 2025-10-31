"""
Endpoints para processamento de vídeos do YouTube
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Request, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import os
from pathlib import Path
from datetime import datetime

from services.youtube_service import youtube_service
from services.auth_service import AuthService
from schemas.user import User

router = APIRouter()

class YouTubeUrlRequest(BaseModel):
    url: str

class YouTubeResponse(BaseModel):
    success: bool
    video_info: Optional[dict] = None
    stream_url: Optional[str] = None
    filename: Optional[str] = None
    error: Optional[str] = None

@router.post("/process", response_model=YouTubeResponse)
def process_youtube_url(
    request: YouTubeUrlRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Processa URL do YouTube e prepara para detecção"""
    try:
        # Processar URL do YouTube
        result = youtube_service.process_youtube_url(request.url)
        
        if result['success']:
            # Agendar limpeza de arquivos antigos
            background_tasks.add_task(youtube_service.cleanup_old_videos)
            
            return YouTubeResponse(
                success=True,
                video_info=result['video_info'],
                stream_url=result['stream_url'],
                filename=result['filename']
            )
        else:
            return YouTubeResponse(
                success=False,
                error=result['error']
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar URL do YouTube: {str(e)}"
        )

@router.get("/stream/{filename}")
def stream_video(
    filename: str,
    request: Request,
    token: Optional[str] = Query(None, description="Token de autenticação (via query string para elemento video)"),
):
    """Serve arquivo de vídeo para stream com suporte a range requests"""
    try:
        from fastapi import Request as FastAPIRequest
        
        # Tentar autenticação via header (bearer token) ou query string
        # Primeiro tentar header Authorization
        auth_header = request.headers.get("Authorization")
        auth_token = None
        
        if auth_header and auth_header.startswith("Bearer "):
            auth_token = auth_header.split(" ")[1]
        elif token:
            auth_token = token
        
        if auth_token:
            # Validar token
            try:
                from jose import jwt, JWTError
                from config import settings
                payload = jwt.decode(auth_token, settings.secret_key, algorithms=[settings.algorithm])
                user_id = payload.get("sub")
                if not user_id:
                    raise HTTPException(status_code=401, detail="Token inválido")
            except JWTError as e:
                raise HTTPException(status_code=401, detail="Token inválido ou expirado")
        # Se não há token, permitir acesso (para facilitar uso do elemento <video>)
        # Em produção, você pode querer exigir autenticação
        
        import os
        filepath = youtube_service.temp_dir / filename
        
        if not filepath.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Arquivo de vídeo não encontrado: {filename}"
            )
        
        # Verificar se é um arquivo de vídeo
        valid_extensions = ['.mp4', '.webm', '.avi', '.mkv']
        if not any(filename.lower().endswith(ext) for ext in valid_extensions):
            raise HTTPException(
                status_code=400,
                detail="Formato de arquivo inválido"
            )
        
        file_size = os.path.getsize(filepath)
        
        # Suporte para range requests (necessário para streaming de vídeo)
        from fastapi import Request
        from fastapi.responses import StreamingResponse
        
        # Processar range header se presente
        range_header = None
        if request:
            range_header = request.headers.get("range")
        
        def generate():
            with open(filepath, 'rb') as video_file:
                if range_header:
                    # Processar range request
                    range_match = range_header.replace("bytes=", "").split("-")
                    start = int(range_match[0]) if range_match[0] else 0
                    end = int(range_match[1]) if range_match[1] else file_size - 1
                    
                    video_file.seek(start)
                    remaining = end - start + 1
                    
                    while remaining:
                        chunk_size = min(8192, remaining)
                        chunk = video_file.read(chunk_size)
                        if not chunk:
                            break
                        remaining -= len(chunk)
                        yield chunk
                else:
                    # Enviar arquivo completo
                    while True:
                        chunk = video_file.read(8192)
                        if not chunk:
                            break
                        yield chunk
        
        headers = {
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
            "Cache-Control": "public, max-age=3600",
            "Content-Type": "video/mp4"
        }
        
        if range_header:
            range_match = range_header.replace("bytes=", "").split("-")
            start = int(range_match[0]) if range_match[0] else 0
            end = int(range_match[1]) if range_match[1] else file_size - 1
            content_length = end - start + 1
            headers["Content-Range"] = f"bytes {start}-{end}/{file_size}"
            headers["Content-Length"] = str(content_length)
            headers["Content-Type"] = "video/mp4"
        
        response = StreamingResponse(
            generate(),
            media_type="video/mp4",
            headers=headers,
            status_code=206 if range_header else 200
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Erro ao servir vídeo: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao servir vídeo: {str(e)}"
        )

@router.head("/stream/{filename}")
def head_stream_video(
    filename: str,
    request: Request,
    token: Optional[str] = Query(None, description="Token (opcional) para compatibilidade")
):
    """Resposta HEAD para o elemento <video> checar existência sem baixar o arquivo."""
    try:
        import os
        filepath = youtube_service.temp_dir / filename
        
        if not filepath.exists():
            raise HTTPException(status_code=404, detail="Arquivo não encontrado")
        
        valid_extensions = ['.mp4', '.webm', '.avi', '.mkv']
        if not any(filename.lower().endswith(ext) for ext in valid_extensions):
            raise HTTPException(status_code=400, detail="Formato inválido")
        
        file_size = os.path.getsize(filepath)
        # Construir resposta sem corpo
        from fastapi import Response
        return Response(status_code=200, headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
            "Cache-Control": "public, max-age=3600",
            "Content-Type": "video/mp4"
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no HEAD do stream: {str(e)}")

@router.get("/info/{video_id}")
def get_video_info(
    video_id: str,
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Obtém informações de um vídeo do YouTube"""
    try:
        url = f"https://www.youtube.com/watch?v={video_id}"
        video_info = youtube_service.get_video_info(url)
        
        if not video_info:
            raise HTTPException(
                status_code=404,
                detail="Vídeo não encontrado"
            )
        
        return {
            "success": True,
            "video_info": video_info
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao obter informações: {str(e)}"
        )

@router.get("/videos")
def list_downloaded_videos():
    """Lista todos os vídeos baixados disponíveis"""
    try:
        import logging
        logger = logging.getLogger(__name__)
        
        videos = []
        temp_dir = youtube_service.temp_dir
        
        logger.info(f"Procurando vídeos em: {temp_dir.absolute()}")
        logger.info(f"Diretório existe: {temp_dir.exists()}")
        
        if not temp_dir.exists():
            logger.warning(f"Diretório temp_videos não existe: {temp_dir}")
            temp_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Diretório criado: {temp_dir}")
            return {
                "success": True,
                "videos": [],
                "total": 0,
                "message": "Diretório de vídeos estava vazio"
            }
        
        # Buscar vídeos
        video_files = list(temp_dir.glob("*.mp4"))
        logger.info(f"Encontrados {len(video_files)} arquivos .mp4")
        
        for video_file in video_files:
            try:
                stat = video_file.stat()
                video_info = {
                    "filename": video_file.name,
                    "size": stat.st_size,
                    "size_mb": round(stat.st_size / (1024 * 1024), 2),
                    "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "stream_url": f"/api/v1/youtube/stream/{video_file.name}"
                }
                videos.append(video_info)
                logger.debug(f"Vídeo encontrado: {video_file.name} ({video_info['size_mb']} MB)")
            except Exception as file_error:
                logger.error(f"Erro ao processar arquivo {video_file.name}: {str(file_error)}")
                continue
        
        # Ordenar por data de criação (mais recente primeiro)
        videos.sort(key=lambda x: x["created_at"], reverse=True)
        
        logger.info(f"Retornando {len(videos)} vídeos")
        
        return {
            "success": True,
            "videos": videos,
            "total": len(videos)
        }
    except Exception as e:
        import traceback
        logger.error(f"Erro ao listar vídeos: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao listar vídeos: {str(e)}"
        )

@router.delete("/cleanup")
def cleanup_videos(
    current_user: User = Depends(AuthService.get_current_admin_user)
):
    """Limpa arquivos de vídeo antigos"""
    try:
        youtube_service.cleanup_old_videos()
        return {
            "success": True,
            "message": "Limpeza concluída"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro na limpeza: {str(e)}"
        )

