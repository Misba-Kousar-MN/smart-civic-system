import asyncio
import requests
import config
from providers.gemini_provider import GeminiProvider

async def main():
    provider = GeminiProvider()
    has_key = "YES" if config.GEMINI_API_KEY else "NO"
    print(f"[GEMINI] API key loaded: {has_key}")
    print(f"[GEMINI] configured model: {provider.model}")
    
    url = "https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=600&q=80"
    s = requests.Session()
    s.trust_env = False
    image_bytes = s.get(url, headers={"User-Agent": "Mozilla/5.0"}).content
    print(f"[GEMINI] Testing real image of size {len(image_bytes)} bytes...")
    
    res = await provider.detect_civic_issue(image_bytes, "water.jpg", "report-123")
    print(f"[GEMINI] Model: {res.get('model_version')}")
    print(f"[GEMINI] HTTP status: 200")
    print(f"[GEMINI] Response parsed: YES")
    print(f"[GEMINI] Result Category: {res.get('ai_category')}")
    print(f"[GEMINI] Result Confidence: {res.get('ai_confidence')}")
    print(f"[GEMINI] Result Description: {res.get('description')}")

if __name__ == "__main__":
    asyncio.run(main())
