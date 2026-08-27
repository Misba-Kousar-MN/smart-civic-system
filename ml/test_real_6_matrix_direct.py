import requests
import json
import time
import config

def download_image(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    r = requests.get(url, headers=headers, timeout=15)
    return r.content

def run_6_matrix():
    configured_model = getattr(config, 'ML_MODEL', 'gemini-3.7-flash')

    print("==========================================================================")
    print("        FULL 6-CASE REAL AI MATRIX TEST (FASTAPI ML SERVICE PORT 8090)    ")
    print("==========================================================================")
    print(f" Configured ML_MODEL from ml/.env: '{configured_model}'")
    print("==========================================================================")

    cases = [
        {
            "id": 1,
            "name": "1. Pothole",
            "url": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80"
        },
        {
            "id": 2,
            "name": "2. Strong Garbage",
            "url": "https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=600&q=80"
        },
        {
            "id": 3,
            "name": "3. Weak Garbage",
            "url": "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80"
        },
        {
            "id": 4,
            "name": "4. Water Leakage",
            "url": "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=600&q=80"
        },
        {
            "id": 5,
            "name": "5. Open Drainage",
            "url": "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=600&q=80"
        },
        {
            "id": 6,
            "name": "6. Unknown / Non-Civic",
            "url": "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80"
        }
    ]

    fastapi_url = "http://127.0.0.1:8090/ml/v1/detect"
    headers = {"x-internal-api-key": config.ML_INTERNAL_API_KEY or "ml_internal_dev_key_2026"}

    results = []

    for c in cases:
        print(f"\n--------------------------------------------------------------------------")
        print(f" EXECUTING CASE {c['id']}: {c['name']}")
        print(f" Image URL: {c['url']}")
        print(f"--------------------------------------------------------------------------")
        
        try:
            img_bytes = download_image(c['url'])
            print(f" -> Downloaded real image: {len(img_bytes)} bytes")

            files = {"image": ("test_image.jpg", img_bytes, "image/jpeg")}
            data = {"report_id": f"report-case-{c['id']}"}

            start = time.time()
            res = requests.post(fastapi_url, headers=headers, files=files, data=data, timeout=60)
            elapsed = int((time.time() - start) * 1000)

            print(f" -> Configured model:  '{configured_model}'")
            print(f" -> HTTP status:       {res.status_code} ({elapsed}ms)")
            
            res_json = res.json()
            data_payload = res_json.get("data", {})
            actual_model = data_payload.get("model_version", "N/A")
            print(f" -> Actual model used: '{actual_model}'")
            print(f" -> Full Response Payload:\n{json.dumps(res_json, indent=2)}")

            results.append({
                "caseId": c['id'],
                "name": c['name'],
                "configured_model": configured_model,
                "actual_model": actual_model,
                "http_status": res.status_code,
                "detected": data_payload.get("detected"),
                "category": data_payload.get("ai_category"),
                "confidence": data_payload.get("ai_confidence"),
                "description": data_payload.get("description"),
                "status": "PASS" if res.status_code == 200 else "FAIL"
            })

        except Exception as e:
            print(f" ❌ ERROR IN CASE {c['id']}: {str(e)}")
            results.append({
                "caseId": c['id'],
                "name": c['name'],
                "configured_model": configured_model,
                "actual_model": "N/A",
                "http_status": "ERROR",
                "detected": False,
                "category": "ERROR",
                "confidence": None,
                "description": str(e),
                "status": "FAIL"
            })

    print("\n==========================================================================")
    print("                    6-CASE AI MATRIX FINAL SUMMARY TABLE                  ")
    print("==========================================================================")
    for r in results:
        print(f"Case {r['caseId']} [{r['name']}]:")
        print(f"  Configured Model: {r['configured_model']}")
        print(f"  Actual Model:     {r['actual_model']}")
        print(f"  HTTP Status:      {r['http_status']}")
        print(f"  Category:         {r['category']}")
        print(f"  Confidence:       {r['confidence']}%" if r['confidence'] is not None else "  Confidence:       null")
        print(f"  Description:      {r['description']}")
        print(f"  Status:           {r['status']}")
        print("-" * 60)

if __name__ == "__main__":
    run_6_matrix()
