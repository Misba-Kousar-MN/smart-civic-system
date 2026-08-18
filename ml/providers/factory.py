import logging
import config
from providers.base_provider import BaseMlProvider
from providers.gemini_provider import GeminiProvider
from providers.yolo_provider import YoloProvider

logger = logging.getLogger('ml_factory')

_active_provider_instance = None

def get_provider() -> BaseMlProvider:
    global _active_provider_instance

    provider_type = (config.ML_PROVIDER or 'gemini').lower().strip()

    if _active_provider_instance is None or _active_provider_instance.name != provider_type:
        if provider_type == 'yolo':
            logger.info('[ML_FACTORY] Initializing YOLO ML Provider in FastAPI...')
            _active_provider_instance = YoloProvider()
        else:
            logger.info('[ML_FACTORY] Initializing Gemini ML Provider in FastAPI...')
            _active_provider_instance = GeminiProvider()

    return _active_provider_instance
