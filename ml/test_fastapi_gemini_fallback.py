import requests

def test_fastapi_gemini():
    img_url = "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=500&q=80"
    headers = {"User-Agent": "Mozilla/5.0"}
    img_bytes = requests.get(img_url, headers=headers).content

    print(f"Downloaded Image Bytes: {len(img_bytes)}")

    fastapi_url = "http://127.0.0.1:8090/ml/v1/detect"
    fastapi_headers = {"x-internal-api-key": "ml_internal_dev_key_2026"}

    files = {"image": ("test_weak_garbage.jpg", img_bytes, "image/jpeg")}
    data = {"report_id": "test_weak_garbage_1"}

    res = requests.post(fastapi_url, headers=fastapi_headers, files=files, data=data)
    print("FastAPI HTTP Status:", res.status_code)
    print("FastAPI Response JSON:")
    print(res.text)

if __name__ == "__main__":
    test_fastapi_gemini()
