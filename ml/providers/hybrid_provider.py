import logging
from typing import Dict, Any
from providers.base_provider import BaseMlProvider
from providers.yolo_provider import YoloProvider
from providers.gemini_provider import GeminiProvider
import config

logger = logging.getLogger('hybrid_provider')

class HybridProvider(BaseMlProvider):
    def __init__(self):
        super().__init__('hybrid')
        self.model = getattr(config, 'ML_MODEL', None) or 'gemini-3.5-flash'
        logger.info(f"[HYBRID] Initializing Hybrid AI Provider (YOLO26 + {self.model})...")
        self.yolo = YoloProvider()
        self.gemini = GeminiProvider()

    async def detect_civic_issue(self, image_bytes: bytes, original_filename: str, report_id: str, category_hint: str = None) -> Dict[str, Any]:
        logger.info(f"[HYBRID] Starting detection pipeline (category_hint: '{category_hint}')...")

        # Step 1: Run YOLO26 inference
        try:
            yolo_res = await self.yolo.detect_civic_issue(image_bytes, original_filename, report_id, category_hint=category_hint)
        except Exception as e:
            logger.error(f"[HYBRID] YOLO provider error: {str(e)}. Proceeding to Gemini fallback.")
            yolo_res = {"detected": False}

        # Step 2: Evaluate YOLO confidence & category agreement
        threshold = getattr(config, 'YOLO_CONFIDENCE_THRESHOLD', 0.50)
        req_conf = threshold * 100.0 if threshold <= 1.0 else threshold

        yolo_detected = yolo_res.get("detected", False)
        yolo_cat = yolo_res.get("ai_category")
        yolo_conf = yolo_res.get("ai_confidence") or 0.0
        yolo_qualified = yolo_detected and (yolo_conf >= req_conf) and (yolo_cat in ("Pothole", "Garbage"))

        hint_clean = (category_hint or "").strip()

        # CASE CONFLICT CHECK:
        # If YOLO detected a category (e.g. Garbage) BUT citizen explicitly selected a different issue category (e.g. Water Leakage, Drainage Blockage)
        category_conflict = False
        if yolo_qualified and hint_clean and hint_clean.lower() != 'other':
            yolo_cat_lower = yolo_cat.lower()
            hint_lower = hint_clean.lower()
            if yolo_cat_lower not in hint_lower and hint_lower not in yolo_cat_lower:
                category_conflict = True
                logger.info(f"[HYBRID] Category conflict detected! Citizen hint: '{category_hint}', YOLO prediction: '{yolo_cat}' ({yolo_conf}%). Routing to Gemini for contextual verification.")

        # CASE A & D: YOLO strong AND (category agrees with citizen hint OR no conflicting hint provided)
        if yolo_qualified and not category_conflict:
            logger.info(f"[HYBRID] High-confidence YOLO detection ('{yolo_cat}', {yolo_conf}% >= {req_conf}%). Returning YOLO result directly. Gemini classification SKIPPED.")
            
            if not yolo_res.get("description") and config.GEMINI_API_KEY:
                try:
                    logger.info(f"[HYBRID] Generating Gemini image description for YOLO detection...")
                    desc = await self.gemini.generate_description(image_bytes)
                    if desc:
                        yolo_res["description"] = desc
                except Exception as desc_err:
                    logger.warning(f"[HYBRID] Could not generate Gemini description for YOLO detection ({desc_err}). Preserving YOLO result.")
            
            return yolo_res

        # CASE B & C: YOLO weak/no detection OR category conflict requiring Gemini contextual verification
        current_model = getattr(config, 'ML_MODEL', None) or self.model
        if category_conflict:
            logger.info(f"[HYBRID] Resolving category conflict via Gemini {current_model} (Citizen Hint: '{category_hint}', YOLO: '{yolo_cat}' {yolo_conf}%)...")
            gemini_res = await self.gemini.detect_civic_issue(
                image_bytes, 
                original_filename, 
                report_id, 
                category_hint=category_hint,
                yolo_candidate_category=yolo_cat,
                yolo_candidate_confidence=yolo_conf
            )
        else:
            logger.info(f"[HYBRID] YOLO produced no confident detection. Routing to Gemini {current_model}...")
            gemini_res = await self.gemini.detect_civic_issue(image_bytes, original_filename, report_id, category_hint=category_hint)

        # CASE C Resolution:
        # If Gemini identifies a valid civic issue matching the hint or image, return Gemini result directly.
        # Only fall back to YOLO if Gemini genuinely fails due to API error (e.g. 429 quota exhaustion).
        if category_conflict:
            if gemini_res.get("detected") and gemini_res.get("ai_category"):
                logger.info(f"[HYBRID] Conflict resolved by Gemini: Category='{gemini_res.get('ai_category')}', Conf={gemini_res.get('ai_confidence')}%.")
                return gemini_res
            elif gemini_res.get("gemini_http_status") == 200 and not gemini_res.get("detected"):
                # Gemini explicitly determined no civic issue / unclassified under HTTP 200
                logger.info(f"[HYBRID] Conflict analyzed by Gemini HTTP 200: determined no civic issue / unclassified.")
                return gemini_res
            elif yolo_qualified:
                logger.info(f"[HYBRID] Gemini API error (HTTP {gemini_res.get('gemini_http_status')}) during conflict. Reverting to YOLO candidate: '{yolo_cat}'.")
                return yolo_res

        return gemini_res

    async def verify_resolution(self, before_bytes: bytes, after_bytes: bytes, incident_id: str, ai_category: str) -> Dict[str, Any]:
        logger.info("[HYBRID] Delegating resolution verification to Gemini...")
        return await self.gemini.verify_resolution(before_bytes, after_bytes, incident_id, ai_category)

    async def check_health(self) -> Dict[str, Any]:
        yolo_health = await self.yolo.check_health()
        gemini_health = await self.gemini.check_health()

        yolo_ok = yolo_health.get("available", False)
        gemini_ok = gemini_health.get("available", False)

        status_str = "healthy" if (yolo_ok and gemini_ok) else ("degraded" if (yolo_ok or gemini_ok) else "unhealthy")

        return {
            "provider": self.name,
            "model": f"yolo:{yolo_health.get('model', 'unknown')}+gemini:{gemini_health.get('model', 'unknown')}",
            "status": status_str,
            "available": yolo_ok or gemini_ok,
            "yolo": yolo_health,
            "gemini": gemini_health
        }
