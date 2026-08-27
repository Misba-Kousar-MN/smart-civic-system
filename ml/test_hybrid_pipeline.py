import time
import requests
import io
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)
HEADERS = {"x-internal-api-key": "ml_internal_dev_key_2026"}

def create_synthetic_image(color, text=None):
    img = Image.new('RGB', (400, 400), color=color)
    if text:
        d = ImageDraw.Draw(img)
        d.text((10, 10), text, fill=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    return buf.getvalue()

def run_tests():
    print("==================================================")
    print("RUNNING HYBRID AI PIPELINE INTEGRATION TESTS")
    print("==================================================")

    # 1. Health check
    print("\n--- TEST 1: GET /ml/v1/health ---")
    res = client.get("/ml/v1/health", headers=HEADERS)
    print("Status:", res.status_code)
    print("Response:", res.json())
    assert res.status_code == 200

    # 2. Real Pothole Image Test (YOLO Direct)
    print("\n--- TEST 2: Real Pothole Image (YOLO Direct Detection) ---")
    pothole_url = "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=400&q=80"
    pothole_bytes = requests.get(pothole_url).content
    
    t0 = time.time()
    res = client.post(
        "/ml/v1/detect",
        headers=HEADERS,
        files={"image": ("pothole.jpg", pothole_bytes, "image/jpeg")},
        data={"report_id": "rep_pothole_1"}
    )
    t1 = time.time()
    pothole_json = res.json()
    print("Status:", res.status_code)
    print("Response:", pothole_json)
    print(f"Total time: {(t1-t0)*1000:.1f} ms")
    assert pothole_json["data"]["detected"] is True
    assert pothole_json["data"]["ai_category"] == "Pothole"
    assert pothole_json["data"]["model_version"] == "yolo26n-civic-v1.0"

    # 3. Real Garbage Image Test (YOLO Direct)
    print("\n--- TEST 3: Real Garbage Image (YOLO Direct Detection) ---")
    garbage_url = "https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=400&q=80"
    garbage_bytes = requests.get(garbage_url).content

    t0 = time.time()
    res = client.post(
        "/ml/v1/detect",
        headers=HEADERS,
        files={"image": ("garbage.jpg", garbage_bytes, "image/jpeg")},
        data={"report_id": "rep_garbage_1"}
    )
    t1 = time.time()
    garbage_json = res.json()
    print("Status:", res.status_code)
    print("Response:", garbage_json)
    print(f"Total time: {(t1-t0)*1000:.1f} ms")
    assert garbage_json["data"]["detected"] is True
    assert garbage_json["data"]["ai_category"] == "Garbage"
    assert garbage_json["data"]["model_version"] == "yolo26n-civic-v1.0"

    # 4. Drainage / Streetlight / Non-YOLO Civic Issue Test (Gemini Fallback)
    print("\n--- TEST 4: Streetlight / Infrastructure Image (Gemini Fallback) ---")
    street_url = "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=400&q=80"
    street_bytes = requests.get(street_url).content

    t0 = time.time()
    res = client.post(
        "/ml/v1/detect",
        headers=HEADERS,
        files={"image": ("streetlight.jpg", street_bytes, "image/jpeg")},
        data={"report_id": "rep_street_1"}
    )
    t1 = time.time()
    street_json = res.json()
    print("Status:", res.status_code)
    print("Response:", street_json)
    print(f"Total time: {(t1-t0)*1000:.1f} ms")
    assert street_json["data"]["model_version"] == "gemini-3.7-flash"

    # 5. Low-confidence / Synthetic non-civic image (Gemini Fallback / Non-civic)
    print("\n--- TEST 5: Clean Solid Color Image (Low Confidence / Gemini Fallback) ---")
    clean_bytes = create_synthetic_image((200, 200, 200), "Clean Room Wall")
    t0 = time.time()
    res = client.post(
        "/ml/v1/detect",
        headers=HEADERS,
        files={"image": ("clean.jpg", clean_bytes, "image/jpeg")},
        data={"report_id": "rep_clean_1"}
    )
    t1 = time.time()
    clean_json = res.json()
    print("Status:", res.status_code)
    print("Response:", clean_json)
    print(f"Total time: {(t1-t0)*1000:.1f} ms")
    assert clean_json["data"]["detected"] is False

    # 6. Corrupt / Invalid Image Bytes Test
    print("\n--- TEST 6: Invalid / Corrupt Image Bytes ---")
    corrupt_bytes = b"INVALID_CORRUPT_IMAGE_BYTES_1234567890"
    res = client.post(
        "/ml/v1/detect",
        headers=HEADERS,
        files={"image": ("corrupt.jpg", corrupt_bytes, "image/jpeg")},
        data={"report_id": "rep_corrupt_1"}
    )
    print("Status:", res.status_code)
    print("Response:", res.json())
    assert res.status_code == 200

    print("\n==================================================")
    print("ALL HYBRID AI PIPELINE INTEGRATION TESTS PASSED 100%!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
