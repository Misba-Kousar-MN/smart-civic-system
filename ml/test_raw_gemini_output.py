import base64
import requests
import json
import config

def test_raw():
    img_url = "https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=500&q=80"
    headers = {"User-Agent": "Mozilla/5.0"}
    img_bytes = requests.get(img_url, headers=headers).content
    b64_str = base64.b64encode(img_bytes).decode('utf-8')

    model = getattr(config, 'ML_MODEL', 'gemini-3.7-flash')
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
    print("HTTP Status:", res.status_code)
    print("Raw Response:")
    print(res.text)

if __name__ == "__main__":
    test_raw()
