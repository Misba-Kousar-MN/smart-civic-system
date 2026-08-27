import requests
import config

def test_key():
    models_to_test = ["gemini-3.6-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
    key = config.GEMINI_API_KEY

    print("==================================================")
    print("TESTING NEW GEMINI API KEY INDEPENDENTLY")
    print("==================================================")
    print(f"Loaded Key (Masked): {key[:6]}...{key[-4:] if len(key) > 10 else ''}")

    for m in models_to_test:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}?key={key}"
        try:
            r = requests.get(url, timeout=10)
            print(f"Model: {m:<20} | Status: {r.status_code} | Response: {r.text[:140]}")
        except Exception as e:
            print(f"Model: {m:<20} | Error: {str(e)}")

if __name__ == "__main__":
    test_key()
