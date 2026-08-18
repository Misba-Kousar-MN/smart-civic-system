from pydantic import BaseModel
from typing import List, Optional, Any

class BoundingBox(BaseModel):
    class_name: str
    confidence: float
    x_min: int
    y_min: int
    x_max: int
    y_max: int

class DetectData(BaseModel):
    report_id: Optional[str] = None
    detected: bool
    ai_category: Optional[str] = None
    ai_confidence: Optional[float] = None
    bounding_boxes: List[Any] = []
    model_version: str

class DetectEnvelope(BaseModel):
    success: bool
    data: DetectData
    processing_time_ms: int

class VerifyResolutionData(BaseModel):
    incident_id: Optional[str] = None
    ai_verification_passed: bool
    ai_confidence: float
    comparison_notes: str
    model_version: str

class VerifyResolutionEnvelope(BaseModel):
    success: bool
    data: VerifyResolutionData
    processing_time_ms: int

class HealthData(BaseModel):
    provider: str
    model: str
    status: str
    available: bool

class HealthEnvelope(BaseModel):
    success: bool
    data: HealthData
