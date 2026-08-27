from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseMlProvider(ABC):
    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    async def detect_civic_issue(
        self, 
        image_bytes: bytes, 
        original_filename: str, 
        report_id: str, 
        category_hint: str = None,
        yolo_candidate_category: str = None,
        yolo_candidate_confidence: float = None
    ) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def verify_resolution(self, before_bytes: bytes, after_bytes: bytes, incident_id: str, ai_category: str) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def check_health(self) -> Dict[str, Any]:
        pass
