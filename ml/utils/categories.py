CANONICAL_CATEGORIES = [
    'Pothole',
    'Road Damage',
    'Garbage Dump',
    'Drainage Blockage',
    'Streetlight Failure',
    'Water Leakage',
    'Broken Footpath',
    'Encroachment',
    'Tree Fall',
    'Manhole Uncovered',
    'Other'
]

def normalize_category(raw_category: str | None) -> str | None:
    if not raw_category:
        return None

    trimmed = str(raw_category).strip()

    # Exact match check
    if trimmed in CANONICAL_CATEGORIES:
        return trimmed

    # Fuzzy / Keyword mapping
    lower = trimmed.lower()
    if 'pothole' in lower:
        return 'Pothole'
    if 'road crack' in lower or 'damaged road' in lower or 'asphalt' in lower:
        return 'Road Damage'
    if 'garbage' in lower or 'trash' in lower or 'waste' in lower or 'dump' in lower:
        return 'Garbage Dump'
    if 'drain' in lower or 'sewage' in lower or 'gutter' in lower:
        return 'Drainage Blockage'
    if 'street' in lower or 'light' in lower or 'lamp' in lower:
        return 'Streetlight Failure'
    if 'pipe' in lower or 'water leak' in lower or 'leakage' in lower:
        return 'Water Leakage'
    if 'footpath' in lower or 'sidewalk' in lower or 'pavement' in lower:
        return 'Broken Footpath'
    if 'encroach' in lower:
        return 'Encroachment'
    if 'tree' in lower:
        return 'Tree Fall'
    if 'manhole' in lower:
        return 'Manhole Uncovered'

    return 'Other'
