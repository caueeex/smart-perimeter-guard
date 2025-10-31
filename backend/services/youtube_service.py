"""
Serviço para processar vídeos do YouTube
"""
import os
import subprocess
import tempfile
import uuid
from typing import Optional, Dict, Any
import yt_dlp
from pathlib import Path

class YouTubeService:
    """Serviço para download e processamento de vídeos do YouTube"""
    
    def __init__(self):
        self.temp_dir = Path("temp_videos")
        self.temp_dir.mkdir(exist_ok=True)
    
    def extract_video_id(self, url: str) -> Optional[str]:
        """Extrai o ID do vídeo da URL do YouTube"""
        try:
            with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
                info = ydl.extract_info(url, download=False)
                return info.get('id')
        except Exception as e:
            print(f"Erro ao extrair ID do vídeo: {e}")
            return None
    
    def get_video_info(self, url: str) -> Optional[Dict[str, Any]]:
        """Obtém informações do vídeo sem baixar"""
        try:
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                return {
                    'id': info.get('id'),
                    'title': info.get('title'),
                    'duration': info.get('duration'),
                    'uploader': info.get('uploader'),
                    'view_count': info.get('view_count'),
                    'thumbnail': info.get('thumbnail'),
                    'formats': [f for f in info.get('formats', []) if f.get('vcodec') != 'none']
                }
        except Exception as e:
            print(f"Erro ao obter informações do vídeo: {e}")
            return None
    
    def download_video(self, url: str, max_duration: int = 300) -> Optional[str]:
        """Baixa o vídeo do YouTube para arquivo local"""
        try:
            # Gerar nome único para o arquivo
            video_id = self.extract_video_id(url)
            if not video_id:
                return None
            
            filename = f"{video_id}_{uuid.uuid4().hex[:8]}.mp4"
            filepath = self.temp_dir / filename
            
            # Configurações do yt-dlp
            ydl_opts = {
                'format': 'best[height<=720][ext=mp4]',  # Qualidade máxima 720p
                'outtmpl': str(filepath),
                'quiet': True,
                'no_warnings': True,
                'max_duration': max_duration,  # Limitar a 5 minutos
                'writesubtitles': False,
                'writeautomaticsub': False,
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
            
            if filepath.exists():
                return str(filepath)
            else:
                return None
                
        except Exception as e:
            print(f"Erro ao baixar vídeo: {e}")
            return None
    
    def convert_to_stream_url(self, filepath: str) -> str:
        """Converte arquivo local para URL de stream"""
        # Para desenvolvimento, vamos usar um endpoint que serve o arquivo
        filename = os.path.basename(filepath)
        return f"/api/v1/youtube/stream/{filename}"
    
    def cleanup_old_videos(self, max_age_hours: int = 24):
        """Remove vídeos antigos para economizar espaço"""
        try:
            import time
            current_time = time.time()
            
            for file_path in self.temp_dir.glob("*.mp4"):
                file_age = current_time - file_path.stat().st_mtime
                if file_age > (max_age_hours * 3600):
                    file_path.unlink()
                    print(f"Arquivo removido: {file_path}")
        except Exception as e:
            print(f"Erro ao limpar arquivos antigos: {e}")
    
    def process_youtube_url(self, url: str) -> Dict[str, Any]:
        """Processa URL do YouTube e retorna informações para o frontend"""
        try:
            print(f"📥 Processando URL do YouTube: {url}")
            
            # Obter informações do vídeo
            print("🔍 Obtendo informações do vídeo...")
            video_info = self.get_video_info(url)
            if not video_info:
                print("❌ Não foi possível obter informações do vídeo")
                return {
                    'success': False,
                    'error': 'Não foi possível obter informações do vídeo'
                }
            
            print(f"✅ Informações obtidas: {video_info.get('title', 'Sem título')}")
            
            # Verificar duração (limitar a 5 minutos)
            duration = video_info.get('duration', 0)
            if duration > 300:  # 5 minutos
                print(f"❌ Vídeo muito longo: {duration}s")
                return {
                    'success': False,
                    'error': 'Vídeo muito longo. Máximo permitido: 5 minutos'
                }
            
            # Baixar vídeo
            print("⬇️ Iniciando download do vídeo...")
            filepath = self.download_video(url)
            if not filepath:
                print("❌ Falha no download do vídeo")
                return {
                    'success': False,
                    'error': 'Não foi possível baixar o vídeo'
                }
            
            print(f"✅ Vídeo baixado: {filepath}")
            
            # Verificar se arquivo existe e tem tamanho
            if not os.path.exists(filepath):
                print(f"❌ Arquivo não existe: {filepath}")
                return {
                    'success': False,
                    'error': 'Arquivo baixado não foi encontrado'
                }
            
            file_size = os.path.getsize(filepath)
            print(f"📊 Tamanho do arquivo: {file_size / (1024*1024):.2f} MB")
            
            if file_size == 0:
                print("❌ Arquivo está vazio")
                return {
                    'success': False,
                    'error': 'Arquivo baixado está vazio'
                }
            
            # Converter para URL de stream
            stream_url = self.convert_to_stream_url(filepath)
            filename = os.path.basename(filepath)
            
            print(f"✅ Stream URL gerada: {stream_url}")
            
            return {
                'success': True,
                'video_info': video_info,
                'filepath': filepath,
                'stream_url': stream_url,
                'filename': filename
            }
            
        except Exception as e:
            print(f"❌ Erro ao processar vídeo: {e}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'error': f'Erro ao processar vídeo: {str(e)}'
            }

# Instância global do serviço
youtube_service = YouTubeService()

