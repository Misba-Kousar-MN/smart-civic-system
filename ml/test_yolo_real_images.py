import requests
import io
import asyncio
from PIL import Image
from providers.yolo_provider import YoloProvider

async def main():
    yolo = YoloProvider()
    print("\n==================================================")
    print("YOLO26 MODEL INITIALIZATION AUDIT")
    print("==================================================")
    print("Is Loaded:", yolo.is_loaded)
    print("Model Version:", yolo.model_version)
    if yolo.yolo_model:
        print("Model Names:", yolo.yolo_model.names)
    print("==================================================\n")

    test_images = [
        ("Pothole Image", "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80"),
        ("Garbage Image", "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80"),
        ("Water Leakage Image", "https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=600&q=80"),
        ("Non-Civic Indoor Image", "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80")
    ]

    for label, url in test_images:
        print(f"--- TESTING: {label} ---")
        try:
            resp = requests.get(url, timeout=10)
            image_bytes = resp.content
            res = await yolo.detect_civic_issue(image_bytes, "test.jpg", "test-id")
            print("Detected:", res.get("detected"))
            print("Category:", res.get("ai_category"))
            print("Confidence:", res.get("ai_confidence"))
            print("Bounding Boxes:", res.get("bounding_boxes"))
            print("Model Version:", res.get("model_version"))
        except Exception as e:
            print("ERROR:", str(e))
        print()

if __name__ == "__main__":
    asyncio.run(main())
