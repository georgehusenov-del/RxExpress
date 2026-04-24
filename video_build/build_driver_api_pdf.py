"""Build RX Expresss Driver API Documentation (PDF) - v2 (comprehensive)."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor, white
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak,
)
from reportlab.lib.enums import TA_CENTER

OUT = "/app/RX_Expresss_Driver_API_Docs.pdf"

PRIMARY = HexColor("#0d9488")
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
    t = txt.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    t = t.replace("\n", "<br/>")
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
    canv.setFillColor(DARK)
    canv.rect(0, h - 1.2 * cm, w, 1.2 * cm, stroke=0, fill=1)
    canv.setFillColor(white)
    canv.setFont("Helvetica-Bold", 11)
    canv.drawString(1.5 * cm, h - 0.8 * cm, "RX Expresss  \u2014  Driver API Documentation")
    canv.setFont("Helvetica", 9)
    canv.setFillColor(HexColor("#94a3b8"))
    canv.drawRightString(w - 1.5 * cm, h - 0.8 * cm, "v2  \u00b7  Internal")
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
    story.append(Paragraph("Driver Side \u2014 Complete API Reference", ParagraphStyle(
        "sub", parent=s_h2, fontSize=20, textColor=DARK, leading=26)))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "This document is a <b>build-ready reference</b> for any engineer building a driver mobile or web app "
        "against the RX Expresss platform. Every endpoint the driver app needs is listed here \u2014 auth, session, "
        "profile, duty toggle, office geo-lock, assigned stops, QR scanning, live GPS ping, status transitions, "
        "copay collection, Proof-of-Delivery (photos + signature), failed-attempt logging, delivery history, and "
        "customer-facing tracking links. Each screen is mapped to the REST calls it consumes with request payload, "
        "response shape, and implementation status.", s_body))
    story.append(Spacer(1, 0.4 * cm))

    facts = [
        ["Base URL", "https://backend.rxexpresss.com/api"],
        ["Authentication", "Bearer JWT issued by POST /api/auth/login (role: Driver)"],
        ["Content-Type", "application/json"],
        ["Error format", '{ "detail": "message" }'],
        ["POD image format", "Base64 JPEG (3 photos required) + optional PNG signature"],
        ["Location ping", "POST /driver-portal/location  (every 10\u201315 s while on duty)"],
        ["Static media", "/pod/* served by the API's static-file middleware"],
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

    # --- TOC ---
    story.append(Paragraph("Screens & modules covered", s_h2))
    toc = [
        ["1.", "Login  +  Session (GET /me)", "READY"],
        ["2.", "Forgot Password", "NOT READY YET"],
        ["3.", "Dashboard", "NOT READY YET"],
        ["4.", "Driver Profile  +  Duty Toggle", "READY"],
        ["5.", "Office Locations  (geo-lock / pickup hubs)", "READY"],
        ["6.", "Assigned Orders List  +  Status Transitions", "READY"],
        ["7.", "Order Detail View  (POD photos + signature + copay + GPS)", "READY"],
        ["8.", "Order QR Scanning", "READY"],
        ["9.", "Failed Delivery / Log Attempt", "READY"],
        ["10.", "Delivery History", "READY"],
        ["11.", "Customer-facing Tracking Link", "READY"],
    ]
    t = Table(toc, colWidths=[1 * cm, 9.8 * cm, None])
    sty = [
        ("GRID", (0, 0), (-1, -1), 0.3, BORDER),
        ("BACKGROUND", (0, 0), (-1, -1), white),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TEXTCOLOR", (2, 0), (2, -1), white),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("ALIGN", (2, 0), (2, -1), "CENTER"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    ready_rows = {0, 3, 4, 5, 6, 7, 8, 9, 10}
    for i in range(len(toc)):
        color = GREEN if i in ready_rows else AMBER
        sty.append(("BACKGROUND", (2, i), (2, i), color))
    t.setStyle(TableStyle(sty))
    story.append(t)
    story.append(PageBreak())

    # ================= 1. LOGIN + /me =================
    story.append(screen_header("1. Login  +  Session", True))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "The driver signs in with email + password and receives a JWT. All subsequent calls must include "
        "<b>Authorization: Bearer &lt;token&gt;</b>. After launch, call <b>GET /api/auth/me</b> to validate the "
        "stored token and restore the session.", s_body))

    story.append(http_row("POST", "/api/auth/login"))
    story.append(Paragraph("Request body", s_h3))
    story.append(code('{\n  "email": "driver@test.com",\n  "password": "Driver@123"\n}'))
    story.append(Paragraph("Response 200", s_h3))
    story.append(code(
        '{\n  "token": "eyJhbGciOi...",\n  "user": {\n    "id": "5a1c...",\n    "email": "driver@test.com",\n'
        '    "firstName": "Test", "lastName": "Driver", "phone": "",\n'
        '    "role": "Driver", "isActive": true, "permissions": []\n  }\n}'))
    story.append(Paragraph("Errors", s_h3))
    story.append(table_params([
        ["401", "Unauthorized", "\u2014", "Invalid credentials"],
        ["401", "Unauthorized", "\u2014", "Account is deactivated"],
    ]))

    story.append(Paragraph("1.1  Restore session / current user", s_h3))
    story.append(http_row("GET", "/api/auth/me"))
    story.append(code(
        '// Response 200\n{\n  "id": "5a1c...",\n  "email": "driver@test.com",\n'
        '  "firstName": "Test", "lastName": "Driver", "phone": "",\n'
        '  "role": "Driver", "isActive": true\n}'))
    story.append(Paragraph(
        "<b>Client note:</b> JWTs are stateless; there is no explicit logout endpoint. To \u201clog out\u201d the driver "
        "app simply discards the stored token. Token lifetime is configured on the server side.", s_muted))
    story.append(PageBreak())

    # ================= 2. FORGOT PASSWORD =================
    story.append(screen_header("2. Forgot Password", False))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "A backend stub exists and generates a password-reset token, but the <b>email-delivery step is not wired "
        "up yet</b>. The endpoint currently logs the token to the server console and always returns a generic "
        "success message (to prevent email enumeration). Planned provider: SendGrid / Twilio / Resend (pending "
        "decision).", s_body))

    story.append(http_row("POST", "/api/auth/forgot-password"))
    story.append(code('// Request\n{ "email": "driver@test.com" }'))
    story.append(code('// Response 200\n{ "message": "If an account exists, a reset link will be sent." }'))

    story.append(Paragraph("Pending work", s_h3))
    story.append(Paragraph(
        "\u2022  Integrate email provider and send the token to the driver.<br/>"
        "\u2022  Add a companion <b>POST /api/auth/reset-password</b> that accepts <i>email</i>, <i>token</i>, "
        "and <i>newPassword</i>.<br/>"
        "\u2022  Add a <b>Reset Password</b> screen on the driver app that deep-links from the email.",
        s_body))
    story.append(PageBreak())

    # ================= 3. DASHBOARD =================
    story.append(screen_header("3. Dashboard", False))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "A dedicated driver dashboard (today's KPIs, next stop card, earnings, on-duty toggle) is planned but "
        "<b>not yet implemented</b>. The driver app currently uses the <i>Assigned Orders</i> list as its landing "
        "page. Today\u2019s / week\u2019s stats can be aggregated client-side from the endpoints in sections 4, 6 and 10.",
        s_body))

    story.append(Paragraph("Proposed endpoint (not yet implemented)", s_h3))
    story.append(http_row("GET", "/api/driver-portal/dashboard"))
    story.append(code(
        '{\n  "driver": { "id": 1, "name": "Test Driver", "status": "on_duty", "rating": 4.9 },\n'
        '  "today": {\n    "assigned": 8, "delivered": 5, "failed": 0, "earnings": 42.50,\n'
        '    "nextStop": { "orderNumber": "RX-QNS00001", "city": "Queens", "eta": "12 min" }\n  },\n'
        '  "week": { "delivered": 38, "earnings": 287.25 }\n}'))
    story.append(PageBreak())

    # ================= 4. DRIVER PROFILE + DUTY =================
    story.append(screen_header("4. Driver Profile  +  Duty Toggle", True))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph("4.1  Get the driver's own profile", s_h3))
    story.append(http_row("GET", "/api/driver-portal/profile"))
    story.append(code(
        '{\n  "id": 1,\n  "userId": "5a1c...",\n  "vehicleType": "car",\n  "vehicleNumber": "NY-ABC-123",\n'
        '  "licenseNumber": "D1234567",\n  "status": "on_duty",\n  "rating": 4.9,\n'
        '  "totalDeliveries": 287,\n  "isVerified": true\n}'))
    story.append(Paragraph(
        "<b>Client use:</b> render the top bar (name, vehicle, rating, badges) and gate certain actions on "
        "<i>isVerified</i>.", s_muted))

    story.append(Paragraph("4.2  Go on / off duty", s_h3))
    story.append(http_row("PUT", "/api/driver-portal/status?status=on_duty"))
    story.append(code(
        '// Status can also be sent in the body:\n{ "status": "on_duty" }   // valid: on_duty, offline, on_break'))
    story.append(code('// Response 200\n{ "message": "Status updated to on_duty" }'))
    story.append(Paragraph(
        "While status is anything other than <b>offline</b>, the driver app should start the GPS ping loop "
        "(section 7.3) and enable the order list.", s_muted))
    story.append(PageBreak())

    # ================= 5. OFFICE LOCATIONS =================
    story.append(screen_header("5. Office Locations  (geo-lock / pickup hubs)", True))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "Pickup hubs are defined by admin with a latitude / longitude and an acceptance radius. The driver app "
        "uses this list to (a) render the map of hubs, (b) geo-lock the \u201cPick-up\u201d button so it only activates "
        "when the driver is within <i>radiusMeters</i> of an active office, and (c) pick the default hub on first "
        "launch.", s_body))

    story.append(http_row("GET", "/api/driver-portal/office-locations"))
    story.append(code(
        '{\n  "offices": [\n    {\n      "id": 1,\n      "name": "Queens Hub",\n'
        '      "address": "45-10 Northern Blvd",\n      "city": "Queens",\n'
        '      "latitude": 40.7505, "longitude": -73.9934,\n'
        '      "radiusMeters": 150,\n      "isDefault": true\n    }\n  ]\n}'))
    story.append(PageBreak())

    # ================= 6. ASSIGNED ORDERS =================
    story.append(screen_header("6. Assigned Orders List  +  Status Transitions", True))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "Returns all active stops assigned to the authenticated driver. Orders appear while their status is one "
        "of: <b>assigned, picked_up, dispatched, out_for_delivery, delivering_now</b>. Packages parked at the "
        "office hub (<b>in_transit</b>) are intentionally excluded.", s_body))

    story.append(http_row("GET", "/api/driver-portal/deliveries"))
    story.append(Paragraph("Response 200 (one stop shown)", s_h3))
    story.append(code(
        '{\n  "deliveries": [\n    {\n      "id": 12,\n      "orderNumber": "RX-QNS00001",\n'
        '      "trackingNumber": "TRK-QNS00001", "qrCode": "QNS001",\n'
        '      "pharmacyName": "HealthFirst Pharmacy",\n'
        '      "deliveryType": "same_day", "timeWindow": "9am-1pm",\n'
        '      "recipientName": "John Chen", "recipientPhone": "5551234567",\n'
        '      "street": "123 Main St", "aptUnit": null,\n'
        '      "city": "Queens", "state": "NY", "postalCode": "11101",\n'
        '      "latitude": 40.7505, "longitude": -73.9934,\n'
        '      "status": "assigned", "copayAmount": 10.00, "copayCollected": false,\n'
        '      "deliveryNotes": null, "deliveryInstructions": "Leave with doorman",\n'
        '      "requiresSignature": true, "isRefrigerated": false,\n'
        '      "createdAt": "2026-04-18T12:30:00Z"\n    }\n  ],\n  "count": 1\n}'))

    story.append(Paragraph("6.1  Update stop status", s_h3))
    story.append(http_row("PUT", "/api/driver-portal/deliveries/{id}/status?status=picked_up"))
    story.append(table_params([
        ["id", "int (path)", "yes", "Internal order id"],
        ["status", "string (query)", "yes", "picked_up \u00b7 in_transit \u00b7 dispatched \u00b7 out_for_delivery \u00b7 delivering_now"],
    ]))
    story.append(Paragraph(
        "<b>Server side effects:</b> setting status to <b>picked_up</b> stamps <i>actualPickupTime</i>. Setting "
        "it to <b>in_transit</b> automatically un-assigns the driver so admin can route from the office hub.",
        s_muted))
    story.append(PageBreak())

    # ================= 7. ORDER DETAIL + POD =================
    story.append(screen_header("7. Order Detail View  (POD + copay + GPS)", True))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "The driver app reuses the <i>GET /api/driver-portal/deliveries</i> payload for rendering the detail view "
        "(no separate detail endpoint). When the driver completes a stop, the following calls run in order:",
        s_body))

    story.append(Paragraph("7.1  Submit Proof of Delivery  (photos + optional signature)", s_h3))
    story.append(http_row("POST", "/api/driver-portal/deliveries/{id}/pod"))
    story.append(Paragraph("Request body \u2014 recommended 3-photo format", s_h3))
    story.append(code(
        '{\n  "photoHomeBase64":    "data:image/jpeg;base64,/9j/4AAQ...",\n'
        '  "photoAddressBase64": "data:image/jpeg;base64,/9j/4AAQ...",\n'
        '  "photoPackageBase64": "data:image/jpeg;base64,/9j/4AAQ...",\n'
        '  "signatureBase64":    "data:image/png;base64,iVBORw...",   // optional\n'
        '  "recipientName": "John Chen",\n'
        '  "notes": "Left with doorman as instructed",\n'
        '  "latitude": 40.7505,\n  "longitude": -73.9934\n}'))
    story.append(table_params([
        ["photoHomeBase64", "string (base64)", "yes*", "Photo 1 \u2014 the home / building exterior"],
        ["photoAddressBase64", "string (base64)", "yes*", "Photo 2 \u2014 the address plaque / number"],
        ["photoPackageBase64", "string (base64)", "yes*", "Photo 3 \u2014 the package at the door"],
        ["signatureBase64", "string (base64)", "no", "PNG of handwritten signature (required if requiresSignature=true)"],
        ["recipientName", "string", "no", "Name of the person who signed / received"],
        ["notes", "string", "no", "Free-form delivery notes"],
        ["latitude / longitude", "double", "no", "GPS at the moment of drop"],
        ["photoBase64", "string (base64)", "legacy", "Single-photo fallback. Use only if 3-photo capture is impossible"],
    ]))
    story.append(Paragraph(
        "<i>*</i> All three photos are required when using the recommended format. If the legacy single-photo "
        "fallback is used (<b>photoBase64</b> alone), the server still accepts it for backward compatibility.",
        s_muted))

    story.append(Paragraph("Response 200", s_h3))
    story.append(code(
        '{\n  "success": true,\n  "message": "Delivery completed with POD",\n'
        '  "photoUrl": "/pod/pkg_RX-QNS00001_20260418T143522.jpg",\n'
        '  "photoHomeUrl":    "/pod/home_RX-QNS00001_20260418T143522.jpg",\n'
        '  "photoAddressUrl": "/pod/addr_RX-QNS00001_20260418T143522.jpg",\n'
        '  "photoPackageUrl": "/pod/pkg_RX-QNS00001_20260418T143522.jpg",\n'
        '  "signatureUrl":    "/pod/sig_RX-QNS00001_20260418T143522.png"\n}'))
    story.append(Paragraph("Errors", s_h3))
    story.append(table_params([
        ["400", "Bad Request", "\u2014", "Photo of home / address / package is required"],
        ["400", "Bad Request", "\u2014", "Photo proof is required for delivery completion"],
        ["400", "Bad Request", "\u2014", "Failed to save photos. Please try again."],
        ["404", "Not Found", "\u2014", "Driver or order not found (or not assigned to you)"],
    ]))

    story.append(Paragraph("Server side effects", s_h3))
    story.append(Paragraph(
        "\u2022  Status \u2192 <b>delivered</b>, <b>actualDeliveryTime</b> is stamped.<br/>"
        "\u2022  Three JPEGs are saved to <b>/pod/</b>; legacy <b>photoUrl</b> is aliased to the package photo.<br/>"
        "\u2022  If provided, the signature PNG is saved and <b>recipientNameSigned</b> is persisted.<br/>"
        "\u2022  Driver's <b>totalDeliveries</b> counter is incremented.",
        s_body))

    story.append(Paragraph("7.2  Mark copay as collected", s_h3))
    story.append(http_row("POST", "/api/driver-portal/deliveries/{id}/collect-copay"))
    story.append(code('// No body. Response 200:\n{ "success": true, "message": "Copay of $10.00 collected" }'))

    story.append(Paragraph("7.3  Live GPS ping", s_h3))
    story.append(http_row("POST", "/api/driver-portal/location"))
    story.append(code(
        '{\n  "latitude": 40.7505,\n  "longitude": -73.9934,\n'
        '  "speed": 8.3,       // m/s, optional\n'
        '  "heading": 215.0,   // degrees, optional\n'
        '  "accuracy": 5.0     // meters, optional\n}'))
    story.append(Paragraph(
        "Call every 10\u201315 seconds while the driver is on duty. Each ping updates the driver\u2019s current position "
        "and is also appended to the <i>DriverLocationLog</i> history used by admin for the breadcrumb trail and "
        "by customers for live tracking.", s_muted))
    story.append(PageBreak())

    # ================= 8. QR SCANNING =================
    story.append(screen_header("8. Order QR Scanning", True))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "When the driver scans the QR label on a package, the app resolves the code against the server to verify "
        "the package and retrieve the matching order. The endpoint is shared across Admin, Pharmacy and Driver "
        "roles.", s_body))

    story.append(http_row("POST", "/api/admin/scan/{qrCode}"))
    story.append(Paragraph("Response 200 (verified)", s_h3))
    story.append(code(
        '{\n  "verified": true,\n  "message": "Package verified!",\n'
        '  "package": {\n    "id": 12, "orderNumber": "RX-QNS00001", "qrCode": "QNS001",\n'
        '    "pharmacyName": "HealthFirst Pharmacy",\n'
        '    "recipientName": "John Chen", "address": "123 Main St, Queens",\n'
        '    "status": "assigned", "copayAmount": 10.00, "copayCollected": false,\n'
        '    "driverName": "Test Driver"\n  }\n}'))
    story.append(Paragraph("Response 404 (unknown QR)", s_h3))
    story.append(code('{\n  "verified": false,\n  "detail": "No package found with this QR code"\n}'))

    story.append(Paragraph("Scan \u2192 Action flow (client-side)", s_h3))
    story.append(Paragraph(
        "1.  Driver scans QR with the phone camera.<br/>"
        "2.  App sends <b>POST /api/admin/scan/{qrCode}</b>.<br/>"
        "3.  If <i>verified</i>, app navigates to the matching stop in the Assigned Orders list.<br/>"
        "4.  Driver updates status (<i>picked_up</i> \u2192 <i>out_for_delivery</i>) or submits POD (section 7.1).",
        s_body))
    story.append(PageBreak())

    # ================= 9. FAILED DELIVERY ATTEMPT =================
    story.append(screen_header("9. Failed Delivery / Log Attempt", True))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "When the driver cannot complete a delivery (recipient not home, wrong address, refused, etc.), instead "
        "of submitting POD the app should log an <b>attempt</b>. Each call increments the server-side failure "
        "counter; after two or more failures the response signals that the order can be <i>duplicated</i> with a "
        "new QR code.", s_body))

    story.append(http_row("POST", "/api/admin/orders/{id}/log-attempt"))
    story.append(Paragraph("Request body", s_h3))
    story.append(code(
        '{\n  "status": "failed",                   // "failed" or "delivered"\n'
        '  "driverName": "Test Driver",           // optional; defaults to order.DriverName\n'
        '  "failureReason": "recipient_not_home", // free-form: wrong_address, refused, no_access, etc.\n'
        '  "notes": "Called 3x, no answer. Attempted at 14:05."\n}'))
    story.append(Paragraph("Response 200", s_h3))
    story.append(code(
        '{\n  "message": "Attempt logged: failed",\n'
        '  "failedAttempts": 2,\n'
        '  "canDuplicate": true,\n'
        '  "duplicateMessage": "This order has failed 2+ times. You can duplicate it with a new QR code."\n}'))
    story.append(Paragraph(
        "<b>Client UX:</b> if <i>canDuplicate</i> is true, show the pharmacy / admin the \u201cDuplicate with new QR\u201d "
        "CTA in their portal. The driver simply sees a \u201creport attempt\u201d confirmation.", s_muted))
    story.append(PageBreak())

    # ================= 10. DELIVERY HISTORY =================
    story.append(screen_header("10. Delivery History", True))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "Returns the driver\u2019s last 50 closed orders (<b>delivered</b>, <b>failed</b>, or <b>cancelled</b>), "
        "newest first. POD URLs are included so the screen can render thumbnails.", s_body))

    story.append(http_row("GET", "/api/driver-portal/history"))
    story.append(code(
        '{\n  "deliveries": [\n    {\n      "id": 12, "orderNumber": "RX-QNS00001", "qrCode": "QNS001",\n'
        '      "recipientName": "John Chen", "recipientPhone": "5551234567",\n'
        '      "street": "123 Main St", "city": "Queens", "state": "NY",\n'
        '      "status": "delivered",\n      "actualDeliveryTime": "2026-04-18T14:35:22Z",\n'
        '      "copayAmount": 10.00, "copayCollected": true,\n'
        '      "photoUrl": "/pod/pkg_RX-QNS00001_20260418T143522.jpg",\n'
        '      "signatureUrl": "/pod/sig_RX-QNS00001_20260418T143522.png",\n'
        '      "recipientNameSigned": "John Chen", "isRefrigerated": false,\n'
        '      "deliveryNotes": "Left with doorman",\n'
        '      "updatedAt": "2026-04-18T14:35:22Z"\n    }\n  ],\n  "count": 1\n}'))
    story.append(Paragraph(
        "Capped at 50 rows server-side. Add client-side filters (date range, status, city) or extend the "
        "endpoint with <i>limit</i> / <i>offset</i> as the backlog grows.", s_muted))
    story.append(PageBreak())

    # ================= 11. CUSTOMER TRACKING =================
    story.append(screen_header("11. Customer-facing Tracking Link", True))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "The driver app does not usually call this endpoint directly, but builders often need it to generate the "
        "\u201cshare tracking link with patient\u201d feature. It returns the status timeline plus the driver\u2019s current "
        "position when the order is in flight. Authentication is via the pharmacy\u2019s integration API key (not JWT).",
        s_body))

    story.append(http_row("GET", "/api/v1/orders/{identifier}/tracking"))
    story.append(Paragraph(
        "<b>Headers:</b> <b>X-API-Key</b> and <b>X-API-Secret</b> (issued to the pharmacy by admin). "
        "<b>identifier</b> can be the internal id, the <i>orderNumber</i>, or the <i>trackingNumber</i>.", s_muted))
    story.append(code(
        '{\n  "orderNumber": "RX-QNS00001",\n  "status": "out_for_delivery",\n'
        '  "events": [\n    { "status": "new",        "description": "Order placed",           "timestamp": "..." },\n'
        '    { "status": "picked_up",  "description": "Picked up from pharmacy", "timestamp": "..." },\n'
        '    { "status": "out_for_delivery", "description": "Out for delivery", "timestamp": "..." }\n'
        '  ],\n  "driver": {\n    "latitude": 40.7512, "longitude": -73.9901,\n'
        '    "lastUpdate": "2026-04-18T14:30:10Z"\n  }\n}'))
    story.append(PageBreak())

    # ================= APPENDICES =================
    story.append(Paragraph("Appendix A \u2014 Order status vocabulary", s_h2))
    story.append(table_params([
        ["new", "string", "\u2014", "Created by pharmacy, awaiting driver assignment"],
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
    story.append(Spacer(1, 0.3 * cm))

    story.append(Paragraph("Appendix B \u2014 End-to-end driver flow", s_h2))
    story.append(Paragraph(
        "<b>Start of shift</b><br/>"
        "1.  <i>POST /api/auth/login</i> \u2192 store JWT<br/>"
        "2.  <i>GET /api/auth/me</i> \u2192 validate session<br/>"
        "3.  <i>GET /api/driver-portal/profile</i> \u2192 render header<br/>"
        "4.  <i>GET /api/driver-portal/office-locations</i> \u2192 render pickup hubs on map<br/>"
        "5.  <i>PUT /api/driver-portal/status?status=on_duty</i> \u2192 go on duty<br/>"
        "6.  Start GPS loop: <i>POST /api/driver-portal/location</i> every 10\u201315 s<br/><br/>"

        "<b>Pickup at pharmacy / office</b><br/>"
        "7.  <i>GET /api/driver-portal/deliveries</i> \u2192 refresh list<br/>"
        "8.  Scan package QR \u2192 <i>POST /api/admin/scan/{qrCode}</i><br/>"
        "9.  <i>PUT /api/driver-portal/deliveries/{id}/status?status=picked_up</i><br/><br/>"

        "<b>On route</b><br/>"
        "10.  <i>PUT .../status?status=out_for_delivery</i> when leaving the hub<br/>"
        "11.  <i>PUT .../status?status=delivering_now</i> on arrival<br/><br/>"

        "<b>At recipient \u2014 successful delivery</b><br/>"
        "12.  Capture 3 photos (home, address, package) + optional signature<br/>"
        "13.  <i>POST /api/driver-portal/deliveries/{id}/pod</i>  \u2190  photos + signature uploaded<br/>"
        "14.  If copay &gt; 0: <i>POST /api/driver-portal/deliveries/{id}/collect-copay</i><br/><br/>"

        "<b>At recipient \u2014 failed attempt</b><br/>"
        "12a.  <i>POST /api/admin/orders/{id}/log-attempt</i> with <i>status=failed</i> + reason<br/><br/>"

        "<b>End of shift</b><br/>"
        "15.  <i>PUT /api/driver-portal/status?status=offline</i> \u2192 stop GPS loop<br/>"
        "16.  Optional: <i>GET /api/driver-portal/history</i> to render today\u2019s summary",
        s_body))
    story.append(Spacer(1, 0.3 * cm))

    story.append(Paragraph("Appendix C \u2014 Error model & auth", s_h2))
    story.append(Paragraph(
        "All endpoints return a consistent error envelope. Validation / auth failures use 400 or 401/403, "
        "lookups use 404, server issues use 500.", s_body))
    story.append(code('{ "detail": "Human readable message explaining what went wrong" }'))
    story.append(Paragraph(
        "Every <b>/api/driver-portal/*</b> endpoint is guarded by <b>[Authorize(Roles = \"Driver\")]</b>. Send:",
        s_body))
    story.append(code('Authorization: Bearer <token>'))

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    print(f"PDF created: {OUT}")


if __name__ == "__main__":
    build()
