import json
import sys
from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest

sys.path.insert(0, "./server")

from app import create_app
from app.config import db
from app.models import AppointmentPayment, BookingDraft, SessionOption, TattooAppointment


class FakeStripeObject(dict):
    def __getattr__(self, key):
        try:
            return self[key]
        except KeyError as exc:
            raise AttributeError(key) from exc


@pytest.fixture()
def app(monkeypatch):
    monkeypatch.setenv("DATABASE_URI", "sqlite+pysqlite:///:memory:")
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_123")
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_test_123")

    app = create_app()
    app.config.update(TESTING=True, WTF_CSRF_ENABLED=False)

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def _create_booking_draft():
    session_option = SessionOption(name="Test service", duration_minutes=60, price_cents=100)
    draft = BookingDraft(
        first_name="Test",
        last_name="Customer",
        email="test@example.com",
        phone="5555555555",
        session_option=session_option,
        scheduled_start=datetime.utcnow() + timedelta(days=1),
        amount_cents=95,
        currency="USD",
        payment_note="Stripe Checkout payment",
        expires_at=datetime.utcnow() + timedelta(hours=2),
    )
    db.session.add_all([session_option, draft])
    db.session.commit()
    return draft


def _create_appointment(
    status="awaiting_payment",
    payment_status="pending",
    provider_payment_id="cs_test_123",
    *,
    scheduled_start=None,
    duration_minutes=60,
):
    session_option = SessionOption(name="Test service", duration_minutes=60, price_cents=100)
    appointment = TattooAppointment(
        reference_code="TEST-123",
        contact_name="Test Customer",
        contact_email="test@example.com",
        contact_phone="5555555555",
        client_description="Test order",
        status=status,
        scheduled_start=scheduled_start,
        duration_minutes=duration_minutes,
        session_option=session_option,
    )
    payment = AppointmentPayment(
        appointment=appointment,
        provider="stripe",
        provider_payment_id=provider_payment_id,
        status=payment_status,
        amount_cents=95,
        currency="USD",
        note="Stripe Checkout payment",
    )
    db.session.add_all([session_option, appointment, payment])
    db.session.commit()
    return appointment


def _set_csrf(client):
    with client.session_transaction() as session_state:
        session_state["csrf_token"] = "csrf-token"
    return {"X-CSRF-Token": "csrf-token"}


def test_verify_session_accepts_succeeded_payment_intent_before_checkout_status_updates(app, client, monkeypatch):
    notifications = {"client": 0, "internal": 0}

    with app.app_context():
        draft = _create_booking_draft()
        booking_draft_id = draft.id

    fake_checkout = {
        "id": "cs_test_123",
        "payment_status": "unpaid",
        "status": "complete",
        "payment_intent": "pi_test_123",
        "amount_total": 95,
        "currency": "usd",
        "metadata": {"booking_draft_id": booking_draft_id},
    }
    fake_payment_intent = FakeStripeObject(
        status="succeeded",
        charges=SimpleNamespace(data=[SimpleNamespace(receipt_url="https://stripe.test/receipt")]),
    )

    monkeypatch.setattr("app.routes.stripe.checkout.Session.retrieve", lambda session_id: fake_checkout)
    monkeypatch.setattr("app.routes.stripe.PaymentIntent.retrieve", lambda payment_intent_id: fake_payment_intent)
    monkeypatch.setattr(
        "app.routes.send_booking_confirmation_email",
        lambda *args, **kwargs: notifications.__setitem__("client", notifications["client"] + 1) or True,
    )
    monkeypatch.setattr(
        "app.routes.send_internal_booking_notification",
        lambda *args, **kwargs: notifications.__setitem__("internal", notifications["internal"] + 1) or True,
    )

    response = client.post(
        "/api/payments/stripe/verify-session",
        json={"session_id": "cs_test_123"},
        headers=_set_csrf(client),
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["status"] == "pending"
    assert payload["payments"][0]["status"] == "paid"
    assert notifications["client"] == 1
    assert notifications["internal"] == 1


def test_stripe_webhook_finalizes_payment_once(app, client, monkeypatch):
    notifications = {"client": 0, "internal": 0}

    with app.app_context():
        draft = _create_booking_draft()
        booking_draft_id = draft.id

    fake_event = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_123",
                "payment_status": "paid",
                "status": "complete",
                "payment_intent": "pi_test_123",
                "amount_total": 95,
                "currency": "usd",
                "metadata": {"booking_draft_id": booking_draft_id},
            }
        },
    }
    fake_payment_intent = FakeStripeObject(
        status="succeeded",
        charges=SimpleNamespace(data=[SimpleNamespace(receipt_url="https://stripe.test/receipt")]),
    )

    monkeypatch.setattr("app.routes.stripe.Webhook.construct_event", lambda payload, sig, secret: fake_event)
    monkeypatch.setattr("app.routes.stripe.PaymentIntent.retrieve", lambda payment_intent_id: fake_payment_intent)
    monkeypatch.setattr(
        "app.routes.send_booking_confirmation_email",
        lambda *args, **kwargs: notifications.__setitem__("client", notifications["client"] + 1) or True,
    )
    monkeypatch.setattr(
        "app.routes.send_internal_booking_notification",
        lambda *args, **kwargs: notifications.__setitem__("internal", notifications["internal"] + 1) or True,
    )

    for _ in range(2):
        response = client.post(
            "/api/payments/stripe/webhook",
            data=json.dumps(fake_event),
            content_type="application/json",
            headers={"Stripe-Signature": "t=1,v1=test"},
        )
        assert response.status_code == 200

    with app.app_context():
        appointment = TattooAppointment.query.first()
        assert appointment is not None
        assert appointment.status == "pending"
        assert appointment.payments[0].status == "paid"

    assert notifications["client"] == 1
    assert notifications["internal"] == 1


