def normalize_confidence(raw_confidence) -> float | None:
    if raw_confidence is None:
        return None

    try:
        val = float(raw_confidence)
    except (ValueError, TypeError):
        return None

    # Handle fractional confidence [0.0, 1.0] -> convert to percentage [0, 100]
    if 0.0 < val <= 1.0:
        val = val * 100.0

    # Clamp between 0.0 and 100.0
    val = max(0.0, min(100.0, val))
    return round(val, 1)
