import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from ml/.env
env_path = Path(__file__).resolve().parent / '.env'
load_dotenv(dotenv_path=env_path)

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
ML_PROVIDER = os.getenv('ML_PROVIDER', 'hybrid').lower().strip()
ML_MODEL = os.getenv('ML_MODEL', 'gemini-3.7-flash')
YOLO_MODEL_PATH = os.getenv('YOLO_MODEL_PATH', 'weights/best.pt')
YOLO_CONFIDENCE_THRESHOLD = float(os.getenv('YOLO_CONFIDENCE_THRESHOLD', '0.50'))
ML_INTERNAL_API_KEY = os.getenv('ML_INTERNAL_API_KEY', '')
MAX_RETRIES = int(os.getenv('MAX_RETRIES', '3'))
PORT = int(os.getenv('PORT', '8090'))
