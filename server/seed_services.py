"""Seed the database with all Melodi Nails services.

Usage:
    python seed_services.py

Run from the /server directory after applying migrations.
Existing services are left untouched — only missing ones are inserted.
"""

import os
import sys

# Resolve the server package regardless of working directory.
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from app.config import db
from app.models import SessionOption

SERVICES = [
    {
        "name": "Manicura Rusa",
        "tagline": "Acabado limpio",
        "description": (
            "Manicure en seco enfocado en cuticula detallada, refinamiento de la piel, "
            "esmalte semipermanente y calcio gel para un acabado natural y pulido."
        ),
        "category": "Manicura",
        "duration_minutes": 90,
        "price_cents": 5000,
    },
    {
        "name": "Uñas con Pintura en Gel",
        "tagline": "Color duradero",
        "description": (
            "Uñas acrílicas transparentes terminadas con esmalte semipermanente en gel "
            "en el tono que elijas para un acabado brillante y de larga duración."
        ),
        "category": "Manicura",
        "duration_minutes": 75,
        "price_cents": 5000,
    },
    {
        "name": "Acrílico de Color",
        "tagline": "Color intenso",
        "description": (
            "Set completo de acrílico en el color de tu elección para uñas duraderas y "
            "llamativas adaptadas al largo y forma que prefieras."
        ),
        "category": "Manicura",
        "duration_minutes": 120,
        "price_cents": 6500,
    },
    {
        "name": "Retoque en Acrílico de Color",
        "tagline": "Color recargado",
        "description": (
            "Relleno de acrílico de color en el área de crecimiento para mantener tus uñas "
            "perfectas sin necesidad de hacer un set completo."
        ),
        "category": "Retoques",
        "duration_minutes": 60,
        "price_cents": 5500,
    },
    {
        "name": "Retoque de Acrílico Cristal",
        "tagline": "Cristal renovado",
        "description": (
            "Relleno de acrílico cristal con esmalte semipermanente para mantener el brillo "
            "y la estructura de tus uñas entre visitas."
        ),
        "category": "Retoques",
        "duration_minutes": 60,
        "price_cents": 4000,
    },
    {
        "name": "Baby Boomer",
        "tagline": "Difuminado suave",
        "description": (
            "Degradé en acrílico entre dos tonos para un look suave, elegante y siempre "
            "listo para foto. Ideal para quienes buscan un estilo atemporal."
        ),
        "category": "Diseños Premium",
        "duration_minutes": 120,
        "price_cents": 7000,
    },
    {
        "name": "French Perfecto",
        "tagline": "Detalle distintivo",
        "description": (
            "Acabado francés preciso sobre una base acrílica estructurada, ideal para "
            "líneas limpias y un set atemporal que siempre luce impecable."
        ),
        "category": "Diseños Premium",
        "duration_minutes": 120,
        "price_cents": 9000,
    },
    {
        "name": "Acrílico de Color + French",
        "tagline": "Color con francés",
        "description": (
            "Acrílico de color con puntas en gel francés para un acabado elegante de "
            "doble impacto que combina color y el clásico estilo francés."
        ),
        "category": "Diseños Premium",
        "duration_minutes": 105,
        "price_cents": 7500,
    },
    {
        "name": "Pedicura en Gel",
        "tagline": "Cuidado suave",
        "description": (
            "Limpieza de uñas y pies, exfoliación, hidratación y color en gel "
            "semipermanente de larga duración en el tono que prefieras."
        ),
        "category": "Pedicura",
        "duration_minutes": 60,
        "price_cents": 4500,
    },
    {
        "name": "Derretido de Uñas Acrílicas",
        "tagline": "Remoción segura",
        "description": (
            "Remoción de uñas acrílicas con acetona pura y agua caliente para un "
            "proceso limpio, seguro y sin daño a la uña natural."
        ),
        "category": "Tratamientos",
        "duration_minutes": 30,
        "price_cents": 1000,
    },
    {
        "name": "Tratamiento de Parafina",
        "tagline": "Hidratación extra",
        "description": (
            "Tratamiento tibio de parafina para manos o pies que aporta hidratación, "
            "comodidad y mejora la circulación como complemento de tu visita."
        ),
        "category": "Tratamientos",
        "duration_minutes": 15,
        "price_cents": 1000,
    },
]


def seed():
    app = create_app()
    with app.app_context():
        existing_names = {
            row.name.strip().lower()
            for row in SessionOption.query.with_entities(SessionOption.name).all()
            if row.name
        }

        inserted = 0
        for svc in SERVICES:
            if svc["name"].strip().lower() in existing_names:
                print(f"  skip  {svc['name']} (already exists)")
                continue

            option = SessionOption(
                name=svc["name"],
                tagline=svc["tagline"],
                description=svc["description"],
                category=svc["category"],
                duration_minutes=svc["duration_minutes"],
                price_cents=svc["price_cents"],
                is_active=True,
            )
            db.session.add(option)
            inserted += 1
            print(f"  added {svc['name']}  ({svc['duration_minutes']}min · ${svc['price_cents'] / 100:.0f})")

        db.session.commit()
        print(f"\nDone — {inserted} service(s) added, {len(SERVICES) - inserted} skipped.")


if __name__ == "__main__":
    seed()
