"""Standalone script for populating demo data."""

import csv
import os
from pathlib import Path
from datetime import datetime, timedelta

from app import create_app, db
from app.models import (
    AccountActivationToken,
    AdminAccount,
    AdminActivityLog,
    AppointmentAsset,
    AppointmentPayment,
    ClientAccount,
    ClientDocument,
    Consultation,
    GalleryItem,
    SessionOption,
    SystemSetting,
    StudioAvailabilityBlock,
    StudioClosure,
    StudioWorkingHour,
    TattooAppointment,
    TattooCategory,
    Testimonial,
    UserNotification,
)

PRIMARY_ADMIN = {
    "name": "Artem Blackwork",
    "email": "artem@blackworknyc.com",
    "password": "Aguacate@@1",
}

DEMO_USER = {
    "first_name": "River",
    "last_name": "Day",
    "email": "river@blackworknyc.com",
    "phone": "+1-917-555-0147",
    "password": "RiverPass2024!",
}

APPOINTMENT_CSV_FILENAME = "schedule2025-11-25.csv"

BOOKING_FEE_SETTING_KEY = "booking_fee_percent"
DEFAULT_BOOKING_FEE_PERCENT = 20


def clear_existing_data():
    """Completely wipe known tables so the seed always replaces the data."""
    models_in_order = [
        AppointmentAsset,
        AppointmentPayment,
        TattooAppointment,
        GalleryItem,
        AdminActivityLog,
        UserNotification,
        Consultation,
        ClientDocument,
        AccountActivationToken,
        StudioAvailabilityBlock,
        SessionOption,
        SystemSetting,
        TattooCategory,
        ClientAccount,
        AdminAccount,
        StudioClosure,
        StudioWorkingHour,
    ]

    for model in models_in_order:
        db.session.query(model).delete(synchronize_session=False)

    db.session.flush()


def ensure_admin_account(config):
    admin = AdminAccount.query.filter_by(email=config["email"]).first()
    created = False
    if not admin:
        admin = AdminAccount(
            name=config["name"],
            email=config["email"],
            last_login_at=datetime.utcnow(),
        )
        admin.set_password(config["password"])
        db.session.add(admin)
        db.session.flush()
        created = True
    return admin, created


def ensure_user_account():
    user = ClientAccount.query.filter_by(email=DEMO_USER["email"]).first()
    created = False
    if not user:
        user = ClientAccount(
            first_name=DEMO_USER["first_name"],
            last_name=DEMO_USER["last_name"],
            email=DEMO_USER["email"],
            phone=DEMO_USER["phone"],
            is_guest=False,
            role="user",
            last_login_at=datetime.utcnow(),
        )
        user.set_password(DEMO_USER["password"])
        db.session.add(user)
        db.session.flush()
        created = True
    return user, created


def ensure_categories():
    if TattooCategory.query.count() > 0:
        return False

    db.session.add_all(
        [
            TattooCategory(
                name="Blackwork",
                description="High-contrast monochrome pieces with crisp edges and dense shading.",
            ),
            TattooCategory(
                name="Fine Line",
                description="Delicate lines crafted with steady hands and intentional spacing.",
            ),
            TattooCategory(
                name="Illustrative",
                description="Painterly compositions that feel like framed art.",
            ),
        ]
    )
    db.session.flush()
    return True


def ensure_testimonials():
    if Testimonial.query.count() > 0:
        return False

    db.session.add_all(
        [
            Testimonial(
                name="Mara L.",
                quote="Artem kept the room calm and somehow made a four-hour session feel like a conversation.",
                rating=5,
            ),
            Testimonial(
                name="Devon C.",
                quote="The linework is exacting—no rushed decisions and the result is timeless.",
                rating=5,
            ),
            Testimonial(
                name="Elena V.",
                quote="I came in with a vague idea and left with a piece that feels like me.",
                rating=5,
            ),
        ]
    )
    return True


