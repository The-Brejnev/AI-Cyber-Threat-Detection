import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import concurrent.futures
from app.config import settings
import logging

logger = logging.getLogger(__name__)
executor = concurrent.futures.ThreadPoolExecutor(max_workers=3)

def _clean_credentials():
    username = (settings.EMAIL_USERNAME or "").strip()
    password = (settings.EMAIL_PASSWORD or "").replace(" ", "").strip()
    return username, password

def _send_email_sync(to_email: str, subject: str, html_body: str) -> bool:
    username, password = _clean_credentials()
    if not username or username == "CHANGE_ME" or not password:
        logger.warning(f"[EMAIL NOT CONFIGURED] To={to_email}, Subject='{subject}'")
        return False

    try:
        msg = MIMEMultipart()
        # For Gmail SMTP, the From address MUST match the authenticated username or an authorized alias
        from_display_name = settings.EMAIL_FROM_NAME or "CyberGuard AI SOC Authority"
        msg['From'] = f"{from_display_name} <{username}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(html_body, 'html'))
        
        server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT, timeout=15)
        server.starttls()
        server.login(username, password)
        server.send_message(msg)
        server.quit()
        logger.info(f"Real-time email successfully delivered to {to_email} via Gmail SMTP")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email} via SMTP: {e}", exc_info=True)
        return False

async def _send_email(to_email: str, subject: str, html_body: str) -> bool:
    import asyncio
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(executor, _send_email_sync, to_email, subject, html_body)

async def send_otp_email(to_email: str, otp: str, purpose: str) -> bool:
    purpose_label = purpose.replace('_', ' ').title()
    subject = f"Your {purpose_label} Verification Code — CyberGuard AI"
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0e1a; color: #ffffff; margin: 0; padding: 30px;">
        <div style="max-width: 540px; margin: 0 auto; background-color: #0f1729; border: 1px solid #1e2d4a; border-radius: 12px; padding: 32px; box-shadow: 0 8px 24px rgba(0,0,0,0.5);">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #00d4ff; font-size: 24px; margin: 0 0 8px 0; letter-spacing: 0.5px;">🛡️ CyberGuard AI</h1>
                <p style="color: #64748b; font-size: 14px; margin: 0;">SOC & Threat Intelligence Platform</p>
            </div>
            <div style="background-color: #141d35; border: 1px solid #1e2d4a; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                <p style="color: #94a3b8; font-size: 14px; margin: 0 0 12px 0;">Your verification code for <strong>{purpose_label}</strong> is:</p>
                <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #00d4ff; font-family: 'Courier New', monospace; padding: 8px 0;">{otp}</div>
            </div>
            <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 16px 0 0 0;">
                ⏱️ This code will expire in <strong>10 minutes</strong>.<br>
                🔒 If you did not request this verification code, please ignore this email or check your account security.
            </p>
            <div style="border-top: 1px solid #1e2d4a; margin-top: 24px; padding-top: 16px; text-align: center;">
                <p style="color: #475569; font-size: 12px; margin: 0;">Automated security notification from CyberGuard AI Threat Detection System</p>
            </div>
        </div>
    </body>
    </html>
    """
    logger.info(f"[OTP REQUEST] Target={to_email}, Purpose={purpose}, Code={otp}")
    return await _send_email(to_email, subject, html_body)

async def send_threat_alert_email(to_email: str, threat_data: dict) -> bool:
    severity = threat_data.get('severity', 'HIGH')
    threat_type = threat_data.get('threat_type', 'Suspicious Activity')
    source_ip = threat_data.get('source_ip', 'Unknown')
    dest_ip = threat_data.get('destination_ip', '10.201.64.21')
    
    subject = f"⚠️ SECURITY ALERT: {severity} Threat Detected [{threat_type}] — CyberGuard AI"
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0e1a; color: #ffffff; margin: 0; padding: 30px;">
        <div style="max-width: 540px; margin: 0 auto; background-color: #0f1729; border: 1px solid #ef4444; border-radius: 12px; padding: 32px;">
            <h2 style="color: #ef4444; margin: 0 0 12px 0;">⚠️ Security Threat Detected</h2>
            <p style="color: #cbd5e1; font-size: 14px;">An active attack targeted your authorized proxy / system endpoint:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; color: #ffffff; font-size: 14px;">
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #1e2d4a; color: #94a3b8;">Threat Type:</td><td style="padding: 8px 0; border-bottom: 1px solid #1e2d4a; font-weight: bold; color: #ffffff;">{threat_type}</td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #1e2d4a; color: #94a3b8;">Severity:</td><td style="padding: 8px 0; border-bottom: 1px solid #1e2d4a; font-weight: bold; color: #ef4444;">{severity}</td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #1e2d4a; color: #94a3b8;">Attacker IP:</td><td style="padding: 8px 0; border-bottom: 1px solid #1e2d4a; font-family: monospace; color: #ef4444;">{source_ip}</td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #1e2d4a; color: #94a3b8;">Target Authorized IP:</td><td style="padding: 8px 0; border-bottom: 1px solid #1e2d4a; font-family: monospace; color: #00d4ff;">{dest_ip}</td></tr>
            </table>
            <p style="color: #94a3b8; font-size: 13px;">Log in to your CyberGuard dashboard to review full defense records.</p>
        </div>
    </body>
    </html>
    """
    return await _send_email(to_email, subject, html_body)

