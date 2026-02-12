import os
import logging
from typing import Optional
from twilio.rest import Client as TwilioClient
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content

logger = logging.getLogger(__name__)

# Twilio Configuration
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER")

# SendGrid Configuration
SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY")
SENDGRID_FROM_EMAIL = os.environ.get("SENDGRID_FROM_EMAIL", "getfastdelivery@rxexpresss.com")


class NotificationService:
    def __init__(self):
        # Initialize Twilio client if credentials are provided
        self.twilio_client = None
        if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
            try:
                self.twilio_client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
                logger.info("Twilio client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Twilio client: {e}")
        
        # Initialize SendGrid client if credentials are provided
        self.sendgrid_client = None
        if SENDGRID_API_KEY:
            try:
                self.sendgrid_client = SendGridAPIClient(SENDGRID_API_KEY)
                logger.info("SendGrid client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize SendGrid client: {e}")

    async def send_sms(self, to_phone: str, message: str) -> dict:
        """Send SMS notification via Twilio"""
        if not self.twilio_client:
            logger.warning("Twilio client not configured, SMS not sent")
            return {"success": False, "error": "Twilio not configured"}
        
        try:
            # Ensure phone number is in E.164 format
            if not to_phone.startswith("+"):
                to_phone = f"+1{to_phone}"  # Assume US number
            
            sms = self.twilio_client.messages.create(
                body=message,
                from_=TWILIO_PHONE_NUMBER,
                to=to_phone
            )
            logger.info(f"SMS sent successfully to {to_phone}, SID: {sms.sid}")
            return {"success": True, "message_sid": sms.sid}
        except Exception as e:
            logger.error(f"Failed to send SMS to {to_phone}: {e}")
            return {"success": False, "error": str(e)}

    async def send_email(self, to_email: str, subject: str, html_content: str, plain_content: Optional[str] = None) -> dict:
        """Send email notification via SendGrid"""
        if not self.sendgrid_client:
            logger.warning("SendGrid client not configured, email not sent")
            return {"success": False, "error": "SendGrid not configured"}
        
        try:
            message = Mail(
                from_email=Email(SENDGRID_FROM_EMAIL),
                to_emails=To(to_email),
                subject=subject,
                html_content=Content("text/html", html_content)
            )
            
            if plain_content:
                message.add_content(Content("text/plain", plain_content))
            
            response = self.sendgrid_client.send(message)
            logger.info(f"Email sent successfully to {to_email}, status: {response.status_code}")
            return {"success": True, "status_code": response.status_code}
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return {"success": False, "error": str(e)}

    async def send_order_confirmation(self, patient_email: str, patient_phone: str, order_data: dict) -> dict:
        """Send order confirmation to patient"""
        results = {"email": None, "sms": None}
        
        # Email notification
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #0066cc; color: white; padding: 20px; text-align: center;">
                <h1>RX Express</h1>
            </div>
            <div style="padding: 20px;">
                <h2>Order Confirmation</h2>
                <p>Your prescription order has been confirmed!</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Order Number:</strong> {order_data.get('order_number', 'N/A')}</p>
                    <p><strong>Status:</strong> {order_data.get('status', 'Pending')}</p>
                    <p><strong>Estimated Delivery:</strong> {order_data.get('estimated_delivery', 'Within 2 hours')}</p>
                </div>
                <p>We'll notify you when your delivery is on its way!</p>
                <p>Thank you for choosing RX Express.</p>
            </div>
            <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px;">
                <p>RX Express - Fast & Secure Pharmacy Delivery</p>
            </div>
        </body>
        </html>
        """
        
        if patient_email:
            results["email"] = await self.send_email(
                patient_email,
                f"Order Confirmed - {order_data.get('order_number', 'Your Order')}",
                html_content
            )
        
        # SMS notification
        sms_message = f"RX Express: Your order {order_data.get('order_number', '')} has been confirmed. Track at: {order_data.get('tracking_url', 'rxexpresss.com')}"
        if patient_phone:
            results["sms"] = await self.send_sms(patient_phone, sms_message)
        
        return results

    async def send_driver_assigned(self, patient_email: str, patient_phone: str, order_data: dict, driver_data: dict) -> dict:
        """Notify patient that driver has been assigned"""
        results = {"email": None, "sms": None}
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #0066cc; color: white; padding: 20px; text-align: center;">
                <h1>RX Express</h1>
            </div>
            <div style="padding: 20px;">
                <h2>Driver Assigned!</h2>
                <p>Great news! A driver has been assigned to your order.</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Order Number:</strong> {order_data.get('order_number', 'N/A')}</p>
                    <p><strong>Driver:</strong> {driver_data.get('name', 'N/A')}</p>
                    <p><strong>Vehicle:</strong> {driver_data.get('vehicle', 'N/A')}</p>
                    <p><strong>ETA:</strong> {order_data.get('eta', 'Calculating...')}</p>
                </div>
                <p>Track your delivery in real-time!</p>
            </div>
        </body>
        </html>
        """
        
        if patient_email:
            results["email"] = await self.send_email(
                patient_email,
                f"Driver Assigned - {order_data.get('order_number', '')}",
                html_content
            )
        
        sms_message = f"RX Express: Driver {driver_data.get('name', '')} is on the way with your order {order_data.get('order_number', '')}. ETA: {order_data.get('eta', 'Soon')}"
        if patient_phone:
            results["sms"] = await self.send_sms(patient_phone, sms_message)
        
        return results

    async def send_delivery_completed(self, patient_email: str, patient_phone: str, order_data: dict) -> dict:
        """Notify patient that delivery is complete"""
        results = {"email": None, "sms": None}
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
                <h1>Delivery Complete! ✓</h1>
            </div>
            <div style="padding: 20px;">
                <h2>Your order has been delivered!</h2>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Order Number:</strong> {order_data.get('order_number', 'N/A')}</p>
                    <p><strong>Delivered At:</strong> {order_data.get('delivered_at', 'N/A')}</p>
                    <p><strong>Received By:</strong> {order_data.get('received_by', 'N/A')}</p>
                </div>
                <p>Thank you for using RX Express!</p>
                <p>Please rate your delivery experience.</p>
            </div>
        </body>
        </html>
        """
        
        if patient_email:
            results["email"] = await self.send_email(
                patient_email,
                f"Delivered! - {order_data.get('order_number', '')}",
                html_content
            )
        
        sms_message = f"RX Express: Your order {order_data.get('order_number', '')} has been delivered. Thank you for choosing us!"
        if patient_phone:
            results["sms"] = await self.send_sms(patient_phone, sms_message)
        
        return results

    async def send_pharmacy_new_order(self, pharmacy_email: str, order_data: dict) -> dict:
        """Notify pharmacy of new order"""
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif;">
            <h2>New Delivery Order Received</h2>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
                <p><strong>Order Number:</strong> {order_data.get('order_number', 'N/A')}</p>
                <p><strong>Patient:</strong> {order_data.get('patient_name', 'N/A')}</p>
                <p><strong>Items:</strong> {order_data.get('items_count', 0)} prescription(s)</p>
                <p><strong>Scheduled Pickup:</strong> {order_data.get('scheduled_pickup', 'ASAP')}</p>
            </div>
            <p>Please prepare the order for pickup.</p>
        </body>
        </html>
        """
        
        return await self.send_email(
            pharmacy_email,
            f"New Order - {order_data.get('order_number', '')}",
            html_content
        )

    async def send_driver_new_assignment(self, driver_phone: str, order_data: dict) -> dict:
        """Notify driver of new delivery assignment"""
        sms_message = f"RX Express: New delivery assigned! Order {order_data.get('order_number', '')}. Pickup at: {order_data.get('pickup_address', 'Check app')}. Deliver to: {order_data.get('delivery_address', 'Check app')}"
        return await self.send_sms(driver_phone, sms_message)


# Singleton instance
notification_service = NotificationService()