def ensure_appointment(admin, user):
    if not admin or not user:
        return False

    existing = TattooAppointment.query.filter_by(reference_code="ARTEM-SEED-01").first()
    if existing:
        return False

    appointment = TattooAppointment(
        reference_code="ARTEM-SEED-01",
        client=user,
        assigned_admin=admin,
        status="confirmed",
        client_description="Large geometric blackwork piece spanning the outer forearm.",
        scheduled_start=datetime.utcnow() + timedelta(days=18),
        duration_minutes=210,
    )
    db.session.add(appointment)
    db.session.flush()

    db.session.add(
        AppointmentAsset(
            appointment=appointment,
            admin_uploader=admin,
            kind="note",
            note_text="Prepare stencil drafts and confirm the contrast plan with the client on arrival.",
            is_visible_to_client=False,
        )
    )
    return True


def _parse_appointment_row(row):
    """Parse a single CSV row from the schedule export into a normalized dict.

    Expected headers include:
    Start Time, End Time, First Name, Last Name, Phone, Email, Type,
    Appointment Price, Paid?, Amount Paid Online, Appointment ID, etc.
    """
    start_str = row.get("Start Time", "").strip()
    end_str = row.get("End Time", "").strip()
    if not start_str or not end_str:
        return None

    try:
        # Example format: "November 26, 2025 5:00 pm"
        start = datetime.strptime(start_str, "%B %d, %Y %I:%M %p")
        end = datetime.strptime(end_str, "%B %d, %Y %I:%M %p")
    except Exception as exc:
        print(f"Skipping row with invalid datetime values: {exc} -> {row!r}")
        return None

    duration_minutes = int((end - start).total_seconds() // 60)

    def _parse_money(value):
        if value is None:
            return 0.0
        text = str(value).strip()
        if not text:
            return 0.0
        # Strip thousands separators and convert to float
        text = text.replace(",", "")
        try:
            return float(text)
        except ValueError:
            print(f"Could not parse monetary value {value!r}; defaulting to 0.0")
            return 0.0

    first_name = row.get("First Name", "").strip()
    last_name = row.get("Last Name", "").strip()
    phone = row.get("Phone", "").strip().strip("'")
    email = row.get("Email", "").strip()
    appointment_type = row.get("Type", "").strip()
    appointment_price = _parse_money(row.get("Appointment Price"))
    paid_flag = row.get("Paid?", "").strip().lower() == "yes"
    amount_paid_online = _parse_money(row.get("Amount Paid Online"))
    notes_raw = row.get("Notes")
    notes = None
    if isinstance(notes_raw, str):
        notes = notes_raw.strip() or None

    appointment_id_raw = row.get("Appointment ID")
    try:
        appointment_id = int(str(appointment_id_raw).strip())
    except (TypeError, ValueError):
        print(f"Skipping row with invalid Appointment ID {appointment_id_raw!r}")
        return None

    return {
        "appointment_id": appointment_id,
        "first_name": first_name,
        "last_name": last_name,
        "phone": phone,
        "email": email,
        "appointment_type": appointment_type,
        "appointment_price": appointment_price,
        "paid": paid_flag,
        "amount_paid_online": amount_paid_online,
        "notes": notes,
        "scheduled_start": start,
        "duration_minutes": duration_minutes,
    }


def import_real_appointments_from_csv(admin):
    """Import real appointments from a CSV export without wiping existing data.

    The CSV file is expected to live next to this seed script and be named
    according to APPOINTMENT_CSV_FILENAME.
    """
    if not admin:
        return False

    base_dir = Path(__file__).resolve().parent
    csv_path = base_dir / APPOINTMENT_CSV_FILENAME

    if not csv_path.exists():
        print(f"No appointment CSV found at {csv_path}. Skipping real appointment import.")
        return False

    created_any = False

    with csv_path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            parsed = _parse_appointment_row(row)
            if not parsed:
                continue

            email = parsed["email"]
            if not email:
                print(f"Skipping appointment {parsed['appointment_id']} with no email.")
                continue

            client = ClientAccount.query.filter_by(email=email).first()
            if not client:
                client = ClientAccount(
                    first_name=parsed["first_name"],
                    last_name=parsed["last_name"],
                    email=email,
                    phone=parsed["phone"],
                    is_guest=True,
                    role="client",
                )
                db.session.add(client)
                db.session.flush()
                created_any = True

            reference_code = f"REAL-{parsed['appointment_id']}"
            existing_appointment = TattooAppointment.query.filter_by(
                reference_code=reference_code
            ).first()
            if existing_appointment:
                # Already imported
                continue

            appointment = TattooAppointment(
                reference_code=reference_code,
                client=client,
                assigned_admin=admin,
                status="confirmed" if parsed["paid"] else "pending",
                client_description=parsed["appointment_type"],
                scheduled_start=parsed["scheduled_start"],
                duration_minutes=parsed["duration_minutes"],
            )
            db.session.add(appointment)
            created_any = True

    if created_any:
        print("Imported real appointments from CSV.")
    else:
        print("No new real appointments were imported from CSV.")
    return created_any


def ensure_notifications(user):
    if not user:
        return False

    if UserNotification.query.filter_by(user_id=user.id).count() > 0:
        return False

    db.session.add_all(
        [
            UserNotification(
                user=user,
                title="Consultation scheduled",
                body="Your consultation is locked in. Review the prep guide ahead of time.",
                category="booking",
            ),
            UserNotification(
                user=user,
                title="Documents reviewed",
                body="ID verification is complete. We are ready for the session.",
                category="documents",
            ),
        ]
    )
    return True


def ensure_admin_activity(admin):
    if not admin:
        return False

    db.session.add_all(
        [
            AdminActivityLog(
                admin=admin,
                action="login",
                details="Admin signed in to confirm today's schedule.",
                ip_address="127.0.0.1",
            ),
            AdminActivityLog(
                admin=admin,
                action="appointment_update",
                details="Double-checked the pending appointment references.",
                ip_address="127.0.0.1",
            ),
        ]
    )
    return True


def ensure_settings():
    if SystemSetting.query.count() > 0:
        return False

    db.session.add_all(
        [
            SystemSetting(
                key="booking_window_days",
                value="60",
                description="Number of days in advance clients can book appointments.",
            ),
            SystemSetting(
                key="notification_email",
                value=PRIMARY_ADMIN["email"],
                description="Address used for outgoing notifications.",
            ),
            SystemSetting(
                key="maintenance_mode",
                value="off",
                description="Toggle system maintenance mode for the public site.",
                is_editable=False,
            ),
            SystemSetting(
                key="studio_hourly_rate_cents",
                value="22000",
                description="Hourly rate charged for tattoo sessions (in cents).",
            ),
            SystemSetting(
                key=BOOKING_FEE_SETTING_KEY,
                value=str(DEFAULT_BOOKING_FEE_PERCENT),
                description="Default booking fee percentage collected during reservations.",
            ),
        ]
    )
    return True


def ensure_session_options():
    if SessionOption.query.count() > 0:
        return False

    options = [
        {"name": "One-hour intro", "duration_minutes": 60, "price_cents": 11000},
        {"name": "Two-hour focus", "duration_minutes": 120, "price_cents": 19000},
        {"name": "Three-hour deep", "duration_minutes": 180, "price_cents": 26000},
    ]
    for entry in options:
        db.session.add(SessionOption(**entry))
    return True


def seed_demo_data():
    # Only wipe data if explicitly requested via environment variable.
    reset_requested = os.getenv("SEED_RESET", "").lower() == "true"
    if reset_requested:
        clear_existing_data()

    owner_admin, _ = ensure_admin_account(PRIMARY_ADMIN)
    user, _ = ensure_user_account()

    ensure_categories()
    ensure_testimonials()
    ensure_appointment(owner_admin, user)
    ensure_notifications(user)
    ensure_admin_activity(owner_admin)
    ensure_settings()
    ensure_session_options()
    import_real_appointments_from_csv(owner_admin)

    db.session.commit()
    return True


def main():
    app = create_app()
    with app.app_context():
        db.create_all()
        if seed_demo_data():
            print("Seed data reset and populated successfully.")
        else:
            print("No changes were necessary while seeding data.")


if __name__ == "__main__":
    main()
