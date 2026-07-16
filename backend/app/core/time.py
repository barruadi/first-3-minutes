from datetime import datetime, timezone


def utc_now() -> datetime:
    """Return UTC as a naive datetime for the existing DateTime columns."""
    return datetime.now(timezone.utc).replace(tzinfo=None)
