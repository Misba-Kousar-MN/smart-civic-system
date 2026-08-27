import requests
import json
import base64
import config

def download_image(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    r = requests.get(url, headers=headers, timeout=15)
    return r.content

def test_candidates():
    candidates = {
        "Pothole": [
            "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80"
        ],
        "Garbage": [
            "https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80"
        ],
        "Water Leakage": [
            "https://images.unsplash.com/photo-1527689368864-3a821dbccc34?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=800&q=80"
        ],
        "Drainage": [
            "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1584467735815-f778f274e296?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80"
        ],
        "Non-Civic": [
            "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80"
        ]
    }

    print("==================================================")
    print("TESTING CANDIDATE IMAGES DIRECTLY WITH GEMINI 3.7 FLASH")
    print(f"Model: {config.ML_MODEL}")
    print("==================================================")

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

If NO civic problem is present, set detected to false.

Respond in JSON:
{
  "detected": boolean,
  "ai_category": string or null,
  "ai_confidence": number or null,
  "description": string or null
}"""

    for cat, urls in candidates.items():
        print(f"\n--- TESTING CATEGORY: {cat} ---")
        for u in urls:
            try:
                img_bytes = download_image(u)
                if len(img_bytes) < 1000:
                    print(f"URL: {u[:60]}... | INVALID BUFFER ({len(img_bytes)} bytes)")
                    continue
                
                b64_data = base64.b64encode(img_bytes).decode('utf-8')
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{config.ML_MODEL}:generateContent?key={config.GEMINI_API_KEY}"
                payload = {
                    "contents": [{"parts": [{"text": prompt}, {"inline_data": {"mime_type": "image/jpeg", "data": b64_data}}]}],
                    "generationConfig": {"responseMimeType": "application/json", "temperature": 0.1}
                }
                res = requests.post(url, json=payload, timeout=30)
                print(f"URL: {u[:60]}... | Bytes: {len(img_bytes)} | HTTP: {res.status_code}")
                if res.status_code == 200:
                    cand = res.json().get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
                    print(f"   Gemini Output: {cand.strip()}")
                else:
                    print(f"   Error: {res.text[:120]}")
            except Exception as e:
                print(f"   Exception: {str(e)}")

if __name__ == "__main__":
    test_candidates()