async def send_admin_advisory_email(to_email: str, notice_data: dict) -> bool:
    title = notice_data.get('title', 'Official Security Advisory')
    message = notice_data.get('message', '')
    sender_role = notice_data.get('sender_role', 'Administrator').upper()
    sender_email = notice_data.get('sender_email', 'SOC Team')
    proxy_ip = notice_data.get('proxy_ip', '10.201.64.21')
    attacker_ip = notice_data.get('attacker_ip', None)
    severity = notice_data.get('severity', 'HIGH')

    subject = f"🛡️ [OFFICIAL SOC DIRECTIVE] {title} — CyberGuard AI"
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0e1a; color: #ffffff; margin: 0; padding: 30px;">
        <div style="max-width: 560px; margin: 0 auto; background-color: #0f1729; border: 1px solid #00d4ff; border-radius: 14px; padding: 32px; box-shadow: 0 8px 30px rgba(0, 212, 255, 0.1);">
            <div style="border-bottom: 1px solid #1e2d4a; padding-bottom: 16px; margin-bottom: 20px;">
                <span style="background-color: rgba(0, 212, 255, 0.15); color: #00d4ff; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; font-family: monospace;">
                    OFFICIAL DIRECTIVE &bull; {sender_role}
                </span>
                <h2 style="color: #ffffff; font-size: 20px; margin: 12px 0 4px 0;">{title}</h2>
                <p style="color: #64748b; font-size: 12px; margin: 0;">Dispatched by {sender_email}</p>
            </div>

            <div style="background-color: #141d35; border-left: 4px solid #00d4ff; border-radius: 0 8px 8px 0; padding: 18px; margin: 20px 0;">
                <p style="color: #f1f5f9; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">{message}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; color: #ffffff; font-size: 13px;">
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #1e2d4a; color: #94a3b8;">Protected Proxy / Server IP:</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #1e2d4a; font-family: monospace; color: #00d4ff; font-weight: bold;">{proxy_ip}</td>
                </tr>
                {f'<tr><td style="padding: 8px 0; border-bottom: 1px solid #1e2d4a; color: #94a3b8;">Flagged Attacker IP:</td><td style="padding: 8px 0; border-bottom: 1px solid #1e2d4a; font-family: monospace; color: #ef4444; font-weight: bold;">{attacker_ip}</td></tr>' if attacker_ip else ''}
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #1e2d4a; color: #94a3b8;">Priority Severity:</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #1e2d4a; font-weight: bold; color: {'#ef4444' if severity == 'CRITICAL' else '#f97316' if severity == 'HIGH' else '#00d4ff'};">{severity}</td>
                </tr>
            </table>

            <div style="border-top: 1px solid #1e2d4a; margin-top: 24px; padding-top: 16px; text-align: center;">
                <p style="color: #64748b; font-size: 12px; margin: 0;">This is an authorized security communication from your Organization's SOC Defense Team via CyberGuard AI.</p>
            </div>
        </div>
    </body>
    </html>
    """
    return await _send_email(to_email, subject, html_body)
