import json
import sys
from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest

sys.path.insert(0, "./server")

from app import create_app
from app.config import db
from app.models import AppointmentPayment, BookingDraft, BookingDraftSessionOption, SessionOption, TattooAppointment


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


def _future_weekday_start(hour=10, minute=0):
    candidate = datetime.utcnow() + timedelta(days=1)
    while candidate.weekday() == 6:
        candidate += timedelta(days=1)
    return candidate.replace(hour=hour, minute=minute, second=0, microsecond=0)


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


def test_stripe_initiate_accepts_multiple_products(app, client, monkeypatch):
    captured_checkout = {}

    with app.app_context():
        manicure = SessionOption(
            name="Manicure",
            category="Hands",
            duration_minutes=60,
            price_cents=5000,
        )
        pedicure = SessionOption(
            name="Pedicure",
            category="Feet",
            duration_minutes=45,
            price_cents=4500,
        )
        db.session.add_all([manicure, pedicure])
        db.session.commit()
        manicure_id = manicure.id
        pedicure_id = pedicure.id
        scheduled_start = _future_weekday_start()

    def fake_build_available_slots(target_date, duration_minutes, **kwargs):
        assert duration_minutes == 105
        return ([{"start": scheduled_start, "end": scheduled_start + timedelta(minutes=105)}], {})

    def fake_checkout_create(**kwargs):
        captured_checkout.update(kwargs)
        return {"id": "cs_multi_123", "client_secret": "secret_multi"}

    monkeypatch.setattr("app.routes.build_available_slots", fake_build_available_slots)
    monkeypatch.setattr("app.routes.stripe.checkout.Session.create", fake_checkout_create)

    response = client.post(
        "/api/payments/stripe/initiate",
        json={
            "first_name": "Test",
            "last_name": "Customer",
            "email": "test@example.com",
            "phone": "5555555555",
            "session_option_ids": [manicure_id, pedicure_id],
            "scheduled_start": scheduled_start.isoformat(),
            "pay_full_amount": False,
        },
        headers=_set_csrf(client),
    )

    assert response.status_code == 200
    assert response.get_json()["checkout_client_secret"] == "secret_multi"
    line_item = captured_checkout["line_items"][0]
    assert line_item["price_data"]["unit_amount"] == 1900
    assert line_item["price_data"]["product_data"]["description"] == "Manicure + Pedicure"

    with app.app_context():
        draft = BookingDraft.query.one()
        assert draft.session_option_id == manicure_id
        assert draft.amount_cents == 1900
        assert [item.name for item in draft.session_option_items] == ["Manicure", "Pedicure"]
        assert sum(item.duration_minutes for item in draft.session_option_items) == 105


def test_stripe_initiate_rejects_multiple_products_from_same_category(app, client):
    with app.app_context():
        first = SessionOption(name="Gel", category="Hands", duration_minutes=60, price_cents=5000)
        second = SessionOption(name="Acrylic", category="Hands", duration_minutes=90, price_cents=6500)
        db.session.add_all([first, second])
        db.session.commit()
        first_id = first.id
        second_id = second.id

    response = client.post(
        "/api/payments/stripe/initiate",
        json={
            "first_name": "Test",
            "last_name": "Customer",
            "email": "test@example.com",
            "phone": "5555555555",
            "session_option_ids": [first_id, second_id],
            "scheduled_start": _future_weekday_start().isoformat(),
        },
        headers=_set_csrf(client),
    )

    assert response.status_code == 400
    payload = response.get_json()
    assert payload["errors"][0]["field"] == "session_option_ids"
    assert "one nail service per category" in payload["errors"][0]["message"]


