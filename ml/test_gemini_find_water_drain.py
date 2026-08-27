import base64
import requests
import json
import config
from utils.categories import normalize_category
from utils.normalization import normalize_confidence
from utils.image_helper import fetch_image_bytes

def test_url(name, url):
    print(f"\nTesting {name}: {url}")
    try:
        image_bytes = fetch_image_bytes(url)
        b64_str = base64.b64encode(image_bytes).decode('utf-8')
        model = "gemini-3.6-flash"
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={config.GEMINI_API_KEY}"

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

If NO civic infrastructure problem is present in the image, set "detected" to false and "ai_category" to null.

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
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": b64_str
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

        res = requests.post(api_url, json=payload, timeout=25)
        if res.status_code == 200:
            parsed = json.loads(res.json()['candidates'][0]['content']['parts'][0]['text'])
            print("Detected:", parsed.get('detected'))
            print("Category:", parsed.get('ai_category'))
            print("Confidence:", parsed.get('ai_confidence'))
            print("Explanation:", parsed.get('explanation'))
        else:
            print("HTTP Status:", res.status_code, res.text[:150])
    except Exception as e:
        print("Error:", str(e))

if __name__ == "__main__":
    water_urls = [
        ("Water 1", "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80"),
        ("Water 2", "https://images.unsplash.com/photo-1527066579998-dbbae57f45ce?auto=format&fit=crop&w=600&q=80"),
        ("Drain 1", "https://images.unsplash.com/photo-1621451537084-482c73073a0f?auto=format&fit=crop&w=600&q=80"),
        ("Drain 2", "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=600&q=80")
    ]
    for n, u in water_urls:
        test_url(n, u)
