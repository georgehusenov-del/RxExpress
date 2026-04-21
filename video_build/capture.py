"""Capture screenshots for pharmacy-side walkthrough video."""
import asyncio
from playwright.async_api import async_playwright
import os

BASE = "https://subs-launch-staging.preview.emergentagent.com"
FRAMES = "/app/video_build/frames"
os.makedirs(FRAMES, exist_ok=True)


async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--no-sandbox", "--disable-dev-shm-usage"])
        context = await browser.new_context(viewport={"width": 1920, "height": 1080})
        page = await context.new_page()

        # --- SCENE 1: Landing ---
        await page.goto(f"{BASE}/", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(1500)
        await page.screenshot(path=f"{FRAMES}/01_landing.png")
        print("01 landing ok")

        # --- SCENE 2: Login ---
        await page.goto(f"{BASE}/login", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(1000)
        await page.fill('input[type="email"]', "pharmacy@test.com")
        await page.fill('input[type="password"]', "Pharmacy@123")
        await page.wait_for_timeout(500)
        await page.screenshot(path=f"{FRAMES}/02_login.png")
        print("02 login ok")

        # --- Sign in ---
        await page.click('button[type="submit"]')
        await page.wait_for_load_state("networkidle", timeout=20000)
        await page.wait_for_timeout(3000)

        # --- SCENE 3: Dashboard overview ---
        await page.screenshot(path=f"{FRAMES}/03_dashboard.png")
        print("03 dashboard ok")

        # --- SCENE 4: Scroll to delivered orders ---
        await page.evaluate("""
            () => {
                const rows = document.querySelectorAll('tr');
                for (const r of rows) {
                    if (r.textContent.includes('Delivered')) {
                        r.scrollIntoView({block:'center'});
                        break;
                    }
                }
            }
        """)
        await page.wait_for_timeout(1500)
        await page.screenshot(path=f"{FRAMES}/04_dashboard_delivered.png")
        print("04 delivered rows ok")

        # --- SCENE 5: Open a delivered order with POD ---
        order_id = await page.evaluate("""
            () => {
                const rows = Array.from(document.querySelectorAll('tr'));
                const withPOD = rows.find(r => r.textContent.includes('Delivered') && r.querySelector('a'));
                if (!withPOD) return null;
                const link = withPOD.querySelector('a');
                const id = link.textContent.trim();
                link.click();
                return id;
            }
        """)
        print("Clicked order:", order_id)
        await page.wait_for_timeout(3000)
        await page.screenshot(path=f"{FRAMES}/05_order_detail.png")
        print("05 order detail ok")

        # Scroll modal content to show POD section
        await page.evaluate("""
            () => {
                const pod = document.querySelector('.pod-section');
                if (pod) pod.scrollIntoView({block:'center'});
            }
        """)
        await page.wait_for_timeout(1500)
        await page.screenshot(path=f"{FRAMES}/06_pod.png")
        print("06 pod ok")

        # Close modal
        await page.keyboard.press("Escape")
        await page.wait_for_timeout(500)
        await page.evaluate("document.querySelectorAll('.modal-close, [class*=close]').forEach(e=>{try{e.click()}catch{}})")
        await page.wait_for_timeout(800)

        # --- SCENE 6 & 7: Reports ---
        await page.goto(f"{BASE}/Pharmacy/Reports", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(3500)
        await page.screenshot(path=f"{FRAMES}/07_reports_top.png")
        print("07 reports top ok")

        # Scroll to see breakdown table
        await page.evaluate("window.scrollTo(0, 300)")
        await page.wait_for_timeout(1200)
        await page.screenshot(path=f"{FRAMES}/08_reports_charts.png")
        print("08 reports charts ok")

        # Click "By Driver" tab
        try:
            await page.click("text=By Driver", timeout=3000)
            await page.wait_for_timeout(1500)
            await page.screenshot(path=f"{FRAMES}/09_reports_bydriver.png")
            print("09 reports by driver ok")
        except Exception as e:
            print("by driver click:", e)
            await page.screenshot(path=f"{FRAMES}/09_reports_bydriver.png")

        # --- SCENE 10: Create Order highlight ---
        await page.goto(f"{BASE}/Pharmacy/Index", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2500)
        await page.evaluate("""
            () => {
                const btns = document.querySelectorAll('button, a');
                for (const b of btns) {
                    if (b.textContent.trim().includes('Create Order')) {
                        b.style.boxShadow = '0 0 0 8px rgba(16,185,129,0.55)';
                        b.style.transform = 'scale(1.1)';
                        b.scrollIntoView({block:'center'});
                        break;
                    }
                }
                window.scrollTo(0,0);
            }
        """)
        await page.wait_for_timeout(1200)
        await page.screenshot(path=f"{FRAMES}/10_create_order.png")
        print("10 create order ok")

        # --- SCENE 11: Closing (landing w/ logo) ---
        await page.goto(f"{BASE}/", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(1500)
        await page.screenshot(path=f"{FRAMES}/11_closing.png")
        print("11 closing ok")

        await browser.close()

        print("\n---FILES---")
        for f in sorted(os.listdir(FRAMES)):
            p = os.path.join(FRAMES, f)
            print(f, os.path.getsize(p))


asyncio.run(run())
