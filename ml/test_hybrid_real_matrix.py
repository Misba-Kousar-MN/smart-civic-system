import time
import requests
import asyncio
from providers.hybrid_provider import HybridProvider

async def run_matrix():
    hybrid = HybridProvider()
    print("\n==================================================")
    print("RUNNING REAL HYBRID AI PIPELINE TEST MATRIX (7 TESTS)")
    print("==================================================")

    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

    test_cases = [
        ("TEST 1: Strong Pothole", "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80"),
        ("TEST 2: Strong Garbage", "https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=600&q=80"),
        ("TEST 3: Weak / Scattered Garbage", "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80"),
        ("TEST 4: Water Leakage", "https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=600&q=80"),
        ("TEST 5: Drainage / Gutter", "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=600&q=80"),
        ("TEST 6: Streetlight Issue", "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=600&q=80"),
        ("TEST 7: Non-Civic Indoor Image", "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80")
    ]

    for label, url in test_cases:
        print(f"\n--------------------------------------------------")
        print(f"EXECUTING: {label}")
        print(f"--------------------------------------------------")
        try:
            t0 = time.time()
            resp = requests.get(url, headers=headers, timeout=15)
            image_bytes = resp.content
            print(f"Downloaded Image Size: {len(image_bytes)} bytes")
            
            res = await hybrid.detect_civic_issue(image_bytes, "test.jpg", "test-report-id")
            proc_time = int((time.time() - t0) * 1000)

            print(f"Execution Time: {proc_time} ms")
            print(f"Detected: {res.get('detected')}")
            print(f"AI Category: {res.get('ai_category')}")
            print(f"AI Confidence: {res.get('ai_confidence')}")
            print(f"Model Version: {res.get('model_version')}")
            print(f"Bounding Boxes: {len(res.get('bounding_boxes', []))}")
        except Exception as e:
            print("ERROR:", str(e))

if __name__ == "__main__":
    asyncio.run(run_matrix())
