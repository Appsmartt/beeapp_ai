from __future__ import annotations

import json
from decimal import Decimal

from rest_framework import serializers


def _normalize_commercial_offer_link(value) -> dict | None:
    if value in (None, "", {}):
        return None

    normalized_value = value

    if isinstance(normalized_value, str):
        try:
            normalized_value = json.loads(normalized_value)
        except json.JSONDecodeError as error:
            raise serializers.ValidationError(
                "commercial_offer_link must be valid JSON."
            ) from error

    if not isinstance(normalized_value, dict):
        raise serializers.ValidationError(
            "commercial_offer_link must be a JSON object."
        )

    required_fields = (
        "commercial_offer_id",
        "commercial_offer_image_id",
        "image_layer_id",
        "x",
        "y",
        "scale",
        "rotation",
        "size",
    )

    missing_fields = [
        field
        for field in required_fields
        if normalized_value.get(field) in (None, "")
    ]

    if missing_fields:
        raise serializers.ValidationError(
            "commercial_offer_link is missing required fields."
        )

    try:
        commercial_offer_id = str(
            serializers.UUIDField().to_internal_value(
                normalized_value["commercial_offer_id"]
            )
        )
        commercial_offer_image_id = str(
            serializers.UUIDField().to_internal_value(
                normalized_value["commercial_offer_image_id"]
            )
        )
        x = Decimal(str(normalized_value["x"]))
        y = Decimal(str(normalized_value["y"]))
        scale = Decimal(str(normalized_value["scale"]))
        rotation = Decimal(str(normalized_value["rotation"]))
        size = int(normalized_value["size"])
    except (
        ArithmeticError,
        TypeError,
        ValueError,
        serializers.ValidationError,
    ) as error:
        raise serializers.ValidationError(
            "commercial_offer_link has invalid identifiers or geometry."
        ) from error

    image_layer_id = str(
        normalized_value["image_layer_id"]
    ).strip()

    if not image_layer_id or len(image_layer_id) > 120:
        raise serializers.ValidationError(
            "commercial_offer_link.image_layer_id is invalid."
        )

    if not Decimal("0") <= x <= Decimal("100"):
        raise serializers.ValidationError(
            "commercial_offer_link.x must be between 0 and 100."
        )

    if not Decimal("0") <= y <= Decimal("100"):
        raise serializers.ValidationError(
            "commercial_offer_link.y must be between 0 and 100."
        )

    if not Decimal("0.5") <= scale <= Decimal("3"):
        raise serializers.ValidationError(
            "commercial_offer_link.scale must be between 0.5 and 3."
        )

    if not Decimal("-360") <= rotation <= Decimal("360"):
        raise serializers.ValidationError(
            "commercial_offer_link.rotation must be between -360 and 360."
        )

    if not 24 <= size <= 220:
        raise serializers.ValidationError(
            "commercial_offer_link.size must be between 24 and 220."
        )

    return {
        "commercial_offer_id": commercial_offer_id,
        "commercial_offer_image_id": commercial_offer_image_id,
        "image_layer_id": image_layer_id,
        "x": float(x),
        "y": float(y),
        "scale": float(scale),
        "rotation": float(rotation),
        "size": size,
    }
