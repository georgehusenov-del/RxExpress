"""Capture screenshots for pharmacy-side walkthrough v2 (RX-3510F527, Create Order, Developers)."""
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

        await page.click('button[type="submit"]')
        await page.wait_for_load_state("networkidle", timeout=20000)
        await page.wait_for_timeout(3000)

        # --- SCENE 3: Dashboard overview ---
        await page.screenshot(path=f"{FRAMES}/03_dashboard.png")
        print("03 dashboard ok")

        # --- SCENE 4: Scroll to RX-3510F527 row ---
        await page.evaluate("""
            () => {
                const rows = document.querySelectorAll('tr');
                for (const r of rows) {
                    if (r.textContent.includes('RX-3510F527')) {
                        r.scrollIntoView({block:'center'});
                        r.style.outline = '3px solid #22c55e';
                        break;
                    }
                }
            }
        """)
        await page.wait_for_timeout(1200)
        await page.screenshot(path=f"{FRAMES}/04_dashboard_delivered.png")
        print("04 delivered rows ok")

        # --- SCENE 5: Open RX-3510F527 ---
        order_id = await page.evaluate("""
            () => {
                const rows = Array.from(document.querySelectorAll('tr'));
                const target = rows.find(r => r.textContent.includes('RX-3510F527'));
                if (!target) return null;
                const link = target.querySelector('a');
                if (!link) return null;
                const id = link.textContent.trim();
                link.click();
                return id;
            }
        """)
        print("Clicked order:", order_id)
        await page.wait_for_timeout(3000)
        await page.screenshot(path=f"{FRAMES}/05_order_detail.png")
        print("05 order detail ok")

        # Scroll modal content to POD section
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

        # --- SCENE 7: Click Create Order button ---
        await page.evaluate("window.scrollTo(0,0)")
        await page.wait_for_timeout(400)
        clicked = await page.evaluate("""
            () => {
                const btns = document.querySelectorAll('button, a');
                for (const b of btns) {
                    if (b.textContent.trim().includes('Create Order')) {
                        b.click();
                        return true;
                    }
                }
                return false;
            }
        """)
        print("Create Order opened:", clicked)
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f"{FRAMES}/07_create_order_modal.png")
        print("07 create order modal ok")

        # --- SCENE 8: Highlight delivery type tabs (Next-Day / Same-Day / Priority) ---
        await page.evaluate("""
            () => {
                const btns = document.querySelectorAll('.modal button, .modal-content button');
                btns.forEach(b => {
                    const t = b.textContent.trim();
                    if (['Next-Day','Same-Day','Priority'].includes(t)) {
                        b.style.boxShadow = '0 0 0 4px rgba(16,185,129,0.55)';
                        b.style.transform = 'scale(1.05)';
                    }
                });
            }
        """)
        await page.wait_for_timeout(700)
        # Click Same-Day tab to show active state
        await page.evaluate("""
            () => {
                const btns = document.querySelectorAll('button');
                for (const b of btns) {
                    if (b.textContent.trim() === 'Same-Day') { b.click(); break; }
                }
            }
        """)
        await page.wait_for_timeout(900)
        await page.screenshot(path=f"{FRAMES}/08_create_order_types.png")
        print("08 create order types ok")

        # --- SCENE 9: Refrigeration / cold chain option ---
        # Click Priority tab and tick refrigerated
        await page.evaluate("""
            () => {
                const btns = document.querySelectorAll('button');
                for (const b of btns) {
                    if (b.textContent.trim() === 'Priority') { b.click(); break; }
                }
            }
        """)
        await page.wait_for_timeout(600)
        try:
            await page.check('#d-refrig')
        except Exception as e:
            print("refrig check:", e)
        # Highlight the refrigerated checkbox row
        await page.evaluate("""
            () => {
                const el = document.getElementById('d-refrig');
                if (el) {
                    const row = el.closest('label') || el.parentElement;
                    if (row) {
                        row.style.background = 'rgba(2,136,209,0.12)';
                        row.style.outline = '2px solid #0288d1';
                        row.style.padding = '8px';
                        row.style.borderRadius = '8px';
                        row.scrollIntoView({block:'center'});
                    }
                }
            }
        """)
        await page.wait_for_timeout(900)
        await page.screenshot(path=f"{FRAMES}/09_create_order_cold.png")
        print("09 cold chain ok")

        # Close modal
        await page.keyboard.press("Escape")
        await page.wait_for_timeout(500)
        await page.evaluate("document.querySelectorAll('.modal-close, [class*=close]').forEach(e=>{try{e.click()}catch{}})")
        await page.wait_for_timeout(600)

        # --- SCENE 10 & 11 & 12: Reports ---
        await page.goto(f"{BASE}/Pharmacy/Reports", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(3500)
        await page.screenshot(path=f"{FRAMES}/10_reports_top.png")
        print("10 reports top ok")

        await page.evaluate("window.scrollTo(0, 300)")
        await page.wait_for_timeout(1200)
        await page.screenshot(path=f"{FRAMES}/11_reports_monthly.png")
        print("11 reports monthly ok")

        try:
            await page.click("text=By Driver", timeout=3000)
            await page.wait_for_timeout(1500)
            await page.screenshot(path=f"{FRAMES}/12_reports_bydriver.png")
            print("12 reports by driver ok")
        except Exception as e:
            print("by driver click err:", e)
            await page.screenshot(path=f"{FRAMES}/12_reports_bydriver.png")

        # --- SCENE 13 & 14: Developers page ---
        await page.goto(f"{BASE}/developers", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2500)
        await page.screenshot(path=f"{FRAMES}/13_developers_top.png")
        print("13 developers top ok")

        await page.evaluate("window.scrollTo(0, 900)")
        await page.wait_for_timeout(1200)
        await page.screenshot(path=f"{FRAMES}/14_developers_endpoints.png")
        print("14 developers endpoints ok")

        await page.evaluate("window.scrollTo(0, 1800)")
        await page.wait_for_timeout(1200)
        await page.screenshot(path=f"{FRAMES}/15_developers_webhooks.png")
        print("15 developers webhooks ok")

        # --- SCENE 16: Closing ---
        await page.goto(f"{BASE}/", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(1500)
        await page.screenshot(path=f"{FRAMES}/16_closing.png")
        print("16 closing ok")

        await browser.close()

        print("\n---FILES---")
        for f in sorted(os.listdir(FRAMES)):
            p = os.path.join(FRAMES, f)
            print(f, os.path.getsize(p))


asyncio.run(run())