def test_verify_session_marks_failed_payment_as_not_booked(app, client, monkeypatch):
    with app.app_context():
        draft = _create_booking_draft()
        booking_draft_id = draft.id

    fake_checkout = {
        "id": "cs_test_123",
        "payment_status": "unpaid",
        "status": "expired",
        "payment_intent": "pi_test_123",
        "amount_total": 95,
        "currency": "usd",
        "metadata": {"booking_draft_id": booking_draft_id},
    }
    fake_payment_intent = FakeStripeObject(status="requires_payment_method", charges=SimpleNamespace(data=[]))

    monkeypatch.setattr("app.routes.stripe.checkout.Session.retrieve", lambda session_id: fake_checkout)
    monkeypatch.setattr("app.routes.stripe.PaymentIntent.retrieve", lambda payment_intent_id: fake_payment_intent)

    response = client.post(
        "/api/payments/stripe/verify-session",
        json={"session_id": "cs_test_123"},
        headers=_set_csrf(client),
    )

    assert response.status_code == 400

    with app.app_context():
        assert TattooAppointment.query.count() == 0
        assert BookingDraft.query.get(booking_draft_id).fulfilled_appointment_id is None


def test_stale_awaiting_payment_hold_does_not_block_availability(app):
    from app.routes import collect_blocked_intervals

    with app.app_context():
        appointment = _create_appointment()
        appointment.scheduled_start = datetime.utcnow() + timedelta(days=1)
        appointment.created_at = datetime.utcnow() - timedelta(hours=2)
        appointment.updated_at = appointment.created_at
        db.session.commit()

        day_start = appointment.scheduled_start.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        intervals = collect_blocked_intervals(day_start, day_end)

        assert intervals == []


def test_short_appointment_leaves_turnaround_buffer_before_next_slot(app):
    from app.routes import build_available_slots, collect_blocked_intervals

    with app.app_context():
        base_date = datetime.utcnow().date() + timedelta(days=1)
        while base_date.weekday() == 6:
            base_date += timedelta(days=1)
        base_start = datetime.combine(base_date, datetime.min.time()).replace(hour=15, minute=0, second=0, microsecond=0)
        appointment = _create_appointment(
            status="pending",
            payment_status="paid",
            scheduled_start=base_start,
            duration_minutes=15,
        )

        day_start = appointment.scheduled_start.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        blocked = collect_blocked_intervals(day_start, day_end)
        assert blocked == [(appointment.scheduled_start, appointment.scheduled_start + timedelta(minutes=20))]

        slots, _window = build_available_slots(
            appointment.scheduled_start.date(),
            15,
            minimum_duration_minutes=15,
            allow_shorter_than_weekday_minimum=True,
        )
        starts = {slot["start"] for slot in slots}

        assert appointment.scheduled_start + timedelta(minutes=15) not in starts
        assert appointment.scheduled_start + timedelta(minutes=20) in starts
