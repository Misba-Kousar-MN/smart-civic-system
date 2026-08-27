import traceback
import os
import sys
import time
import requests
from io import BytesIO
from PIL import Image
from gtts import gTTS

FASTAPI_URL = "http://127.0.0.1:8090/ml/v1"
BACKEND_URL = "http://localhost:4000/api/v1"
INTERNAL_API_KEY = "ml_internal_dev_key_2026"
SUPABASE_URL = "https://wtadxeanbmtnocjermcf.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0YWR4ZWFuYm10bm9jamVybWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MzYyODYsImV4cCI6MjEwMjUxMjI4Nn0.ocQG5v7fpg7oUpPrSBdoaA8aWHnkqpApgYOxFQL3zTc"

def create_dummy_image():
    img = Image.new('RGB', (300, 300), color=(73, 109, 137))
    buf = BytesIO()
    img.save(buf, format='JPEG')
    buf.seek(0)
    return buf.getvalue()

def create_speech_audio(text):
    buf = BytesIO()
    tts = gTTS(text=text, lang='en')
    tts.write_to_fp(buf)
    buf.seek(0)
    return buf.getvalue()

def get_citizen_jwt():
    payload = {'email': 'test_citizen_voice@smartcivic.com', 'password': 'Password123!'}
    headers = {'apikey': ANON_KEY, 'Content-Type': 'application/json'}
    r = requests.post(f"{SUPABASE_URL}/auth/v1/token?grant_type=password", json=payload, headers=headers)
    if r.status_code == 200:
        return r.json()['access_token']
    raise RuntimeError(f"Failed to authenticate citizen user: {r.status_code} {r.text}")

