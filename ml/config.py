import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from ml/.env
env_path = Path(__file__).resolve().parent / '.env'
load_dotenv(dotenv_path=env_path)

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
ML_PROVIDER = os.getenv('ML_PROVIDER', 'gemini').lower().strip()
ML_MODEL = os.getenv('ML_MODEL', 'gemini-flash-latest')
ML_INTERNAL_API_KEY = os.getenv('ML_INTERNAL_API_KEY', '')
PORT = int(os.getenv('PORT', '8000'))
