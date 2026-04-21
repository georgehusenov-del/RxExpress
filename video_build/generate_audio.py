"""Generate per-scene voiceover audio (MP3) synced to screens."""
import asyncio
import os
import subprocess
from emergentintegrations.llm.openai import OpenAITextToSpeech

API_KEY = "sk-emergent-8D021F2E4Ce96E2EaC"
AUDIO_DIR = "/app/video_build/audio"
os.makedirs(AUDIO_DIR, exist_ok=True)

# Each tuple = (scene frame file, narration text)
SCENES = [
    ("01_landing.png",
     "Welcome to R X Expresss \u2014 the enterprise grade pharmacy delivery platform built for modern pharmacies."),
    ("02_login.png",
     "Signing in is simple. Just enter your pharmacy credentials to reach your portal."),
    ("03_dashboard.png",
     "Your pharmacy dashboard gives you a complete live view of every order, recipient, status, tracking link, copay, and delivery fee, all in one place."),
    ("04_dashboard_delivered.png",
     "Delivered orders are clearly marked in green, and the camera icon on the right shows that a tamper proof Proof of Delivery has been captured."),
    ("05_order_detail.png",
     "Click any order to open the full details. You will see the recipient, pickup type, driver assigned, and copay amount."),
    ("06_pod.png",
     "The Proof of Delivery section shows the geo tagged delivery photo, the recipient's signature, the person who received it, and the exact time stamp of the hand off."),
    ("07_reports_top.png",
     "Next, head over to the Reports page. At the top you see key performance indicators: total orders, delivered, failed, pending, revenue, and copay collected."),
    ("08_reports_charts.png",
     "Use the filters on top to drill down by date range, driver, or status. The monthly breakdown shows volume, revenue, and copay for every period."),
    ("09_reports_bydriver.png",
     "Switch to the By Driver or Status Breakdown tab to compare performance across your team and track every order outcome."),
    ("10_create_order.png",
     "Back on the dashboard, when you are ready to dispatch, just click Create Order to launch a new delivery in seconds."),
    ("11_closing.png",
     "R X Expresss \u2014 secure, compliant, and built to scale with your pharmacy."),
]


async def main():
    tts = OpenAITextToSpeech(api_key=API_KEY)
    for i, (frame, text) in enumerate(SCENES, start=1):
        out_path = f"{AUDIO_DIR}/{i:02d}_{os.path.splitext(frame)[0]}.mp3"
        print(f"Generating {out_path} ...")
        audio = await tts.generate_speech(
            text=text,
            model="tts-1",
            voice="onyx",
            speed=1.0,
        )
        with open(out_path, "wb") as f:
            f.write(audio)
        # Probe duration
        dur = subprocess.check_output([
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", out_path
        ]).decode().strip()
        print(f"  -> {len(audio)} bytes, duration={dur}s")


asyncio.run(main())
