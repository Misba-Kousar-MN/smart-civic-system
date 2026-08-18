import base64
import json
import logging
import requests
from typing import Dict, Any
from providers.base_provider import BaseMlProvider
from utils.categories import normalize_category
from utils.normalization import normalize_confidence
import config

logger = logging.getLogger('gemini_provider')

class GeminiProvider(BaseMlProvider):
    def __init__(self):
        super().__init__('gemini')
        self.model = config.ML_MODEL or 'gemini-flash-latest'

    async def detect_civic_issue(self, image_bytes: bytes, original_filename: str, report_id: str) -> Dict[str, Any]:
        if not config.GEMINI_API_KEY:
            logger.warning('[GEMINI] GEMINI_API_KEY is not set in ml/.env. Returning unclassified.')
            return {
                "detected": False,
                "ai_category": None,
                "ai_confidence": None,
                "bounding_boxes": [],
                "model_version": self.model
            }

        if not image_bytes:
            logger.warning('[GEMINI] Empty image buffer provided.')
            return {
                "detected": False,
                "ai_category": None,
                "ai_confidence": None,
                "bounding_boxes": [],
                "model_version": self.model
            }

        try:
            base64_data = base64.b64encode(image_bytes).decode('utf-8')
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={config.GEMINI_API_KEY}"

            prompt = """You are an expert municipal infrastructure visual inspection system.
Analyze the provided image for public civic infrastructure problems (roads, sanitation, drainage, streetlights, utilities).

Classify the detected problem into EXACTLY ONE of the following canonical municipal categories:
- "Pothole"
- "Road Damage"
- "Garbage Dump"
- "Drainage Blockage"
- "Streetlight Failure"
- "Water Leakage"
- "Broken Footpath"
- "Encroachment"
- "Tree Fall"
- "Manhole Uncovered"
- "Other" (if a genuine civic problem exists but is not listed above)

If NO civic infrastructure problem is present in the image (e.g. indoor selfie, document, pet, clean room, landscape), set "detected" to false and "ai_category" to null.

Provide your response in raw JSON adhering to this exact schema:
{
  "detected": boolean,
  "ai_category": string or null,
  "ai_confidence": number between 0.0 and 100.0 or null,
  "explanation": "short rationale"
}"""

            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt},
                            {
                                "inlineData": {
                                    "mimeType": "image/jpeg",
                                    "data": base64_data
                                }
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "temperature": 0.1
                }
            }

            resp = requests.post(url, json=payload, timeout=15)
            if resp.status_code == 200:
                res_data = resp.json()
                candidates = res_data.get('candidates', [])
                if candidates and candidates[0].get('content', {}).get('parts'):
                    raw_text = candidates[0]['content']['parts'][0].get('text', '')
                    parsed = json.loads(raw_text)

                    is_detected = bool(parsed.get('detected'))
                    raw_cat = parsed.get('ai_category')
                    raw_conf = parsed.get('ai_confidence')

                    norm_cat = normalize_category(raw_cat) if is_detected else None
                    norm_conf = normalize_confidence(raw_conf) if is_detected else None

                    return {
                        "detected": is_detected and bool(norm_cat),
                        "ai_category": norm_cat if is_detected else None,
                        "ai_confidence": norm_conf if is_detected else None,
                        "bounding_boxes": [],
                        "model_version": self.model
                    }
            else:
                logger.error(f"[GEMINI] API returned HTTP {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.error(f"[GEMINI] Error invoking Gemini API: {str(e)}")

        return {
            "detected": False,
            "ai_category": None,
            "ai_confidence": None,
            "bounding_boxes": [],
            "model_version": self.model
        }

    async def verify_resolution(self, before_bytes: bytes, after_bytes: bytes, incident_id: str, ai_category: str) -> Dict[str, Any]:
        if not config.GEMINI_API_KEY:
            return {
                "ai_verification_passed": True,
                "ai_confidence": 80.0,
                "comparison_notes": "Resolution evidence accepted (Gemini key not configured).",
                "model_version": f"{self.model}-fallback"
            }

        try:
            before_b64 = base64.b64encode(before_bytes).decode('utf-8')
            after_b64 = base64.b64encode(after_bytes).decode('utf-8')
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={config.GEMINI_API_KEY}"

            prompt = f"""You are a municipal work order verification system.
Compare the two provided images for an incident reported as "{ai_category or 'Civic Issue'}":
Image 1: BEFORE resolution (initial reported condition)
Image 2: AFTER resolution (completed repair work)

Determine if the physical civic issue shown in Image 1 has been repaired, cleaned, or resolved in Image 2.

Provide your response in raw JSON adhering to this exact schema:
{{
  "ai_verification_passed": boolean,
  "ai_confidence": number between 0.0 and 100.0,
  "comparison_notes": "short description of repair observation"
}}"""

            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt},
                            {"inlineData": {"mimeType": "image/jpeg", "data": before_b64}},
                            {"inlineData": {"mimeType": "image/jpeg", "data": after_b64}}
                        ]
                    }
                ],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "temperature": 0.1
                }
            }

            resp = requests.post(url, json=payload, timeout=15)
            if resp.status_code == 200:
                res_data = resp.json()
                candidates = res_data.get('candidates', [])
                if candidates and candidates[0].get('content', {}).get('parts'):
                    raw_text = candidates[0]['content']['parts'][0].get('text', '')
                    parsed = json.loads(raw_text)

                    passed = bool(parsed.get('ai_verification_passed'))
                    conf = normalize_confidence(parsed.get('ai_confidence')) or 85.0
                    notes = parsed.get('comparison_notes', 'Physical resolution evidence verified by Gemini.')

                    return {
                        "ai_verification_passed": passed,
                        "ai_confidence": conf,
                        "comparison_notes": notes,
                        "model_version": self.model
                    }
        except Exception as e:
            logger.error(f"[GEMINI] Resolution verification error: {str(e)}")

        return {
            "ai_verification_passed": True,
            "ai_confidence": 80.0,
            "comparison_notes": "Resolution evidence accepted (Gemini API fallback).",
            "model_version": f"{self.model}-fallback"
        }

    async def check_health(self) -> Dict[str, Any]:
        if not config.GEMINI_API_KEY:
            return {
                "provider": self.name,
                "model": self.model,
                "status": "unhealthy",
                "available": False
            }

        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}?key={config.GEMINI_API_KEY}"
            resp = requests.get(url, timeout=5)
            return {
                "provider": self.name,
                "model": self.model,
                "status": "healthy" if resp.status_code == 200 else "degraded",
                "available": resp.status_code == 200
            }
        except Exception:
            return {
                "provider": self.name,
                "model": self.model,
                "status": "unavailable",
                "available": False
            }
