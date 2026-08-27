import requests

url = "http://127.0.0.1:8090/ml/v1/detect"
headers = {
    "x-internal-api-key": "ml_internal_dev_key_2026"
}
# Real pothole photo from Unsplash
img_url = "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=400&q=80"
resp_img = requests.get(img_url)

files = {
    "image": ("pothole_test.jpg", resp_img.content, "image/jpeg")
}

print("Testing FastAPI POST /ml/v1/detect on port 8090...")
resp = requests.post(url, headers=headers, files=files)
print("Status Code:", resp.status_code)
print("Response JSON:", resp.text)
