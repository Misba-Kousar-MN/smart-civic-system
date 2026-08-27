import base64
import requests
import config

def test_gemini_direct():
    img_url = "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=400&q=80"
    resp = requests.get(img_url)
    image_bytes = resp.content
    b64_str = base64.b64encode(image_bytes).decode('utf-8')

    model = "gemini-3.5-flash"
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
- "Other"

Provide your response in raw JSON adhering to this exact schema:
{
  "detected": true,
  "ai_category": "Pothole",
  "ai_confidence": 92.5,
  "explanation": "Road surface defect with severe asphalt breakdown."
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

    print(f"\n--- SENDING IMAGE PAYLOAD TO {model} (45s timeout) ---")
    res = requests.post(url, json=payload, timeout=45)
    print("HTTP Status:", res.status_code)
    print("Response JSON:")
    print(res.text)

if __name__ == "__main__":
    test_gemini_direct()