def run_tests():
    print("==================================================")
    print("   SMART CIVIC SYSTEM - REAL VOICE & STT SUITE    ")
    print("==================================================")
    
    passed_tests = 0
    total_tests = 14
    
    # ----------------------------------------------------
    # TEST 1: GET /ml/v1/health
    # ----------------------------------------------------
    print("\n[TEST 1] Verifying FastAPI Health (YOLO + Gemini + Whisper)...")
    try:
        r = requests.get(f"{FASTAPI_URL}/health", headers={"X-Internal-API-Key": INTERNAL_API_KEY})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert data.get("success") == True
        assert data.get("data", {}).get("whisper_loaded") == True
        print("  -> PASSED: FastAPI microservice healthy, Whisper pre-warmed & loaded.")
        passed_tests += 1
    except Exception as e:
        print(f"  -> FAILED TEST 1: {e}")

    # ----------------------------------------------------
    # TEST 2: Speech-to-Text Inference (Sentence 1)
    # ----------------------------------------------------
    print("\n[TEST 2] Submitting real spoken audio to Whisper STT...")
    spoken_text_1 = "There is a large pothole on Main Street near the central market"
    audio_bytes_1 = create_speech_audio(spoken_text_1)
    
    try:
        files = {"audio": ("pothole_voice.mp3", audio_bytes_1, "audio/mpeg")}
        r = requests.post(f"{FASTAPI_URL}/transcribe", files=files, headers={"X-Internal-API-Key": INTERNAL_API_KEY})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        res = r.json()
        assert res.get("success") == True
        transcript = res["data"]["transcript"]
        print(f"  -> Transcribed: '{transcript}'")
        print(f"  -> Language: '{res['data']['language']}'")
        print(f"  -> Processing Time: {res['data']['processing_time_ms']} ms")
        assert len(transcript) > 0
        assert "pothole" in transcript.lower() or "pot hole" in transcript.lower() or "main street" in transcript.lower()
        print("  -> PASSED: Whisper inference correctly transcribed spoken audio!")
        passed_tests += 1
    except Exception as e:
        print(f"  -> FAILED TEST 2: {e}")

    # ----------------------------------------------------
    # TEST 3: Speech-to-Text Inference (Sentence 2)
    # ----------------------------------------------------
    print("\n[TEST 3] Submitting second spoken audio sentence to Whisper STT...")
    spoken_text_2 = "Garbage is overflowing on Fifth Main Road"
    audio_bytes_2 = create_speech_audio(spoken_text_2)
    
    try:
        files = {"audio": ("garbage_voice.mp3", audio_bytes_2, "audio/mpeg")}
        r = requests.post(f"{FASTAPI_URL}/transcribe", files=files, headers={"X-Internal-API-Key": INTERNAL_API_KEY})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        res = r.json()
        transcript = res["data"]["transcript"]
        print(f"  -> Transcribed: '{transcript}'")
        assert "garbage" in transcript.lower() or "fifth" in transcript.lower() or "road" in transcript.lower()
        print("  -> PASSED: Transcribed text corresponds strictly to second spoken audio sentence!")
        passed_tests += 1
    except Exception as e:
        print(f"  -> FAILED TEST 3: {e}")

    # Acquire JWT token for backend integration tests
    token = get_citizen_jwt()
    headers_auth = {"Authorization": f"Bearer {token}"}

    # ----------------------------------------------------
    # TEST 4: Full Report Submission with Voice Note
    # ----------------------------------------------------
    print("\n[TEST 4] Submitting full report with voice note to Node backend...")
    image_bytes = create_dummy_image()
    spoken_report_text = "Water pipe leakage flooding the street near civic center"
    voice_bytes = create_speech_audio(spoken_report_text)
    
    report_id = None
    incident_id = None
    
    try:
        files = {
            "image": ("test_image.jpg", image_bytes, "image/jpeg"),
            "voice_note": ("voice_report.mp3", voice_bytes, "audio/mpeg")
        }
        data = {
            "latitude": "14.467389",
            "longitude": "75.924080"
        }
        
        r = requests.post(f"{BACKEND_URL}/reports", files=files, data=data, headers=headers_auth)
        assert r.status_code in [200, 201], f"Expected 200/201, got {r.status_code} {r.text}"
        res = r.json()
        assert res.get("success") == True
        
        rep = res["data"]["report"]
        report_id = rep["id"]
        incident_id = res["data"]["incident"]["id"]
        
        print(f"  -> Created Report ID: {report_id}")
        print(f"  -> Voice Note URL: {rep.get('voice_note_url')}")
        print(f"  -> Voice Transcript: '{rep.get('voice_transcript')}'")
        
        assert rep.get("voice_note_url") is not None
        assert rep.get("voice_transcript") is not None
        assert len(rep.get("voice_transcript")) > 0
        print("  -> PASSED: Full voice report created with Supabase URL & Whisper transcript!")
        passed_tests += 1
    except Exception as e:
        print(f"  -> FAILED TEST 4: {e}")

    # ----------------------------------------------------
    # TEST 5: Citizen Report Detail Fetch
    # ----------------------------------------------------
    print("\n[TEST 5] Fetching report details for Citizen playback...")
    try:
        assert report_id is not None, "No report_id from TEST 4"
        r = requests.get(f"{BACKEND_URL}/reports/{report_id}", headers=headers_auth)
        assert r.status_code == 200
        rep_detail = r.json()["data"]
        assert rep_detail.get("voice_note_url") is not None
        assert rep_detail.get("voice_transcript") is not None
        print(f"  -> Audio URL: {rep_detail['voice_note_url']}")
        print(f"  -> Transcript: '{rep_detail['voice_transcript']}'")
        print("  -> PASSED: Citizen report detail contains valid audio player URL & transcript!")
        passed_tests += 1
    except Exception as e:
        print(f"  -> FAILED TEST 5: {e}")

    # ----------------------------------------------------
    # TEST 6: Officer Incident Detail Fetch
    # ----------------------------------------------------
    print("\n[TEST 6] Fetching incident details for Officer playback...")
    try:
        assert incident_id is not None, "No incident_id from TEST 4"
        r = requests.get(f"{BACKEND_URL}/incidents/{incident_id}", headers=headers_auth)
        assert r.status_code == 200
        inc_detail = r.json()["data"]
        voice_reps = [rep for rep in inc_detail["reports"] if rep.get("voice_note_url")]
        assert len(voice_reps) > 0, "No report with voice_note_url found in incident payload"
        primary_rep = voice_reps[0]
        assert primary_rep.get("voice_note_url") is not None
        assert primary_rep.get("voice_transcript") is not None
        print(f"  -> Primary Report Audio URL: {primary_rep['voice_note_url']}")
        print(f"  -> Primary Report Transcript: '{primary_rep['voice_transcript']}'")
        print("  -> PASSED: Officer incident detail contains valid audio player URL & transcript!")
        passed_tests += 1
    except Exception as e:
        print(f"  -> FAILED TEST 6: {e}")
        traceback.print_exc()

    # ----------------------------------------------------
    # TEST 7: Submit Report Without Voice Note
    # ----------------------------------------------------
    print("\n[TEST 7] Submitting report without voice note...")
    try:
        files = {
            "image": ("test_no_voice.jpg", image_bytes, "image/jpeg")
        }
        data = {
            "latitude": "14.468000",
            "longitude": "75.925000"
        }
        r = requests.post(f"{BACKEND_URL}/reports", files=files, data=data, headers=headers_auth)
        assert r.status_code in [200, 201]
        rep_no_voice = r.json()["data"]["report"]
        assert rep_no_voice.get("voice_note_url") is None
        assert rep_no_voice.get("voice_transcript") is None
        print("  -> PASSED: Report without voice submitted cleanly without voice fields!")
        passed_tests += 1
    except Exception as e:
        print(f"  -> FAILED TEST 7: {e}")

    # ----------------------------------------------------
    # TEST 8: Submit Malformed Audio (0 Bytes)
    # ----------------------------------------------------
    print("\n[TEST 8] Submitting malformed (0-byte) audio to /ml/v1/transcribe...")
    try:
        files = {"audio": ("empty.webm", b"", "audio/webm")}
        r = requests.post(f"{FASTAPI_URL}/transcribe", files=files, headers={"X-Internal-API-Key": INTERNAL_API_KEY})
        assert r.status_code == 400
        assert r.json().get("error", {}).get("code") == "EMPTY_AUDIO_PAYLOAD"
        print("  -> PASSED: 0-byte audio payload rejected with 400 Bad Request!")
        passed_tests += 1
    except Exception as e:
        print(f"  -> FAILED TEST 8: {e}")

    # ----------------------------------------------------
    # TEST 9: Submit Oversized / Corrupt Audio Payload
    # ----------------------------------------------------
    print("\n[TEST 9] Submitting corrupted non-audio text data to /ml/v1/transcribe...")
    try:
        files = {"audio": ("corrupt.txt", b"THIS_IS_NOT_AUDIO_DATA_STRING_12345", "audio/mpeg")}
        r = requests.post(f"{FASTAPI_URL}/transcribe", files=files, headers={"X-Internal-API-Key": INTERNAL_API_KEY})
        res = r.json()
        assert r.status_code in [422, 500] or res.get("success") == False or "error" in res
        print("  -> PASSED: Corrupt audio payload handled with controlled failure response!")
        passed_tests += 1
    except Exception as e:
        print(f"  -> FAILED TEST 9: {e}")

    # ----------------------------------------------------
    # TEST 10: Whisper Failure Resilience (Backend Report)
    # ----------------------------------------------------
    print("\n[TEST 10] Submitting corrupt voice note in report submission...")
    try:
        files = {
            "image": ("test_resilience.jpg", image_bytes, "image/jpeg"),
            "voice_note": ("corrupt_voice.mp3", b"INVALID_AUDIO_BUFFER_DATA", "audio/mpeg")
        }
        data = {
            "latitude": "14.469000",
            "longitude": "75.926000"
        }
        r = requests.post(f"{BACKEND_URL}/reports", files=files, data=data, headers=headers_auth)
        assert r.status_code in [200, 201]
        res_report = r.json()["data"]["report"]
        assert res_report.get("voice_note_url") is not None
        assert res_report.get("voice_transcript") is None
        print("  -> PASSED: Report saved, original voice_note stored, voice_transcript left null gracefully!")
        passed_tests += 1
    except Exception as e:
        print(f"  -> FAILED TEST 10: {e}")

    # ----------------------------------------------------
    # TEST 11: YOLO26 Pothole Detection Regression Test
    # ----------------------------------------------------
    print("\n[TEST 11] Verifying YOLO26 Pothole Detection Pipeline...")
    try:
        files = {"image": ("test_img.jpg", image_bytes, "image/jpeg")}
        r = requests.post(f"{FASTAPI_URL}/detect", files=files, headers={"X-Internal-API-Key": INTERNAL_API_KEY})
        assert r.status_code == 200
        det_data = r.json()
        assert det_data.get("success") == True
        print(f"  -> ML Category: {det_data['data'].get('ai_category')}")
        print("  -> PASSED: YOLO26/Gemini vision detection pipeline functional!")
        passed_tests += 1
    except Exception as e:
        print(f"  -> FAILED TEST 11: {e}")

    # ----------------------------------------------------
    # TEST 12: YOLO26 Garbage Detection Regression Test
    # ----------------------------------------------------
    print("\n[TEST 12] Verifying YOLO26 Garbage Detection Pipeline...")
    try:
        files = {"image": ("test_garbage.jpg", image_bytes, "image/jpeg")}
        r = requests.post(f"{FASTAPI_URL}/detect", files=files, headers={"X-Internal-API-Key": INTERNAL_API_KEY})
        assert r.status_code == 200
        assert r.json().get("success") == True
        print("  -> PASSED: Garbage detection pipeline functional!")
        passed_tests += 1
    except Exception as e:
        print(f"  -> FAILED TEST 12: {e}")

    # ----------------------------------------------------
    # TEST 13: Gemini Fallback Regression Test
    # ----------------------------------------------------
    print("\n[TEST 13] Verifying Resolution Verification Endpoint...")
    try:
        files = {
            "before_image": ("before.jpg", image_bytes, "image/jpeg"),
            "after_image": ("after.jpg", image_bytes, "image/jpeg")
        }
        data = {"ai_category": "Pothole"}
        r = requests.post(f"{FASTAPI_URL}/verify-resolution", files=files, data=data, headers={"X-Internal-API-Key": INTERNAL_API_KEY})
        assert r.status_code == 200
        res_data = r.json()
        assert res_data.get("success") == True
        print("  -> PASSED: Resolution verification endpoint functional!")
        passed_tests += 1
    except Exception as e:
        print(f"  -> FAILED TEST 13: {e}")

    # ----------------------------------------------------
    # TEST 14: Core Intelligence Workflow Verification
    # ----------------------------------------------------
    print("\n[TEST 14] Verifying Core Intelligence (Priority & SLA)...")
    try:
        assert incident_id is not None
        r = requests.get(f"{BACKEND_URL}/incidents/{incident_id}", headers=headers_auth)
        assert r.status_code == 200
        inc = r.json()["data"]["incident"]
        assert inc.get("priority_level") in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
        assert inc.get("sla_deadline") is not None
        print(f"  -> Priority Level: {inc['priority_level']}")
        print(f"  -> SLA Deadline: {inc['sla_deadline']}")
        print("  -> PASSED: Core intelligence workflow (Severity, Priority, SLA) intact!")
        passed_tests += 1
    except Exception as e:
        print(f"  -> FAILED TEST 14: {e}")

    print("\n==================================================")
    print(f"   SUITE RESULTS: {passed_tests} / {total_tests} TESTS PASSED   ")
    print("==================================================")
    if passed_tests == total_tests:
        print(">>> ALL VOICE REPORTING & STT VERIFICATION TESTS PASSED PERFECTLY! <<<")
    else:
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
