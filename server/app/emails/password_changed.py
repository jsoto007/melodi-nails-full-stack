from html import escape
from typing import TYPE_CHECKING

from .base import brand_name, client_base_url, mailgun_send

if TYPE_CHECKING:  # pragma: no cover
    from app.models import ClientAccount


def send_password_changed_email(client: "ClientAccount") -> bool:
    """Send a confirmation that the account password was changed."""
    if not client or not client.email:
        return False
    brand = brand_name()
    subject = f"Your {brand} password was updated"
    reset_url = f"{client_base_url()}/forgot-password"
    text = (
        f"Hi {client.display_name or 'there'},\n\n"
        f"This is a confirmation that the password for your {brand} account was changed.\n\n"
        f"If you did not make this change, please reset your {brand} password immediately or contact the studio.\n\n"
        f"Reset password: {reset_url}\n\n"
        f"Thanks,\nThe {brand} Team"
    )
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f5f5f5;">
        <table role="presentation" style="width:100%;border-collapse:collapse;background-color:#f5f5f5;">
            <tr>
                <td align="center" style="padding:40px 20px;">
                    <table role="presentation" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                        <tr>
                            <td style="padding:40px 40px 30px;text-align:center;border-bottom:1px solid #e5e5e5;">
                                <h1 style="margin:0;font-size:24px;font-weight:600;color:#111;">{escape(brand)}</h1>
                                <p style="margin:8px 0 0;font-size:14px;color:#666;">Password updated</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:40px;">
                                <p style="margin:0 0 20px;font-size:16px;line-height:24px;color:#333;">
                                    Hi {escape(client.display_name or 'there')},
                                </p>
                                <p style="margin:0 0 18px;font-size:16px;line-height:24px;color:#333;">
                                    This is a confirmation that the password for your {escape(brand)} account was changed.
                                </p>
                                <p style="margin:0 0 24px;font-size:14px;line-height:21px;color:#555;">
                                    If you didn't make this change, please reset your password immediately or contact the studio.
                                </p>
                                <div style="margin:0 0 24px;text-align:center;">
                                    <a href="{reset_url}" style="display:inline-block;padding:14px 32px;background-color:#111;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">
                                        Reset password
                                    </a>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:30px 40px;background-color:#f8f8f8;border-top:1px solid #e5e5e5;border-radius:0 0 12px 12px;">
                                <p style="margin:0;font-size:13px;line-height:18px;color:#999;text-align:center;">
                                    Thanks,<br>The {escape(brand)} Team
                                </p>
                            </td>
                        </tr>
                    </table>
                    <table role="presentation" style="max-width:600px;width:100%;margin-top:20px;">
                        <tr>
                            <td style="padding:20px;text-align:center;">
                                <p style="margin:0;font-size:12px;line-height:18px;color:#999;">
                                    This is an automated message, please do not reply to this email.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    return mailgun_send(
        to=client.email,
        subject=subject,
        text=text,
        html=html,
        tags=("auth", "password-changed"),
    )
