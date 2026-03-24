"""Standalone script for populating demo data."""

import os
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
    "name": "Melodi Nails Admin",
    "email": "nailsmelodi@gmail.com",
    "password": "Aguacate@@1",
}

DEMO_USER = {
    "first_name": "Demo",
    "last_name": "User",
    "email": "demo@melodinails.local",
    "phone": "+1-555-555-0147",
    "password": "DemoPassword2024!",
}


REAL_APPOINTMENTS = [
]

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
                name="Manicura",
                description="Servicios completos de manicura y esmaltado.",
            ),
            TattooCategory(
                name="Pedicura",
                description="Servicios completos de pedicura y cuidado de pies.",
            ),
            TattooCategory(
                name="Diseños Premium",
                description="Diseños especiales, acrílicos y arte para uñas.",
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
                name="Maria G.",
                quote="Excelente servicio y atención. Las uñas me quedaron hermosas y el trato fue de primera. ¡Muy recomendada!",
                rating=5,
            ),
            Testimonial(
                name="Ana L.",
                quote="Me encantó el detalle y cuidado que pusieron en mi diseño. Sin duda volveré.",
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
        reference_code="MELODI-SEED-01",
        client=user,
        assigned_admin=admin,
        status="confirmed",
        client_description="Manicura acrílica con diseño premium",
        scheduled_start=datetime.utcnow() + timedelta(days=18),
        duration_minutes=90,
    )
    db.session.add(appointment)
    db.session.flush()

    db.session.add(
        AppointmentAsset(
            appointment=appointment,
            admin_uploader=admin,
            kind="note",
            note_text="Confirmar los colores con la clienta antes de empezar.",
            is_visible_to_client=False,
        )
    )
    return True




# Seed real appointments from the embedded schedule data.
def seed_real_appointments(admin):
    """Seed real appointments from the embedded schedule data.

    This does NOT wipe existing data and is safe to run multiple times. It
    uses reference codes of the form REAL-<Appointment ID> to stay idempotent.
    """
    if not admin:
        return False

    created_any = False
    skipped_incomplete = 0
    skipped_invalid = 0

    for data in REAL_APPOINTMENTS:
        start_str = (data.get("start") or "").strip()
        end_str = (data.get("end") or "").strip()

        # Some leads never picked a time; skip those instead of crashing.
        if not start_str or not end_str:
            skipped_incomplete += 1
            continue

        try:
            start = datetime.strptime(start_str, "%B %d, %Y %I:%M %p")
            end = datetime.strptime(end_str, "%B %d, %Y %I:%M %p")
        except ValueError:
            skipped_invalid += 1
            continue

        raw_email = (data.get("email") or "").strip()
        email = raw_email or f"guest-{data['appointment_id']}@placeholder.invalid"

        client = ClientAccount.query.filter_by(email=email).first()
        if not client:
            client = ClientAccount(
                first_name=data["first_name"],
                last_name=data["last_name"],
                email=email,
                phone=data["phone"],
                is_guest=True,
                role="client",
            )
            db.session.add(client)
            db.session.flush()
            created_any = True

        reference_code = f"REAL-{data['appointment_id']}"
        existing_appointment = TattooAppointment.query.filter_by(
            reference_code=reference_code
        ).first()
        if existing_appointment:
            # Already imported
            continue

        duration_minutes = int((end - start).total_seconds() // 60)

        appointment = TattooAppointment(
            reference_code=reference_code,
            client=client,
            assigned_admin=admin,
            status="confirmed" if data["paid"] else "pending",
            client_description=data["appointment_type"],
            scheduled_start=start,
            duration_minutes=duration_minutes,
            contact_name=f"{data['first_name']} {data['last_name']}".strip(),
            contact_email=raw_email or None,
            contact_phone=(data.get("phone") or "").strip() or None,
        )
        db.session.add(appointment)

        note_lines = []

        base_note = (data.get("notes") or "").strip()
        if base_note:
            note_lines.append(base_note)

        if data.get("appointment_price") is not None:
            note_lines.append(
                f"Appointment price: ${data['appointment_price']:,.2f}"
            )
        if data.get("amount_paid_online") is not None:
            note_lines.append(
                f"Amount paid online: ${data['amount_paid_online']:,.2f}"
            )
        note_lines.append(f"Paid (source): {'yes' if data.get('paid') else 'no'}")

        extra_fields = [
            ("Timezone", data.get("timezone")),
            ("Calendar", data.get("calendar")),
            ("Certificate code", data.get("certificate_code")),
            ("Date scheduled", data.get("date_scheduled")),
            ("Label", data.get("label")),
            ("Scheduled by", data.get("scheduled_by")),
            ("Date rescheduled", data.get("date_rescheduled")),
        ]
        for label, value in extra_fields:
            if value:
                note_lines.append(f"{label}: {value}")

        if note_lines:
            db.session.add(
                AppointmentAsset(
                    appointment=appointment,
                    admin_uploader=admin,
                    kind="note",
                    note_text="\n".join(note_lines),
                    is_visible_to_client=False,
                )
            )

        if data.get("amount_paid_online"):
            db.session.add(
                AppointmentPayment(
                    appointment=appointment,
                    provider="seed",
                    provider_payment_id=f"SEED-{reference_code}",
                    status="paid" if data.get("paid") else "pending",
                    amount_cents=int(round(float(data["amount_paid_online"]) * 100)),
                    currency="USD",
                    note="Imported payment record from seed data.",
                )
            )
        created_any = True

    if created_any:
        print("Seeded real appointments from embedded schedule.")
    else:
        print("No new real appointments were added from embedded schedule.")
    if skipped_incomplete or skipped_invalid:
        print(
            f"Skipped {skipped_incomplete} incomplete and "
            f"{skipped_invalid} malformed appointments without start/end times."
        )
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
    # Never allow destructive reset in production-like environments.
    env_value = (
        os.getenv("APP_ENV", "")
        or os.getenv("FLASK_ENV", "")
        or os.getenv("ENV", "")
    ).lower()
    is_prod = env_value == "production"
    if reset_requested and is_prod:
        print(
            "Refusing to reset data because environment looks like production "
            f"(ENV={env_value or 'unset'})."
        )
        reset_requested = False

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
    seed_real_appointments(owner_admin)

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
