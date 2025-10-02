"""
Script para baixar modelo YOLO
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ultralytics import YOLO
from config import settings

def download_model():
    """Baixar modelo YOLO"""
    print("Baixando modelo YOLO...")
    
    try:
        # Criar diretório de modelos se não existir
        os.makedirs(os.path.dirname(settings.model_path), exist_ok=True)
        
        # Baixar modelo YOLOv8n (nano - mais leve)
        import torch
        import torch.nn as nn
        from ultralytics.nn.tasks import DetectionModel
        from ultralytics.nn.modules import Conv, C2f, SPPF, Detect
        
        # Carregar modelo com weights_only=False (necessário para YOLO)
        # Adicionar globals seguros
        torch.serialization.add_safe_globals([
            DetectionModel,
            Conv,
            C2f,
            SPPF,
            Detect,
            nn.Sequential,
            nn.Module,
            nn.Conv2d,
            nn.BatchNorm2d,
            nn.ReLU,
            nn.MaxPool2d,
            nn.AdaptiveAvgPool2d,
            nn.Linear,
            nn.Dropout
        ])
        
        # Carregar modelo com weights_only=False
        # Usar monkey patch para desabilitar weights_only
        original_load = torch.load
        def patched_load(*args, **kwargs):
            kwargs['weights_only'] = False
            return original_load(*args, **kwargs)
        
        torch.load = patched_load
        model = YOLO('yolov8n.pt')
        torch.load = original_load  # Restaurar função original
        
        # Salvar modelo
        torch.save(model.model.state_dict(), settings.model_path)
        
        print(f"Modelo salvo em: {settings.model_path}")
        print("Modelo YOLO baixado com sucesso!")
        
        return True
        
    except Exception as e:
        print(f"Erro ao baixar modelo: {e}")
        return False

if __name__ == "__main__":
    download_model()

