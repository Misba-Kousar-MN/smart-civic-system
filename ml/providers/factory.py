import logging
import config
from providers.base_provider import BaseMlProvider
from providers.gemini_provider import GeminiProvider
from providers.yolo_provider import YoloProvider
from providers.hybrid_provider import HybridProvider

logger = logging.getLogger('ml_factory')

_active_provider_instance = None

def get_provider() -> BaseMlProvider:
    global _active_provider_instance

    provider_type = (getattr(config, 'ML_PROVIDER', 'hybrid') or 'hybrid').lower().strip()

    if _active_provider_instance is None or _active_provider_instance.name != provider_type:
        if provider_type == 'yolo':
            logger.info('[ML_FACTORY] Initializing YOLO ML Provider in FastAPI...')
            _active_provider_instance = YoloProvider()
        elif provider_type == 'gemini':
            logger.info('[ML_FACTORY] Initializing Gemini ML Provider in FastAPI...')
            _active_provider_instance = GeminiProvider()
        else:
            logger.info('[ML_FACTORY] Initializing Hybrid ML Provider (YOLO + Gemini) in FastAPI...')
            _active_provider_instance = HybridProvider()

    return _active_provider_instance
