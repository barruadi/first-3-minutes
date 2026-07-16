from pathlib import Path

from app.core.config import settings


BACKEND_ROOT = Path(__file__).resolve().parents[2]


def storage_root() -> Path:
    configured = Path(settings.storage_dir)
    root = configured if configured.is_absolute() else BACKEND_ROOT / configured
    root.mkdir(parents=True, exist_ok=True)
    return root.resolve()


def storage_path(category: str, filename: str) -> Path:
    safe_category = "".join(c for c in category if c.isalnum() or c in {"-", "_"})
    safe_filename = Path(filename).name
    target_dir = storage_root() / safe_category
    target_dir.mkdir(parents=True, exist_ok=True)
    target = (target_dir / safe_filename).resolve()
    if storage_root() not in target.parents:
        raise ValueError("Unsafe storage path")
    return target
