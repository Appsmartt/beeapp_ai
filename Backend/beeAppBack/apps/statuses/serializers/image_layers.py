from __future__ import annotations

import json
from decimal import Decimal

from rest_framework import serializers

from .metadata import (
    IMAGE_LAYER_FILE_FIELD_NAMES,
    MAX_STATUS_IMAGE_LAYERS,
)


def _normalize_image_layers_metadata(value) -> list[dict]:
    if value in (None, "", []):
        return []

    normalized_value = value

    if isinstance(normalized_value, str):
        try:
            normalized_value = json.loads(normalized_value)
        except json.JSONDecodeError as error:
            raise serializers.ValidationError(
                "image_layers_metadata must be valid JSON."
            ) from error

    if not isinstance(normalized_value, list):
        raise serializers.ValidationError(
            "image_layers_metadata must be a JSON list."
        )

    value = normalized_value

    if len(value) > MAX_STATUS_IMAGE_LAYERS:
        raise serializers.ValidationError(
            f"A status can contain at most {MAX_STATUS_IMAGE_LAYERS} image layers."
        )

    normalized_layers: list[dict] = []
    expected_sort_orders = set(range(len(value)))

    for index, raw_layer in enumerate(value):
        if not isinstance(raw_layer, dict):
            raise serializers.ValidationError(
                f"image_layers_metadata[{index}] must be an object."
            )

        layer_id = str(raw_layer.get("id") or "").strip()

        if not layer_id or len(layer_id) > 120:
            raise serializers.ValidationError(
                f"image_layers_metadata[{index}].id is invalid."
            )

        try:
            x = Decimal(str(raw_layer.get("x")))
            y = Decimal(str(raw_layer.get("y")))
            scale = Decimal(str(raw_layer.get("scale")))
            rotation = Decimal(str(raw_layer.get("rotation")))
            size = int(raw_layer.get("size"))
            sort_order = int(raw_layer.get("sort_order"))
        except (ArithmeticError, TypeError, ValueError) as error:
            raise serializers.ValidationError(
                f"image_layers_metadata[{index}] has invalid geometry."
            ) from error

        if not Decimal("0") <= x <= Decimal("100"):
            raise serializers.ValidationError(
                f"image_layers_metadata[{index}].x must be between 0 and 100."
            )

        if not Decimal("0") <= y <= Decimal("100"):
            raise serializers.ValidationError(
                f"image_layers_metadata[{index}].y must be between 0 and 100."
            )

        if not Decimal("0.5") <= scale <= Decimal("3"):
            raise serializers.ValidationError(
                f"image_layers_metadata[{index}].scale must be between 0.5 and 3."
            )

        if not Decimal("-360") <= rotation <= Decimal("360"):
            raise serializers.ValidationError(
                f"image_layers_metadata[{index}].rotation must be between -360 and 360."
            )

        if not 24 <= size <= 220:
            raise serializers.ValidationError(
                f"image_layers_metadata[{index}].size must be between 24 and 220."
            )

        if sort_order < 0 or sort_order >= MAX_STATUS_IMAGE_LAYERS:
            raise serializers.ValidationError(
                f"image_layers_metadata[{index}].sort_order is invalid."
            )

        normalized_layers.append(
            {
                "id": layer_id,
                "x": float(x),
                "y": float(y),
                "scale": float(scale),
                "rotation": float(rotation),
                "size": size,
                "sort_order": sort_order,
            }
        )

    sort_orders = {layer["sort_order"] for layer in normalized_layers}

    if sort_orders != expected_sort_orders:
        raise serializers.ValidationError(
            "image_layers_metadata.sort_order must be consecutive from 0."
        )

    if len({layer["id"] for layer in normalized_layers}) != len(
        normalized_layers
    ):
        raise serializers.ValidationError(
            "image_layers_metadata ids cannot be repeated."
        )

    return sorted(
        normalized_layers,
        key=lambda layer: layer["sort_order"],
    )


def _validate_image_layer_files(
    *,
    layers: list[dict],
    files: dict,
) -> list[dict]:
    expected_fields_by_sort_order = {
        layer["sort_order"]: f"image_layer_file_{layer['sort_order']}"
        for layer in layers
    }
    provided_fields = {
        field_name
        for field_name in IMAGE_LAYER_FILE_FIELD_NAMES
        if files.get(field_name) is not None
    }
    expected_fields = set(expected_fields_by_sort_order.values())

    if provided_fields != expected_fields:
        raise serializers.ValidationError(
            {
                "image_layers_metadata": (
                    "Each image layer must have exactly one matching file."
                )
            }
        )

    return [
        {
            "metadata": layer,
            "file": files[expected_fields_by_sort_order[layer["sort_order"]]],
        }
        for layer in layers
    ]
