"""Generate per-scene voiceover audio (MP3) synced to screens - v2."""
import asyncio
import os
import subprocess
from emergentintegrations.llm.openai import OpenAITextToSpeech

API_KEY = "sk-emergent-8D021F2E4Ce96E2EaC"
AUDIO_DIR = "/app/video_build/audio"
os.makedirs(AUDIO_DIR, exist_ok=True)

SCENES = [
    ("01_landing.png",
     "Welcome to R X Expresss \u2014 the enterprise grade pharmacy delivery platform built for modern pharmacies."),
    ("02_login.png",
     "Signing in is simple. Just enter your pharmacy credentials to reach your portal."),
    ("03_dashboard.png",
     "Your pharmacy dashboard gives you a complete live view of every order, recipient, status, tracking link, copay, and delivery fee, all in one place."),
    ("04_dashboard_delivered.png",
     "Delivered orders are marked in green, and the camera icon shows that a tamper proof Proof of Delivery has been captured. Let us open order R X dash three five one zero F five two seven."),
    ("05_order_detail.png",
     "Here are the full details for this delivery \u2014 recipient, address, driver, copay, and the refrigerated flag for cold chain shipments."),
    ("06_pod.png",
     "The Proof of Delivery section shows three geo tagged photos \u2014 home, address, and package \u2014 plus the recipient's signature, the person who received it, and the exact time stamp."),
    ("07_create_order_modal.png",
     "Ready to dispatch a new prescription? Click Create Order, and the scheduling modal opens instantly."),
    ("08_create_order_types.png",
     "Choose the delivery speed that fits your patient. Next Day for routine refills, Same Day for urgent prescriptions, and Priority for time critical medications."),
    ("09_create_order_cold.png",
     "For refrigerated medications, just tick the cold chain checkbox. The driver is alerted, the Q R label turns blue, and an extra three dollars is added to keep the medication at the right temperature."),
    ("10_reports_top.png",
     "Head over to the Reports page. Key performance indicators are up top: total orders, delivered, failed, pending, revenue, and copay collected."),
    ("11_reports_monthly.png",
     "Filter by date range, driver, or status, and see a clean monthly breakdown of volume, revenue, and copay."),
    ("12_reports_bydriver.png",
     "Switch to the By Driver or Status Breakdown tab to compare performance across your team and audit every order outcome."),
    ("13_developers_top.png",
     "Need deeper integration? The Developers portal exposes our full R E S T A P I. Authenticate with your A P I key and secret to get started."),
    ("14_developers_endpoints.png",
     "Create orders, fetch tracking, update statuses, and pull reports \u2014 every action in the portal is also available over the A P I."),
    ("15_developers_webhooks.png",
     "Real time webhooks push delivery events \u2014 picked up, in transit, delivered \u2014 straight into your pharmacy management system."),
    ("16_closing.png",
     "R X Expresss \u2014 secure, compliant, and built to scale with your pharmacy."),
]


async def main():
    tts = OpenAITextToSpeech(api_key=API_KEY)
    for i, (frame, text) in enumerate(SCENES, start=1):
        out_path = f"{AUDIO_DIR}/{i:02d}_{os.path.splitext(frame)[0]}.mp3"
        print(f"Generating {out_path} ...")
        audio = await tts.generate_speech(text=text, model="tts-1", voice="onyx", speed=1.0)
        with open(out_path, "wb") as f:
            f.write(audio)
        dur = subprocess.check_output([
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", out_path
        ]).decode().strip()
        print(f"  -> {len(audio)} bytes, duration={dur}s")


asyncio.run(main())
