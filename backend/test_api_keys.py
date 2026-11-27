import os
import sys
import httpx
from dotenv import dotenv_values

env_path = 'd:/projects/Urbsafe/backend/.env'
vals = dotenv_values(env_path)

gemini_key = vals.get('GEMINI_API_KEY', '')
owm_key = vals.get('OPENWEATHER_API_KEY', '')
waqi_key = vals.get('WAQI_API_KEY', '')

print("=" * 65)
print("TESTING CONFIGURED API KEYS")
print("=" * 65)

# ── 1. OpenWeatherMap API ──────────────────────────────────────────
print("\n[1/3] Testing OpenWeatherMap Air Pollution API...")
if not owm_key or 'your_' in owm_key:
    print("❌ OPENWEATHER_API_KEY is not set or still has placeholder value.")
else:
    try:
        url = "http://api.openweathermap.org/data/2.5/air_pollution"
        params = {"lat": 28.6139, "lon": 77.2090, "appid": owm_key}
        res = httpx.get(url, params=params, timeout=10.0)
        if res.status_code == 200:
            data = res.json()
            aqi_val = data['list'][0]['main']['aqi']
            pm25 = data['list'][0]['components'].get('pm2_5', 'N/A')
            print(f"✅ OpenWeatherMap API Key is WORKING!")
            print(f"   Status: 200 OK")
            print(f"   Sample data (Delhi): OWM AQI Index = {aqi_val}, PM2.5 = {pm25} µg/m³")
        else:
            print(f"❌ OpenWeatherMap API Key failed with status {res.status_code}: {res.text}")
    except Exception as e:
        print(f"❌ OpenWeatherMap request error: {e}")

# ── 2. WAQI API ────────────────────────────────────────────────────
print("\n[2/3] Testing WAQI (World Air Quality Index) API...")
if not waqi_key or 'your_' in waqi_key:
    print("❌ WAQI_API_KEY is not set or still has placeholder value.")
else:
    try:
        url = f"https://api.waqi.info/feed/geo:28.6139;77.2090/?token={waqi_key}"
        res = httpx.get(url, timeout=10.0)
        if res.status_code == 200:
            data = res.json()
            if data.get('status') == 'ok':
                station = data['data'].get('city', {}).get('name', 'Unknown')
                aqi = data['data'].get('aqi', 'N/A')
                print(f"✅ WAQI API Key is WORKING!")
                print(f"   Status: 200 OK (status=ok)")
                print(f"   Nearest station: {station}")
                print(f"   Real-time AQI: {aqi}")
            else:
                print(f"❌ WAQI API returned error: {data.get('data')}")
        else:
            print(f"❌ WAQI API failed with status {res.status_code}: {res.text}")
    except Exception as e:
        print(f"❌ WAQI request error: {e}")

# ── 3. Gemini API ──────────────────────────────────────────────────
print("\n[3/3] Testing Google Gemini API...")
if not gemini_key or 'your_' in gemini_key:
    print("❌ GEMINI_API_KEY is not set or still has placeholder value.")
else:
    try:
        models_to_test = ["gemini-2.5-flash", "gemini-3.8-flash", "gemini-flash-latest"]
        success = False
        for model in models_to_test:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}"
            payload = {
                "contents": [{"parts": [{"text": "In 5 words or less, what is clean air essential for?"}]}]
            }
            res = httpx.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=15.0)
            if res.status_code == 200:
                answer = res.json()['candidates'][0]['content']['parts'][0]['text'].strip()
                print(f"✅ Gemini API Key is WORKING with model '{model}'!")
                print(f"   Status: 200 OK")
                print(f"   Test Prompt Response: \"{answer}\"")
                success = True
                break
            else:
                print(f"   Attempt with {model} status {res.status_code}")

        if not success:
            print("❌ All model attempts failed.")
    except Exception as e:
        print(f"❌ Gemini request error: {e}")

print("\n" + "=" * 65)
print("ALL TESTS COMPLETED")
print("=" * 65)
