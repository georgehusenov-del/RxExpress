"""Build RX Expresss Driver API Documentation (PDF)."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether,
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER

OUT = "/app/RX_Expresss_Driver_API_Docs.pdf"

PRIMARY = HexColor("#0d9488")   # teal
DARK = HexColor("#0b1220")
MUTED = HexColor("#475569")
BG_CODE = HexColor("#0f172a")
BG_CARD = HexColor("#f1f5f9")
BORDER = HexColor("#cbd5e1")
GREEN = HexColor("#16a34a")
AMBER = HexColor("#d97706")
RED = HexColor("#dc2626")
BLUE = HexColor("#2563eb")

styles = getSampleStyleSheet()
s_h1 = ParagraphStyle("h1", parent=styles["Heading1"], textColor=PRIMARY,
                      fontSize=26, leading=32, spaceAfter=8)
s_h2 = ParagraphStyle("h2", parent=styles["Heading2"], textColor=DARK,
                      fontSize=17, leading=22, spaceBefore=14, spaceAfter=6)
s_h3 = ParagraphStyle("h3", parent=styles["Heading3"], textColor=PRIMARY,
                      fontSize=13, leading=17, spaceBefore=10, spaceAfter=4)
s_body = ParagraphStyle("body", parent=styles["BodyText"], textColor=DARK,
                        fontSize=10.5, leading=15, spaceAfter=4)
s_muted = ParagraphStyle("muted", parent=s_body, textColor=MUTED, fontSize=9.5)
s_code = ParagraphStyle("code", parent=styles["Code"], textColor=white,
                        backColor=BG_CODE, fontSize=9, leading=12,
                        leftIndent=8, rightIndent=8,
                        spaceBefore=2, spaceAfter=6, fontName="Courier")
s_badge_ready = ParagraphStyle("br", parent=s_body, fontSize=9, leading=11,
                               textColor=white, backColor=GREEN,
                               alignment=TA_CENTER, borderPadding=3)
s_badge_pending = ParagraphStyle("bp", parent=s_body, fontSize=9, leading=11,
                                 textColor=white, backColor=AMBER,
                                 alignment=TA_CENTER, borderPadding=3)


def http_row(method, path):
    color_map = {"GET": BLUE, "POST": GREEN, "PUT": AMBER, "DELETE": RED}
    tbl = Table([[method, path]], colWidths=[1.8 * cm, None])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), color_map.get(method, PRIMARY)),
        ("TEXTCOLOR", (0, 0), (0, 0), white),
        ("BACKGROUND", (1, 0), (1, 0), BG_CODE),
        ("TEXTCOLOR", (1, 0), (1, 0), white),
        ("FONTNAME", (0, 0), (-1, -1), "Courier-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (0, 0), (0, 0), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return tbl


def code(txt):
    # Escape angle brackets for Paragraph
    t = txt.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    # Preserve newlines
    t = t.replace("\n", "<br/>")
    # Replace spaces with &nbsp; only at leading (indentation)
    lines = t.split("<br/>")
    out = []
    for ln in lines:
        stripped = ln.lstrip(" ")
        indent = len(ln) - len(stripped)
        out.append("&nbsp;" * indent + stripped)
    return Paragraph("<br/>".join(out), s_code)


def table_params(rows):
    data = [["Name", "Type", "Required", "Description"]] + rows
    tbl = Table(data, colWidths=[4.2 * cm, 2.8 * cm, 2.0 * cm, 7.0 * cm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.3, BORDER),
        ("BACKGROUND", (0, 1), (-1, -1), white),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, BG_CARD]),
        ("FONTNAME", (0, 1), (0, -1), "Courier"),
    ]))
    return tbl


def status_badge(ready):
    if ready:
        return Paragraph("<b>READY</b>", s_badge_ready)
    return Paragraph("<b>NOT READY YET</b>", s_badge_pending)


def screen_header(title, status_ready):
    hdr = Table(
        [[Paragraph(f"<b>{title}</b>", ParagraphStyle(
            "st", parent=s_h2, textColor=white, fontSize=15, leading=18)),
          status_badge(status_ready)]],
        colWidths=[None, 3.6 * cm],
    )
    hdr.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), DARK),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return hdr


def on_page(canv, doc):
    w, h = A4
    canv.saveState()
    # Header bar
    canv.setFillColor(DARK)
    canv.rect(0, h - 1.2 * cm, w, 1.2 * cm, stroke=0, fill=1)
    canv.setFillColor(white)
    canv.setFont("Helvetica-Bold", 11)
    canv.drawString(1.5 * cm, h - 0.8 * cm, "RX Expresss  \u2014  Driver API Documentation")
    canv.setFont("Helvetica", 9)
    canv.setFillColor(HexColor("#94a3b8"))
    canv.drawRightString(w - 1.5 * cm, h - 0.8 * cm, "v1  \u00b7  Internal")
    # Footer
    canv.setFillColor(MUTED)
    canv.setFont("Helvetica", 8.5)
    canv.drawString(1.5 * cm, 0.8 * cm,
                    "Base URL:  https://backend.rxexpresss.com/api   \u00b7   Auth: Bearer JWT (role = Driver)")
    canv.drawRightString(w - 1.5 * cm, 0.8 * cm, f"Page {doc.page}")
    canv.restoreState()


def build():
    doc = SimpleDocTemplate(
        OUT, pagesize=A4,
        leftMargin=1.5 * cm, rightMargin=1.5 * cm,
        topMargin=1.8 * cm, bottomMargin=1.4 * cm,
        title="RX Expresss Driver API Documentation",
        author="RX Expresss",
    )
    story = []

    # --- Cover ---
    story.append(Spacer(1, 1.2 * cm))
    story.append(Paragraph("RX Expresss", s_h1))
    story.append(Paragraph("Driver Side \u2014 API Documentation", ParagraphStyle(
        "sub", parent=s_h2, fontSize=20, textColor=DARK, leading=26)))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "This document describes the backend APIs that power the driver-facing screens in the RX Expresss pharmacy "
        "delivery platform. Each section maps one driver screen to the REST endpoints it consumes, along with the "
        "request payload, response shape, and the current implementation status.",
        s_body))
    story.append(Spacer(1, 0.4 * cm))

    # Quick facts card
    facts = [
        ["Base URL", "https://backend.rxexpresss.com/api"],
        ["Authentication", "Bearer JWT issued by POST /api/auth/login (role: Driver)"],
        ["Content-Type", "application/json"],
        ["Error format", '{ "detail": "message" }'],
        ["POD image format", "Base64 JPEG (3 photos required) + optional PNG signature"],
        ["Location ping interval", "Every 10\u201315 seconds while on duty"],
    ]
    tbl = Table(facts, colWidths=[4.5 * cm, None])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), BG_CARD),
        ("TEXTCOLOR", (0, 0), (-1, -1), DARK),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Courier"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("GRID", (0, 0), (-1, -1), 0.3, BORDER),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 0.5 * cm))

    # --- Table of contents ---
    story.append(Paragraph("Screens covered", s_h2))
    toc = [
        ["1.", "Login", "READY"],
        ["2.", "Forgot Password", "NOT READY YET"],
        ["3.", "Dashboard", "NOT READY YET"],
        ["4.", "Assigned Orders List", "READY"],
        ["5.", "Order Detail View", "READY"],
        ["6.", "Order QR Scanning", "READY"],
        ["7.", "Delivery History", "READY"],
    ]
    t = Table(toc, colWidths=[1 * cm, 8 * cm, None])
    t.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.3, BORDER),
        ("BACKGROUND", (0, 0), (-1, -1), white),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TEXTCOLOR", (2, 0), (2, -1), white),
        ("BACKGROUND", (2, 0), (2, 0), GREEN),
        ("BACKGROUND", (2, 1), (2, 1), AMBER),
        ("BACKGROUND", (2, 2), (2, 2), AMBER),
        ("BACKGROUND", (2, 3), (2, 3), GREEN),
        ("BACKGROUND", (2, 4), (2, 4), GREEN),
        ("BACKGROUND", (2, 5), (2, 5), GREEN),
        ("BACKGROUND", (2, 6), (2, 6), GREEN),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("ALIGN", (2, 0), (2, -1), "CENTER"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t)
    story.append(PageBreak())

    # =========================================================
    # 1. LOGIN
    # =========================================================
    story.append(screen_header("1. Login", True))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "The driver signs in with email + password to obtain a JWT. The same endpoint is used for all roles; the "
        "returned <b>role</b> field must equal <b>Driver</b>.", s_body))

    story.append(http_row("POST", "/api/auth/login"))
    story.append(Paragraph("Request body", s_h3))
    story.append(code('{\n  "email": "driver@test.com",\n  "password": "Driver@123"\n}'))
    story.append(Paragraph("Response 200", s_h3))
    story.append(code(
        '{\n  "token": "eyJhbGciOi...",\n  "user": {\n    "id": "5a1c...",\n    "email": "driver@test.com",\n'
        '    "firstName": "Test",\n    "lastName": "Driver",\n    "phone": "",\n    "role": "Driver",\n'
        '    "isActive": true,\n    "permissions": []\n  }\n}'))
    story.append(Paragraph("Error responses", s_h3))
    story.append(table_params([
        ["401", "Unauthorized", "\u2014", "Invalid credentials"],
        ["401", "Unauthorized", "\u2014", "Account is deactivated"],
    ]))
    story.append(Paragraph("cURL", s_h3))
    story.append(code(
        'curl -X POST https://backend.rxexpresss.com/api/auth/login \\\n'
        '  -H "Content-Type: application/json" \\\n'
        '  -d \'{"email":"driver@test.com","password":"Driver@123"}\''))
    story.append(PageBreak())

    # =========================================================
    # 2. FORGOT PASSWORD
    # =========================================================
    story.append(screen_header("2. Forgot Password", False))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "A backend stub exists: it generates a password-reset token, but the <b>email-delivery step is not wired "
        "up yet</b>. The endpoint therefore logs the token to the server console and always returns a generic "
        "success message (to prevent email enumeration).",
        s_body))
    story.append(Paragraph(
        "<b>Planned provider:</b> SendGrid / Twilio / Resend (pending decision). Until then the driver screen "
        "should display an information notice rather than call the endpoint.",
        s_muted))

    story.append(http_row("POST", "/api/auth/forgot-password"))
    story.append(Paragraph("Request body", s_h3))
    story.append(code('{\n  "email": "driver@test.com"\n}'))
    story.append(Paragraph("Response 200", s_h3))
    story.append(code('{\n  "message": "If an account exists, a reset link will be sent."\n}'))

    story.append(Paragraph("Pending work for full implementation", s_h3))
    story.append(Paragraph(
        "\u2022  Integrate email provider (SendGrid / Resend / Twilio) and send the reset token.<br/>"
        "\u2022  Add a companion <b>POST /api/auth/reset-password</b> endpoint that accepts <b>email</b>, "
        "<b>token</b>, and <b>newPassword</b>.<br/>"
        "\u2022  Build the <b>Reset Password</b> screen on the driver app.",
        s_body))
    story.append(PageBreak())

    # =========================================================
    # 3. DASHBOARD
    # =========================================================
    story.append(screen_header("3. Dashboard", False))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "A dedicated driver dashboard (today's KPIs, next stop card, earnings, on-duty toggle) is planned but "
        "<b>not yet implemented</b>. Today the driver app uses the <i>Assigned Orders</i> screen as the landing "
        "page. Some building blocks already exist and can be composed into the future dashboard:",
        s_body))

    story.append(Paragraph("Already available building blocks", s_h3))
    story.append(Paragraph(
        "\u2022  <b>GET /api/driver-portal/profile</b> \u2013 driver info (vehicle, rating, total deliveries).<br/>"
        "\u2022  <b>GET /api/driver-portal/deliveries</b> \u2013 active stops count.<br/>"
        "\u2022  <b>GET /api/driver-portal/history</b> \u2013 for today / week stats (client aggregates).<br/>"
        "\u2022  <b>PUT /api/driver-portal/status</b> \u2013 toggle on/off duty.",
        s_body))

    story.append(Paragraph("Proposed new endpoint (not implemented)", s_h3))
    story.append(http_row("GET", "/api/driver-portal/dashboard"))
    story.append(Paragraph("Proposed response shape", s_h3))
    story.append(code(
        '{\n  "driver": { "id": 1, "name": "Test Driver", "status": "on_duty", "rating": 4.9 },\n'
        '  "today": {\n    "assigned": 8,\n    "delivered": 5,\n    "failed": 0,\n    "earnings": 42.50,\n'
        '    "nextStop": { "orderNumber": "RX-QNS00001", "city": "Queens", "eta": "12 min" }\n  },\n'
        '  "week": { "delivered": 38, "earnings": 287.25 }\n}'))

    story.append(Paragraph("Current PUT /api/driver-portal/status (for duty toggle)", s_h3))
    story.append(http_row("PUT", "/api/driver-portal/status?status=on_duty"))
    story.append(code('// Body optional\n{ "status": "on_duty" }   // or "offline"'))
    story.append(PageBreak())

    # =========================================================
    # 4. ASSIGNED ORDERS LIST
    # =========================================================
    story.append(screen_header("4. Assigned Orders List", True))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "Returns all active stops belonging to the authenticated driver. An order appears in this list while its "
        "status is one of: <b>assigned</b>, <b>picked_up</b>, <b>dispatched</b>, <b>out_for_delivery</b>, "
        "<b>delivering_now</b>. Packages parked at the office (<b>in_transit</b>) are intentionally excluded.",
        s_body))

    story.append(http_row("GET", "/api/driver-portal/deliveries"))
    story.append(Paragraph("Response 200", s_h3))
    story.append(code(
        '{\n  "deliveries": [\n    {\n      "id": 12,\n      "orderNumber": "RX-QNS00001",\n'
        '      "trackingNumber": "TRK-QNS00001",\n      "qrCode": "QNS001",\n'
        '      "pharmacyName": "HealthFirst Pharmacy",\n      "deliveryType": "same_day",\n'
        '      "timeWindow": "9am-1pm",\n      "recipientName": "John Chen",\n'
        '      "recipientPhone": "5551234567",\n      "street": "123 Main St", "aptUnit": null,\n'
        '      "city": "Queens", "state": "NY", "postalCode": "11101",\n'
        '      "latitude": 40.7505, "longitude": -73.9934,\n'
        '      "status": "assigned", "copayAmount": 10.00, "copayCollected": false,\n'
        '      "deliveryNotes": null, "deliveryInstructions": "Leave with doorman",\n'
        '      "requiresSignature": true, "isRefrigerated": false,\n'
        '      "createdAt": "2026-04-18T12:30:00Z"\n    }\n  ],\n  "count": 1\n}'))

    story.append(Paragraph("Status transitions (driver-callable)", s_h3))
    story.append(http_row("PUT", "/api/driver-portal/deliveries/{id}/status?status=picked_up"))
    story.append(table_params([
        ["id", "int (path)", "yes", "Internal order id"],
        ["status", "string (query)", "yes", "picked_up \u00b7 in_transit \u00b7 dispatched \u00b7 out_for_delivery \u00b7 delivering_now"],
    ]))
    story.append(Paragraph(
        "<b>Side effects:</b> setting status to <b>picked_up</b> stamps <i>ActualPickupTime</i>. Setting it to "
        "<b>in_transit</b> automatically un-assigns the driver so admin can route from the office hub.", s_muted))
    story.append(PageBreak())

    # =========================================================
    # 5. ORDER DETAIL VIEW
    # =========================================================
    story.append(screen_header("5. Order Detail View", True))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "The driver app reuses the same <b>GET /api/driver-portal/deliveries</b> payload and renders one row as "
        "the detail view. All detail fields (recipient, address, phone, copay, cold-chain flag, special "
        "instructions) are already in that response. When the driver completes the stop, these three endpoints "
        "are called in sequence:",
        s_body))

    # 5a. Submit POD
    story.append(Paragraph("5.1  Submit Proof of Delivery (required)", s_h3))
    story.append(http_row("POST", "/api/driver-portal/deliveries/{id}/pod"))
    story.append(Paragraph("Request body (3-photo format, recommended)", s_h3))
    story.append(code(
        '{\n  "photoHomeBase64":    "data:image/jpeg;base64,/9j/4AAQ...",\n'
        '  "photoAddressBase64": "data:image/jpeg;base64,/9j/4AAQ...",\n'
        '  "photoPackageBase64": "data:image/jpeg;base64,/9j/4AAQ...",\n'
        '  "signatureBase64":    "data:image/png;base64,iVBORw...",   // optional\n'
        '  "recipientName": "John Chen",\n'
        '  "notes": "Left with doorman as instructed",\n'
        '  "latitude": 40.7505,\n  "longitude": -73.9934\n}'))
    story.append(Paragraph("Response 200", s_h3))
    story.append(code(
        '{\n  "success": true,\n  "message": "Delivery completed with POD",\n'
        '  "photoUrl": "/pod/pkg_RX-QNS00001_20260418T143522.jpg",\n'
        '  "photoHomeUrl":    "/pod/home_RX-QNS00001_20260418T143522.jpg",\n'
        '  "photoAddressUrl": "/pod/addr_RX-QNS00001_20260418T143522.jpg",\n'
        '  "photoPackageUrl": "/pod/pkg_RX-QNS00001_20260418T143522.jpg",\n'
        '  "signatureUrl":    "/pod/sig_RX-QNS00001_20260418T143522.png"\n}'))
    story.append(Paragraph("Error responses", s_h3))
    story.append(table_params([
        ["400", "Bad Request", "\u2014", "Photo of home is required"],
        ["400", "Bad Request", "\u2014", "Photo of address is required"],
        ["400", "Bad Request", "\u2014", "Photo of package at door is required"],
        ["400", "Bad Request", "\u2014", "Photo proof is required for delivery completion"],
        ["404", "Not Found", "\u2014", "Driver or order not found (or not assigned to you)"],
    ]))

    # 5b. Collect copay
    story.append(Paragraph("5.2  Mark copay as collected (optional)", s_h3))
    story.append(http_row("POST", "/api/driver-portal/deliveries/{id}/collect-copay"))
    story.append(code('// No body. Returns 200:\n{ "success": true, "message": "Copay of $10.00 collected" }'))

    # 5c. Location ping
    story.append(Paragraph("5.3  Live GPS ping (every 10\u201315 s while the screen is active)", s_h3))
    story.append(http_row("POST", "/api/driver-portal/location"))
    story.append(code(
        '{\n  "latitude": 40.7505,\n  "longitude": -73.9934,\n'
        '  "speed": 8.3,       // m/s, optional\n  "heading": 215.0,   // degrees, optional\n'
        '  "accuracy": 5.0     // meters, optional\n}'))
    story.append(PageBreak())

    # =========================================================
    # 6. QR / SCANNING
    # =========================================================
    story.append(screen_header("6. Order QR Scanning", True))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "When the driver scans the QR label on a prescription package, the app resolves the code against the "
        "server to verify the package and retrieve the matching order. The canonical scan endpoint is:",
        s_body))

    story.append(http_row("POST", "/api/admin/scan/{qrCode}"))
    story.append(Paragraph(
        "Although the route lives under <i>admin</i>, it is invoked by driver, pharmacy and admin apps alike to "
        "verify a package. Authenticated roles: <b>Admin, Manager, Operator, Pharmacy, Driver</b>.", s_muted))
    story.append(Paragraph("Response 200 (verified)", s_h3))
    story.append(code(
        '{\n  "verified": true,\n  "message": "Package verified!",\n'
        '  "package": {\n    "id": 12,\n    "orderNumber": "RX-QNS00001",\n'
        '    "qrCode": "QNS001",\n    "pharmacyName": "HealthFirst Pharmacy",\n'
        '    "recipientName": "John Chen",\n    "address": "123 Main St, Queens",\n'
        '    "status": "assigned",\n    "copayAmount": 10.00,\n    "copayCollected": false,\n'
        '    "driverName": "Test Driver"\n  }\n}'))
    story.append(Paragraph("Response 404 (unknown QR)", s_h3))
    story.append(code('{\n  "verified": false,\n  "detail": "No package found with this QR code"\n}'))

    story.append(Paragraph("Scan \u2192 Action flow (client-side)", s_h3))
    story.append(Paragraph(
        "1.  Driver scans QR with the phone camera.<br/>"
        "2.  App sends <b>POST /api/admin/scan/{qrCode}</b>.<br/>"
        "3.  If <i>verified</i>, app navigates to the matching stop in the Assigned Orders list.<br/>"
        "4.  Driver updates status (<i>picked_up</i> \u2192 <i>out_for_delivery</i>) or submits POD.",
        s_body))
    story.append(PageBreak())

    # =========================================================
    # 7. DELIVERY HISTORY
    # =========================================================
    story.append(screen_header("7. Delivery History", True))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "Returns the driver's last 50 closed orders (<b>delivered</b>, <b>failed</b>, or <b>cancelled</b>), "
        "newest first. The POD URLs are included so the screen can show a thumbnail of the delivery photo.",
        s_body))

    story.append(http_row("GET", "/api/driver-portal/history"))
    story.append(Paragraph("Response 200", s_h3))
    story.append(code(
        '{\n  "deliveries": [\n    {\n      "id": 12,\n      "orderNumber": "RX-QNS00001",\n'
        '      "qrCode": "QNS001",\n      "recipientName": "John Chen",\n'
        '      "recipientPhone": "5551234567",\n      "street": "123 Main St",\n'
        '      "city": "Queens", "state": "NY",\n      "status": "delivered",\n'
        '      "actualDeliveryTime": "2026-04-18T14:35:22Z",\n'
        '      "copayAmount": 10.00, "copayCollected": true,\n'
        '      "photoUrl": "/pod/pkg_RX-QNS00001_20260418T143522.jpg",\n'
        '      "signatureUrl": "/pod/sig_RX-QNS00001_20260418T143522.png",\n'
        '      "recipientNameSigned": "John Chen",\n      "isRefrigerated": false,\n'
        '      "deliveryNotes": "Left with doorman",\n'
        '      "updatedAt": "2026-04-18T14:35:22Z"\n    }\n  ],\n  "count": 1\n}'))

    story.append(Paragraph("Notes", s_h3))
    story.append(Paragraph(
        "\u2022  The list is capped at 50 rows server-side. Add client-side pagination/filters "
        "(by date range, status, or city) as the backlog grows.<br/>"
        "\u2022  <b>photoUrl</b> / <b>signatureUrl</b> are relative paths served by the API's static-file "
        "middleware (<code>/pod/*</code>).",
        s_body))
    story.append(PageBreak())

    # =========================================================
    # Appendix A: Statuses
    # =========================================================
    story.append(Paragraph("Appendix A \u2014 Order status vocabulary", s_h2))
    story.append(table_params([
        ["new", "string", "\u2014", "Order created by pharmacy, awaiting driver assignment"],
        ["assigned", "string", "\u2014", "Driver assigned, heading to pharmacy pickup"],
        ["picked_up", "string", "\u2014", "Driver has collected the package"],
        ["in_transit", "string", "\u2014", "Package dropped at office hub, awaiting reassign"],
        ["dispatched", "string", "\u2014", "Dispatched from office to delivery route"],
        ["out_for_delivery", "string", "\u2014", "Driver is on route to recipient"],
        ["delivering_now", "string", "\u2014", "Driver has arrived at recipient"],
        ["delivered", "string", "\u2014", "Completed with POD"],
        ["failed", "string", "\u2014", "Attempted but could not be handed over"],
        ["cancelled", "string", "\u2014", "Cancelled by pharmacy or admin"],
    ]))
    story.append(Spacer(1, 0.4 * cm))

    # Appendix B: Error model
    story.append(Paragraph("Appendix B \u2014 Error model", s_h2))
    story.append(Paragraph(
        "All endpoints return a consistent error envelope. Validation / authorization failures use HTTP 400 or "
        "401/403, resource lookups use 404, server issues use 500.",
        s_body))
    story.append(code('{\n  "detail": "Human readable message explaining what went wrong"\n}'))

    # Appendix C: Roles
    story.append(Paragraph("Appendix C \u2014 Auth & roles", s_h2))
    story.append(Paragraph(
        "Every <b>/api/driver-portal/*</b> endpoint is guarded by <b>[Authorize(Roles = \"Driver\")]</b>. The "
        "JWT returned by <b>/api/auth/login</b> must be sent on every subsequent request as:",
        s_body))
    story.append(code('Authorization: Bearer <token>'))

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    print(f"PDF created: {OUT}")


if __name__ == "__main__":
    build()
