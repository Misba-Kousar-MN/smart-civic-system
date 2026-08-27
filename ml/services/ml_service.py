from typing import Dict, Any
from providers.factory import get_provider

async def detect_civic_issue(image_bytes: bytes, original_filename: str, report_id: str, category_hint: str = None) -> Dict[str, Any]:
    provider = get_provider()
    return await provider.detect_civic_issue(image_bytes, original_filename, report_id, category_hint=category_hint)

async def verify_resolution(before_bytes: bytes, after_bytes: bytes, incident_id: str, ai_category: str) -> Dict[str, Any]:
    provider = get_provider()
    return await provider.verify_resolution(before_bytes, after_bytes, incident_id, ai_category)

async def check_health() -> Dict[str, Any]:
    provider = get_provider()
    return await provider.check_health()
