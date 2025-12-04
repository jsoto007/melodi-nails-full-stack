from __future__ import annotations

from datetime import datetime, timezone
from html import escape
from typing import TYPE_CHECKING

from flask import current_app

from .base import brand_name, client_base_url, email_logo_url, mailgun_send

if TYPE_CHECKING:  # pragma: no cover
    from app.models import TattooAppointment


def _default_currency() -> str:
    return (current_app.config.get("SQUARE_DEPOSIT_CURRENCY") or "USD").upper()


def _format_currency(amount_cents: int | float | None, currency: str | None = None) -> str:
    if amount_cents is None:
        return ""
    code = (currency or _default_currency()).upper()
    return f"{code} {float(amount_cents) / 100:,.2f}"


def _format_appointment_datetime(dt: datetime | None) -> str:
    if not dt:
        return "To be scheduled"
    try:
        if dt.tzinfo is not None:
            return dt.astimezone(timezone.utc).strftime("%A, %B %d %Y at %I:%M %p %Z")
    except Exception:
        pass
    return dt.strftime("%A, %B %d %Y at %I:%M %p")


def send_booking_confirmation_email(
    appointment: "TattooAppointment",
    *,
    charge_amount_cents: int,
    session_price_cents: int,
    booking_fee_percent: int,
    pay_full_amount: bool,
    receipt_url: str | None = None,
) -> bool:
    """Send the booking confirmation with payment and session details."""
    brand = brand_name()
    logo_url = email_logo_url()
    recipient = appointment.contact_email or (appointment.client.email if appointment.client else None)
    if not recipient:
        return False
    base_url = client_base_url()
    payments = getattr(appointment, "payments", None) or []
    payment_currency = payments[0].currency if payments else _default_currency()
    reference = appointment.reference_code or f"Appointment #{appointment.id}"
    scheduled_label = _format_appointment_datetime(appointment.scheduled_start)
    if appointment.duration_minutes:
        hours = appointment.duration_minutes / 60.0
        duration_label = f"{hours:.1f}h" if not hours.is_integer() else f"{int(hours)}h"
    else:
        duration_label = "Session"
    payment_label = "Paid in full" if pay_full_amount else f"{booking_fee_percent}% deposit received"
    manage_url = f"{base_url}/portal/appointments"
    subject = f"{brand} booking confirmed – {reference}"

    lines = [
        f"Hi {appointment.contact_name or 'there'},",
        f"Thank you for booking with {brand}. Your appointment is confirmed. Here are the details:",
        f"- Reference: {reference}",
        f"- Session: {scheduled_label} ({duration_label})",
        f"- Placement: {appointment.tattoo_placement or 'n/a'}",
        f"- Size: {appointment.tattoo_size or 'n/a'}",
        f"- Payment: {payment_label} ({_format_currency(charge_amount_cents, payment_currency)})",
    ]
    if session_price_cents:
        lines.append(f"- Session price: {_format_currency(session_price_cents, payment_currency)}")
    if receipt_url:
        lines.append(f"- Receipt: {receipt_url}")
    lines.append(f"- Manage: {manage_url}")
    lines.append("If any details need adjusting, reply to this email and our team will help.")
    text = "\n".join(lines)

    detail_rows: list[str] = []

    def _detail_row(label: str, value: str | None, *, link_text: str | None = None):
        if not value:
            return
        rendered_value = escape(value)
        if link_text:
            rendered_value = f'<a href="{escape(value)}" style="color:#0f172a;text-decoration:none;">{escape(link_text)}</a>'
        detail_rows.append(
            f"<tr>"
            f"<td style=\"padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;white-space:nowrap;\">{escape(label)}</td>"
            f"<td style=\"padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#0f172a;font-weight:600;font-size:14px;\">{rendered_value}</td>"
            f"</tr>"
        )

    _detail_row("Reference", reference)
    _detail_row("Session", f"{scheduled_label} ({duration_label})")
    _detail_row("Placement", appointment.tattoo_placement or "n/a")
    _detail_row("Size", appointment.tattoo_size or "n/a")
    _detail_row("Payment", f"{payment_label} ({_format_currency(charge_amount_cents, payment_currency)})")
    if session_price_cents:
        _detail_row("Session price", _format_currency(session_price_cents, payment_currency))
    if receipt_url:
        _detail_row("Receipt", receipt_url, link_text="View receipt")
    _detail_row("Manage", manage_url, link_text="Open your portal")

    detail_table = "".join(detail_rows)
    logo_markup = (
        f"<img src=\"{escape(logo_url)}\" alt=\"{escape(brand)} logo\" style=\"height:60px;display:block;margin:0 auto 12px auto;\">"
        if logo_url
        else f"<div style=\"color:#ffffff;font-size:16px;font-weight:700;letter-spacing:0.5px;\">{escape(brand)}</div>"
    )
    manage_button = (
        f"<a href=\"{manage_url}\" style=\"display:inline-block;padding:12px 18px;background-color:#0b0b0b;color:#ffffff;"
        f"text-decoration:none;border-radius:8px;font-weight:600;\">Manage your appointment</a>"
    )

    html = (
        "<table role=\"presentation\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" "
        "style=\"width:100%;background-color:#f5f7fb;padding:32px 0;\">"
        "<tr><td align=\"center\">"
        "<table role=\"presentation\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" "
        "style=\"width:640px;max-width:92%;background-color:#ffffff;border-radius:16px;overflow:hidden;"
        "box-shadow:0 10px 45px rgba(0,0,0,0.08);\">"
        "<tr>"
        f"<td style=\"padding:28px 32px 20px 32px;background-color:#0b0b0b;text-align:center;\">"
        f"{logo_markup}"
        "<div style=\"color:#ffffff;font-size:18px;font-weight:700;\">Booking confirmed</div>"
        f"<div style=\"color:#d1d5db;font-size:13px;margin-top:6px;\">Reference {escape(reference)}</div>"
        "</td>"
        "</tr>"
        "<tr>"
        "<td style=\"padding:28px 32px;color:#0f172a;font-size:15px;line-height:1.6;\">"
        f"<p style=\"margin:0 0 12px 0;\">Hi {escape(appointment.contact_name or 'there')},</p>"
        f"<p style=\"margin:0 0 18px 0;\">Thank you for booking with {escape(brand)}. "
        "Your appointment is confirmed. Here are the details:</p>"
        "<table role=\"presentation\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" "
        "style=\"width:100%;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;\">"
        f"{detail_table}"
        "</table>"
        "<p style=\"margin:18px 0 14px 0;\">Need to make a change? Reply to this email and our team will help.</p>"
        f"<div style=\"margin:6px 0 20px 0;\">{manage_button}</div>"
        "</td>"
        "</tr>"
        "</table>"
        "</td></tr>"
        "</table>"
    )

    html_document = f"<!DOCTYPE html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"></head><body>{html}</body></html>"

    return mailgun_send(
        to=recipient,
        subject=subject,
        text=text,
        html=html_document,
        tags=("appointments", "confirmation"),
    )
