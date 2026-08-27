import io
import requests
from PIL import Image
from providers.yolo_provider import YoloProvider
from fastapi.testclient import TestClient
from main import app

def test_level_a():
    print("==================================================")
    print("TEST A: DIRECT PIL IMAGE DECODING")
    print("==================================================")
    pothole_url = "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=400&q=80"
    resp = requests.get(pothole_url)
    image_bytes = resp.content

    print(f"Downloaded Image Bytes: {len(image_bytes)}")
    img = Image.open(io.BytesIO(image_bytes))
    print(f"PIL Image Format: {img.format}")
    print(f"PIL Image Size: {img.size[0]}x{img.size[1]}")
    print(f"PIL Image Mode: {img.mode}")
    img.verify()
    print("PIL verify(): SUCCESS")
    img_rgb = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    print("PIL convert('RGB'): SUCCESS")

def test_level_b():
    print("\n==================================================")
    print("TEST B: DIRECT FASTAPI /ML/V1/DETECT ENDPOINT")
    print("==================================================")
    client = TestClient(app)
    headers = {"x-internal-api-key": "ml_internal_dev_key_2026"}

    pothole_url = "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=400&q=80"
    pothole_bytes = requests.get(pothole_url).content

    res = client.post(
        "/ml/v1/detect",
        headers=headers,
        files={"image": ("pothole.jpg", pothole_bytes, "image/jpeg")},
        data={"report_id": "test_report_level_b"}
    )
    print("HTTP Status:", res.status_code)
    data = res.json()
    print("Response Data:", data)
    assert res.status_code == 200
    assert data["data"]["detected"] is True
    assert data["data"]["ai_category"] == "Pothole"

    garbage_url = "https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=400&q=80"
    garbage_bytes = requests.get(garbage_url).content

    res2 = client.post(
        "/ml/v1/detect",
        headers=headers,
        files={"image": ("garbage.jpg", garbage_bytes, "image/jpeg")},
        data={"report_id": "test_garbage_level_b"}
    )
    print("\nGarbage HTTP Status:", res2.status_code)
    data2 = res2.json()
    print("Garbage Response Data:", data2)
    assert res2.status_code == 200
    assert data2["data"]["detected"] is True
    assert data2["data"]["ai_category"] == "Garbage"

if __name__ == "__main__":
    test_level_a()
    test_level_b()
