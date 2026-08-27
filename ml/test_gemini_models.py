import requests
import config

def test_models():
    models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-3.6-flash"]
    key = config.GEMINI_API_KEY

    print("==================================================")
    print("TESTING GEMINI API MODELS & QUOTAS")
    print("==================================================")

    for m in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}?key={key}"
        try:
            r = requests.get(url, timeout=10)
            print(f"Model: {m:<20} | Status: {r.status_code} | Response: {r.text[:120]}")
        except Exception as e:
            print(f"Model: {m:<20} | Error: {str(e)}")

if __name__ == "__main__":
    test_models()
