import base64
import requests
import json
import config
from utils.categories import normalize_category
from utils.normalization import normalize_confidence

def test_gemini_image(label, img_url):
    print(f"\n==================================================")
    print(f"TESTING REAL IMAGE: {label}")
    print(f"==================================================")
    
    resp = requests.get(img_url)
    image_bytes = resp.content
    b64_str = base64.b64encode(image_bytes).decode('utf-8')

    model = config.ML_MODEL or "gemini-3.7-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={config.GEMINI_API_KEY}"

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

    res = requests.post(url, json=payload, timeout=30)
    print("HTTP Status Code:", res.status_code)
    if res.status_code == 200:
        data = res.json()
        candidates = data.get('candidates', [])
        if candidates and candidates[0].get('content', {}).get('parts'):
            raw_text = candidates[0]['content']['parts'][0].get('text', '')
            print("Raw Output Text:", raw_text)
            parsed = json.loads(raw_text)
            norm_cat = normalize_category(parsed.get('ai_category'))
            norm_conf = normalize_confidence(parsed.get('ai_confidence'))
            print("Detected:", parsed.get('detected'))
            print("Canonical Category:", norm_cat)
            print("Confidence:", norm_conf)
            print("Explanation:", parsed.get('explanation'))
            return True, norm_cat, norm_conf
    else:
        print("Error Response:", res.text[:200])
        return False, None, None

if __name__ == "__main__":
    test_gemini_image("Garbage Overflow", "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=500&q=80")
    test_gemini_image("Water Leakage", "https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=500&q=80")
    test_gemini_image("Streetlight Failure", "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=500&q=80")
