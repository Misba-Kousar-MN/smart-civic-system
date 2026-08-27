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
        self.model = getattr(config, 'ML_MODEL', None) or 'gemini-3.7-flash'
        self.max_retries = getattr(config, 'MAX_RETRIES', 3)
        self.session = requests.Session()
        self.session.trust_env = False

    async def detect_civic_issue(
        self, 
        image_bytes: bytes, 
        original_filename: str, 
        report_id: str, 
        category_hint: str = None,
        yolo_candidate_category: str = None,
        yolo_candidate_confidence: float = None
    ) -> Dict[str, Any]:
        logger.info(f"[AI] Gemini analysis started (Model: '{self.model}', Hint: '{category_hint}', YOLO Candidate: '{yolo_candidate_category}')")
        if not config.GEMINI_API_KEY:
            logger.warning('[GEMINI] GEMINI_API_KEY is not configured in ml/.env.')
            return {
                "detected": False,
                "ai_category": None,
                "ai_confidence": None,
                "description": None,
                "error": "API_KEY_MISSING",
                "bounding_boxes": [],
                "model_version": self.model,
                "gemini_called": True,
                "gemini_http_status": 0
            }

        if not image_bytes:
            logger.warning('[GEMINI] Empty image buffer provided.')
            return {
                "detected": False,
                "ai_category": None,
                "ai_confidence": None,
                "description": None,
                "bounding_boxes": [],
                "model_version": self.model,
                "gemini_called": True,
                "gemini_http_status": 0
            }

        current_model = getattr(config, 'ML_MODEL', None) or self.model
        max_retries = getattr(config, 'MAX_RETRIES', self.max_retries)

        for attempt in range(1, max_retries + 1):
            try:
                base64_data = base64.b64encode(image_bytes).decode('utf-8')
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{current_model}:generateContent?key={config.GEMINI_API_KEY}"
                logger.info(f"[AI] Calling Gemini... (Model: '{current_model}', Attempt: {attempt}/{max_retries})")

                hint_context = f"\nCitizen Reported Issue Category Hint: '{category_hint}'." if category_hint else ""

                conflict_instructions = ""
                if category_hint and yolo_candidate_category:
                    conflict_instructions = f"""
CATEGORY CONFLICT RESOLUTION INSTRUCTION:
- Citizen Reported Issue Category: '{category_hint}'
- Automated YOLO Candidate Detection: '{yolo_candidate_category}' (Confidence: {yolo_candidate_confidence}%)

YOLO may have detected secondary visual objects (such as litter, trash, or debris) that exist inside or near public infrastructure (such as water pipes or storm drains).
Your task is to inspect the ENTIRE image and determine the PRIMARY CIVIC INFRASTRUCTURE PROBLEM.
- If the primary problem is a leaking or burst water pipe/water pooling, classify as "Water Leakage" (even if trash/litter is visible).
- If the primary problem is a clogged drain, overflowing storm drain, or blocked gutter, classify as "Drainage Blockage" (even if trash/debris is inside the drain).
- If the primary problem is genuinely an accumulated garbage heap or dumped waste, classify as "Garbage Dump".
- Do NOT automatically accept the YOLO candidate unless it is genuinely the primary issue in the entire image.
"""

                prompt = f"""You are an expert municipal infrastructure visual inspection system.
Analyze the provided image carefully for public civic infrastructure problems (roads, sanitation, drainage, streetlights, utilities).{hint_context}
{conflict_instructions}
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

Visual Inspection Guidelines:
1. Garbage / Sanitation: Garbage may appear as scattered waste, accumulated trash, overflowing bins, dumped plastic/bottles, household waste, or construction debris. A garbage dump does NOT need a perfect frontal view. Inspect the ENTIRE image, including edges, ground surface, and background. Do NOT return detected=false merely because the waste is partially obscured or viewed from an unusual angle.
2. Water Leakage: Look for water gushing or leaking from pipes, burst mains, street water pooling from a pipe, or broken municipal water lines. If present, classify as "Water Leakage".
3. Drainage / Open Drain: Look for open/uncovered drain grates, storm drain blockages, overflowing gutters, or sewage accumulation. If present, classify as "Drainage Blockage".
4. Road / Pothole: Look for holes, asphalt breakdown, or surface cracks in public roads.
5. Non-Civic Rejection: Set "detected" to false ONLY when the image genuinely does NOT contain any recognizable public civic infrastructure problem (e.g. indoor decor, selfies, personal pets, clean room, sky/landscape without municipal issues).

Provide your response in raw JSON adhering to this exact schema:
{{
  "detected": boolean,
  "ai_category": string or null,
  "ai_confidence": number between 0.0 and 100.0 or null,
  "description": "one concise factual sentence describing the physical civic problem visible in the image",
  "explanation": "short rationale"
}}"""

                payload = {
                    "contents": [
                        {
                            "parts": [
                                {"text": prompt},
                                {
                                    "inline_data": {
                                        "mime_type": "image/jpeg",
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

                resp = self.session.post(url, json=payload, timeout=30)
                logger.info(f"[AI] Gemini response received (HTTP {resp.status_code})")

                if resp.status_code == 200:
                    res_data = resp.json()
                    candidates = res_data.get('candidates', [])
                    if candidates and candidates[0].get('content', {}).get('parts'):
                        raw_text = candidates[0]['content']['parts'][0].get('text', '')
                        logger.info(f"[AI] Gemini raw output text: {raw_text}")
                        parsed = json.loads(raw_text)

                        is_detected = bool(parsed.get('detected'))
                        raw_cat = parsed.get('ai_category')
                        raw_conf = parsed.get('ai_confidence')
                        description = parsed.get('description') or parsed.get('explanation') or ''
                        explanation = parsed.get('explanation', '')

                        if is_detected and raw_cat:
                            norm_cat = normalize_category(raw_cat)
                            norm_conf = normalize_confidence(raw_conf)
                            logger.info(f"[GEMINI-CONFLICT] hint = '{category_hint}', YOLO = '{yolo_candidate_category}', HTTP status = 200, response category = '{norm_cat}', response confidence = {norm_conf}%, fallback_to_yolo = NO")
                            return {
                                "detected": True,
                                "ai_category": norm_cat,
                                "ai_confidence": norm_conf,
                                "description": description,
                                "explanation": explanation,
                                "bounding_boxes": [],
                                "model_version": current_model,
                                "gemini_called": True,
                                "gemini_http_status": 200,
                                "gemini_category": norm_cat,
                                "gemini_confidence": norm_conf
                            }
                        else:
                            logger.info(f"[GEMINI-CONFLICT] hint = '{category_hint}', YOLO = '{yolo_candidate_category}', HTTP status = 200, response category = None, response confidence = null, fallback_to_yolo = NO")
                            return {
                                "detected": False,
                                "ai_category": None,
                                "ai_confidence": None,
                                "description": None,
                                "explanation": explanation,
                                "bounding_boxes": [],
                                "model_version": current_model,
                                "gemini_called": True,
                                "gemini_http_status": 200,
                                "gemini_category": None,
                                "gemini_confidence": None
                            }
                elif resp.status_code == 429:
                    logger.warning(f"[GEMINI] Rate limit / quota exhausted (HTTP 429). {resp.text[:150]}. Sleeping 2.5s before retry...")
                    if attempt < max_retries:
                        import time
                        time.sleep(2.5)
                        continue
                    else:
                        logger.info(f"[GEMINI-CONFLICT] hint = '{category_hint}', YOLO = '{yolo_candidate_category}', HTTP status = 429, response category = None, response confidence = null, fallback_to_yolo = YES")
                        return {
                            "detected": False,
                            "ai_category": None,
                            "ai_confidence": None,
                            "description": None,
                            "error": "RATE_LIMIT_EXHAUSTED",
                            "message": "Gemini API quota exhausted.",
                            "bounding_boxes": [],
                            "model_version": current_model,
                            "gemini_called": True,
                            "gemini_http_status": 429,
                            "gemini_category": None,
                            "gemini_confidence": None
                        }
                elif resp.status_code in (503, 500, 502, 504):
                    logger.warning(f"[GEMINI] Attempt {attempt} returned HTTP {resp.status_code}: {resp.text[:200]}. Retrying...")
                    if attempt < max_retries:
                        import time
                        time.sleep(1.0)
                        continue
                else:
                    logger.error(f"[GEMINI] API returned HTTP {resp.status_code}: {resp.text}")
                    break
            except Exception as e:
                logger.error(f"[GEMINI] Attempt {attempt} error: {str(e)}")
                if attempt < max_retries:
                    import time
                    time.sleep(1.0)
                    continue

        logger.warning("[GEMINI] Gemini Vision service unavailable. Returning AI_UNAVAILABLE status.")
        return {
            "detected": False,
            "ai_category": None,
            "ai_confidence": None,
            "description": None,
            "error": "AI_UNAVAILABLE",
            "message": "Gemini Vision is temporarily unavailable.",
            "bounding_boxes": [],
            "model_version": current_model
        }

    async def generate_description(self, image_bytes: bytes) -> str:
        """Standalone concise description generator when YOLO detects category but citizen description is empty"""
        if not config.GEMINI_API_KEY or not image_bytes:
            return ""
        try:
            current_model = getattr(config, 'ML_MODEL', None) or self.model
            base64_data = base64.b64encode(image_bytes).decode('utf-8')
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{current_model}:generateContent?key={config.GEMINI_API_KEY}"
            prompt = "Describe the public civic infrastructure issue visible in this image in one concise, factual sentence. Do not include measurements, dates, causes, or addresses not visible in the image."
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt},
                            {"inline_data": {"mime_type": "image/jpeg", "data": base64_data}}
                        ]
                    }
                ],
                "generationConfig": {"temperature": 0.1}
            }
            resp = self.session.post(url, json=payload, timeout=15)
            if resp.status_code == 200:
                res_data = resp.json()
                candidates = res_data.get('candidates', [])
                if candidates and candidates[0].get('content', {}).get('parts'):
                    raw_text = candidates[0]['content']['parts'][0].get('text', '')
                    return raw_text.strip().replace('"', '')
        except Exception as e:
            logger.warning(f"[GEMINI] Standalone description generation error: {str(e)}")
        return ""

    async def verify_resolution(self, before_bytes: bytes, after_bytes: bytes, incident_id: str, ai_category: str) -> Dict[str, Any]:
        if not config.GEMINI_API_KEY:
            return {
                "ai_verification_passed": False,
                "ai_confidence": 0.0,
                "comparison_notes": "AI resolution verification service unavailable (API Key not configured). Incident remains active for manual officer review.",
                "model_version": f"{self.model}-fallback"
            }

        try:
            before_b64 = base64.b64encode(before_bytes).decode('utf-8')
            after_b64 = base64.b64encode(after_bytes).decode('utf-8')
            current_model = getattr(config, 'ML_MODEL', None) or self.model
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{current_model}:generateContent?key={config.GEMINI_API_KEY}"

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

            resp = self.session.post(url, json=payload, timeout=15)
            if resp.status_code == 200:
                res_data = resp.json()
                candidates = res_data.get('candidates', [])
                if candidates and candidates[0].get('content', {}).get('parts'):
                    raw_text = candidates[0]['content']['parts'][0].get('text', '')
                    parsed = json.loads(raw_text)

                    passed = bool(parsed.get('ai_verification_passed'))
                    conf = normalize_confidence(parsed.get('ai_confidence')) or 0.0
                    notes = parsed.get('comparison_notes', 'Physical resolution evidence evaluated by Gemini.')

                    return {
                        "ai_verification_passed": passed and (conf >= 85.0),
                        "ai_confidence": conf,
                        "comparison_notes": notes,
                        "model_version": current_model
                    }
        except Exception as e:
            logger.error(f"[GEMINI] Resolution verification error: {str(e)}")

        return {
            "ai_verification_passed": False,
            "ai_confidence": 0.0,
            "comparison_notes": "AI resolution verification service unavailable or timed out. Incident remains active for manual officer review.",
            "model_version": f"{self.model}-fallback"
        }

    async def check_health(self) -> Dict[str, Any]:
        current_model = getattr(config, 'ML_MODEL', None) or self.model
        if not config.GEMINI_API_KEY:
            return {
                "provider": self.name,
                "model": current_model,
                "status": "unhealthy",
                "available": False
            }

        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{current_model}?key={config.GEMINI_API_KEY}"
            resp = self.session.get(url, timeout=5)
            return {
                "provider": self.name,
                "model": current_model,
                "status": "healthy" if resp.status_code == 200 else "degraded",
                "available": resp.status_code == 200
            }
        except Exception:
            return {
                "provider": self.name,
                "model": current_model,
                "status": "unavailable",
                "available": False
            }