def test_availability_uses_combined_multi_product_duration(app, client, monkeypatch):
    captured = {}

    with app.app_context():
        manicure = SessionOption(name="Manicure", category="Hands", duration_minutes=60, price_cents=5000)
        pedicure = SessionOption(name="Pedicure", category="Feet", duration_minutes=45, price_cents=4500)
        db.session.add_all([manicure, pedicure])
        db.session.commit()
        ids = f"{manicure.id},{pedicure.id}"
        target_date = _future_weekday_start().date()
        slot_start = datetime.combine(target_date, datetime.min.time()).replace(hour=10)

    def fake_build_available_slots(target_date_arg, duration_minutes, **kwargs):
        captured["duration_minutes"] = duration_minutes
        return ([{"start": slot_start, "end": slot_start + timedelta(minutes=duration_minutes)}], {})

    monkeypatch.setattr("app.routes.build_available_slots", fake_build_available_slots)

    response = client.get(f"/api/availability?date={target_date.isoformat()}&session_option_ids={ids}")

    assert response.status_code == 200
    payload = response.get_json()
    assert captured["duration_minutes"] == 105
    assert payload["duration_minutes"] == 105
    assert [option["name"] for option in payload["session_options"]] == ["Manicure", "Pedicure"]


def test_verify_session_fulfills_multi_product_draft(app, client, monkeypatch):
    notifications = {"client": 0, "internal": 0}

    with app.app_context():
        manicure = SessionOption(name="Manicure", category="Hands", duration_minutes=60, price_cents=5000)
        pedicure = SessionOption(name="Pedicure", category="Feet", duration_minutes=45, price_cents=4500)
        draft = BookingDraft(
            first_name="Test",
            last_name="Customer",
            email="test@example.com",
            phone="5555555555",
            session_option=manicure,
            scheduled_start=_future_weekday_start(),
            amount_cents=1900,
            currency="USD",
            payment_note="Manicure + Pedicure - 20% deposit",
            expires_at=datetime.utcnow() + timedelta(hours=2),
        )
        draft.session_option_items = [
            BookingDraftSessionOption(
                session_option=manicure,
                position=0,
                name=manicure.name,
                category=manicure.category,
                duration_minutes=manicure.duration_minutes,
                price_cents=manicure.price_cents,
            ),
            BookingDraftSessionOption(
                session_option=pedicure,
                position=1,
                name=pedicure.name,
                category=pedicure.category,
                duration_minutes=pedicure.duration_minutes,
                price_cents=pedicure.price_cents,
            ),
        ]
        db.session.add_all([manicure, pedicure, draft])
        db.session.commit()
        booking_draft_id = draft.id

    fake_checkout = {
        "id": "cs_multi_123",
        "payment_status": "paid",
        "status": "complete",
        "payment_intent": "pi_multi_123",
        "amount_total": 1900,
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
        json={"session_id": "cs_multi_123"},
        headers=_set_csrf(client),
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["duration_minutes"] == 105
    assert payload["service"]["name"] == "Manicure + Pedicure"
    assert [item["name"] for item in payload["session_options"]] == ["Manicure", "Pedicure"]

    with app.app_context():
        appointment = TattooAppointment.query.one()
        assert appointment.duration_minutes == 105
        assert [item.name for item in appointment.session_option_items] == ["Manicure", "Pedicure"]

    assert notifications == {"client": 1, "internal": 1}


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


def _seed_addon_catalog():
    manicure = SessionOption(name="Manicure", category="Hands", duration_minutes=60, price_cents=5000)
    pedicure = SessionOption(name="Pedicure", category="Feet", duration_minutes=45, price_cents=4500)
    paraffin = SessionOption(name="Paraffin", category="Treatments", duration_minutes=15, price_cents=1005)
    acrylic = SessionOption(name="Acrylic", category="Hands", duration_minutes=90, price_cents=6500)
    db.session.add_all([manicure, pedicure, paraffin, acrylic])
    db.session.commit()
    return manicure, pedicure, paraffin, acrylic


def _initiate_payload(main_ids, addon_ids, scheduled_start, **extra):
    payload = {
        "first_name": "Test",
        "last_name": "Customer",
        "email": "test@example.com",
        "phone": "5555555555",
        "session_option_ids": main_ids,
        "addon_session_option_ids": addon_ids,
        "scheduled_start": scheduled_start.isoformat(),
        "pay_full_amount": True,
    }
    payload.update(extra)
    return payload


def test_payment_config_exposes_addon_discount(client):
    response = client.get("/api/payments/config")
    assert response.status_code == 200
    assert response.get_json()["stripe"]["addon_discount_percent"] == 10


def test_stripe_initiate_discounts_addons_server_side(app, client, monkeypatch):
    captured_checkout = {}
    captured_slots = {}

    with app.app_context():
        manicure, pedicure, paraffin, _ = _seed_addon_catalog()
        manicure_id, pedicure_id, paraffin_id = manicure.id, pedicure.id, paraffin.id
        scheduled_start = _future_weekday_start()

    def fake_build_available_slots(target_date, duration_minutes, **kwargs):
        captured_slots["duration_minutes"] = duration_minutes
        return ([{"start": scheduled_start, "end": scheduled_start + timedelta(minutes=duration_minutes)}], {})

    def fake_checkout_create(**kwargs):
        captured_checkout.update(kwargs)
        return {"id": "cs_addon_123", "client_secret": "secret_addon"}

    monkeypatch.setattr("app.routes.build_available_slots", fake_build_available_slots)
    monkeypatch.setattr("app.routes.stripe.checkout.Session.create", fake_checkout_create)

    response = client.post(
        "/api/payments/stripe/initiate",
        json=_initiate_payload([manicure_id], [pedicure_id, paraffin_id], scheduled_start),
        headers=_set_csrf(client),
    )

    assert response.status_code == 200, response.get_json()
    # Pedicure 4500 -> 4050; Paraffin 1005 -> discount 100.5 rounds to 101 -> 904
    expected_total = 5000 + 4050 + 904
    assert captured_checkout["line_items"][0]["price_data"]["unit_amount"] == expected_total
    assert captured_slots["duration_minutes"] == 60 + 45 + 15
    description = captured_checkout["line_items"][0]["price_data"]["product_data"]["description"]
    assert description == "Manicure + Pedicure + Paraffin"

    with app.app_context():
        draft = BookingDraft.query.one()
        assert draft.amount_cents == expected_total
        assert draft.session_option_id == manicure_id
        assert "10% add-on" in draft.payment_note
        items = sorted(draft.session_option_items, key=lambda item: item.position)
        assert [(i.name, i.price_cents, i.list_price_cents, i.discount_percent) for i in items] == [
            ("Manicure", 5000, 5000, 0),
            ("Pedicure", 4050, 4500, 10),
            ("Paraffin", 904, 1005, 10),
        ]


def test_stripe_initiate_ignores_client_supplied_prices_for_addons(app, client, monkeypatch):
    """The client cannot lower the charge by sending its own prices or discount."""
    captured_checkout = {}

    with app.app_context():
        manicure, pedicure, _, _ = _seed_addon_catalog()
        manicure_id, pedicure_id = manicure.id, pedicure.id
        scheduled_start = _future_weekday_start()

    monkeypatch.setattr(
        "app.routes.build_available_slots",
        lambda target_date, duration_minutes, **kwargs: (
            [{"start": scheduled_start, "end": scheduled_start + timedelta(minutes=duration_minutes)}], {}
        ),
    )
    monkeypatch.setattr(
        "app.routes.stripe.checkout.Session.create",
        lambda **kwargs: captured_checkout.update(kwargs) or {"id": "cs_x", "client_secret": "s"},
    )

    response = client.post(
        "/api/payments/stripe/initiate",
        json=_initiate_payload(
            [manicure_id], [pedicure_id], scheduled_start,
            price_cents=1, addon_discount_percent=90, amount_cents=1,
        ),
        headers=_set_csrf(client),
    )
    assert response.status_code == 200
    assert captured_checkout["line_items"][0]["price_data"]["unit_amount"] == 5000 + 4050


def test_stripe_initiate_rejects_addon_from_booked_category(app, client):
    with app.app_context():
        manicure, _, _, acrylic = _seed_addon_catalog()
        manicure_id, acrylic_id = manicure.id, acrylic.id

    response = client.post(
        "/api/payments/stripe/initiate",
        json=_initiate_payload([manicure_id], [acrylic_id], _future_weekday_start()),
        headers=_set_csrf(client),
    )
    assert response.status_code == 400
    error = response.get_json()["errors"][0]
    assert error["field"] == "addon_session_option_ids"
    assert "category" in error["message"]


def test_stripe_initiate_rejects_addon_duplicating_main_service(app, client):
    with app.app_context():
        manicure, _, _, _ = _seed_addon_catalog()
        manicure_id = manicure.id

    response = client.post(
        "/api/payments/stripe/initiate",
        json=_initiate_payload([manicure_id], [manicure_id], _future_weekday_start()),
        headers=_set_csrf(client),
    )
    assert response.status_code == 400
    assert response.get_json()["errors"][0]["field"] == "addon_session_option_ids"


def test_stripe_initiate_without_addons_is_unchanged(app, client, monkeypatch):
    captured_checkout = {}
    with app.app_context():
        manicure, _, _, _ = _seed_addon_catalog()
        manicure_id = manicure.id
        scheduled_start = _future_weekday_start()

    monkeypatch.setattr(
        "app.routes.build_available_slots",
        lambda target_date, duration_minutes, **kwargs: (
            [{"start": scheduled_start, "end": scheduled_start + timedelta(minutes=duration_minutes)}], {}
        ),
    )
    monkeypatch.setattr(
        "app.routes.stripe.checkout.Session.create",
        lambda **kwargs: captured_checkout.update(kwargs) or {"id": "cs_x", "client_secret": "s"},
    )

    payload = _initiate_payload([manicure_id], [], scheduled_start)
    del payload["addon_session_option_ids"]
    response = client.post("/api/payments/stripe/initiate", json=payload, headers=_set_csrf(client))
    assert response.status_code == 200
    assert captured_checkout["line_items"][0]["price_data"]["unit_amount"] == 5000
    with app.app_context():
        item = BookingDraft.query.one().session_option_items[0]
        assert (item.price_cents, item.list_price_cents, item.discount_percent) == (5000, 5000, 0)


def test_verify_session_copies_addon_discount_to_appointment(app, client, monkeypatch):
    with app.app_context():
        manicure, pedicure, _, _ = _seed_addon_catalog()
        draft = BookingDraft(
            first_name="Test", last_name="Customer", email="test@example.com", phone="5555555555",
            session_option=manicure, scheduled_start=_future_weekday_start(),
            amount_cents=9050, currency="USD", payment_note="x",
            expires_at=datetime.utcnow() + timedelta(hours=2),
        )
        draft.session_option_items = [
            BookingDraftSessionOption(session_option=manicure, position=0, name="Manicure", category="Hands",
                                      duration_minutes=60, price_cents=5000, list_price_cents=5000, discount_percent=0),
            BookingDraftSessionOption(session_option=pedicure, position=1, name="Pedicure", category="Feet",
                                      duration_minutes=45, price_cents=4050, list_price_cents=4500, discount_percent=10),
        ]
        db.session.add(draft)
        db.session.commit()
        draft_id = draft.id

    fake_checkout = {
        "id": "cs_addon_v", "payment_status": "paid", "status": "complete", "payment_intent": "pi_v",
        "amount_total": 9050, "currency": "usd", "metadata": {"booking_draft_id": draft_id},
    }
    monkeypatch.setattr("app.routes.stripe.checkout.Session.retrieve", lambda session_id: fake_checkout)
    monkeypatch.setattr("app.routes.stripe.PaymentIntent.retrieve", lambda pid: FakeStripeObject(status="succeeded", charges=SimpleNamespace(data=[])))
    monkeypatch.setattr("app.routes.send_booking_confirmation_email", lambda *a, **k: True)
    monkeypatch.setattr("app.routes.send_internal_booking_notification", lambda *a, **k: True)

    response = client.post("/api/payments/stripe/verify-session", json={"session_id": "cs_addon_v"}, headers=_set_csrf(client))
    assert response.status_code == 200
    payload = response.get_json()
    assert [(o["name"], o["price_cents"], o["list_price_cents"], o["discount_percent"]) for o in payload["session_options"]] == [
        ("Manicure", 5000, 5000, 0), ("Pedicure", 4050, 4500, 10),
    ]
    with app.app_context():
        appointment = TattooAppointment.query.one()
        items = sorted(appointment.session_option_items, key=lambda i: i.position)
        assert [(i.price_cents, i.list_price_cents, i.discount_percent) for i in items] == [(5000, 5000, 0), (4050, 4500, 10)]
        assert appointment.payments[0].amount_cents == 9050


def test_stripe_initiate_rejects_stale_expected_amount(app, client, monkeypatch):
    created = []
    with app.app_context():
        manicure, _, _, _ = _seed_addon_catalog()
        manicure_id = manicure.id
        scheduled_start = _future_weekday_start()
    monkeypatch.setattr(
        "app.routes.build_available_slots",
        lambda target_date, duration_minutes, **kwargs: (
            [{"start": scheduled_start, "end": scheduled_start + timedelta(minutes=duration_minutes)}], {}
        ),
    )
    monkeypatch.setattr("app.routes.stripe.checkout.Session.create", lambda **kwargs: created.append(kwargs) or {"id": "cs", "client_secret": "s"})

    # Client believed the full price was $45 but the catalogue now says $50 -> refuse, no Stripe session.
    response = client.post(
        "/api/payments/stripe/initiate",
        json=_initiate_payload([manicure_id], [], scheduled_start, expected_amount_cents=4500),
        headers=_set_csrf(client),
    )
    assert response.status_code == 409
    body = response.get_json()
    assert body["code"] == "amount_mismatch"
    assert body["expected_amount_cents"] == 5000
    assert created == []
    with app.app_context():
        assert BookingDraft.query.count() == 0

    # Matching expectation goes through.
    response = client.post(
        "/api/payments/stripe/initiate",
        json=_initiate_payload([manicure_id], [], scheduled_start, expected_amount_cents=5000),
        headers=_set_csrf(client),
    )
    assert response.status_code == 200
    assert created[0]["line_items"][0]["price_data"]["unit_amount"] == 5000


def test_stripe_initiate_deposit_never_below_stripe_minimum(app, client, monkeypatch):
    created = []
    with app.app_context():
        cheap = SessionOption(name="Cheap", category="A", duration_minutes=30, price_cents=200)
        tiny = SessionOption(name="Tiny", category="B", duration_minutes=15, price_cents=50)
        db.session.add_all([cheap, tiny])
        db.session.commit()
        cheap_id, tiny_id = cheap.id, tiny.id
        scheduled_start = _future_weekday_start()
    monkeypatch.setattr(
        "app.routes.build_available_slots",
        lambda target_date, duration_minutes, **kwargs: (
            [{"start": scheduled_start, "end": scheduled_start + timedelta(minutes=duration_minutes)}], {}
        ),
    )
    monkeypatch.setattr("app.routes.stripe.checkout.Session.create", lambda **kwargs: created.append(kwargs) or {"id": "cs", "client_secret": "s"})

    # total 200 + 45 = 245 -> 20% deposit = 49 -> floored to 50
    response = client.post(
        "/api/payments/stripe/initiate",
        json=_initiate_payload([cheap_id], [tiny_id], scheduled_start, pay_full_amount=False),
        headers=_set_csrf(client),
    )
    assert response.status_code == 200
    assert created[0]["line_items"][0]["price_data"]["unit_amount"] == 50
