"""Generate a floor-plan PNG from an OBJ mesh.

Usage: python scripts/generate_floor_plan.py input.obj output.png
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.floor_plan_renderer import render_obj_floor_plan


if len(sys.argv) != 3:
    raise SystemExit("Usage: python scripts/generate_floor_plan.py input.obj output.png")

metadata = render_obj_floor_plan(Path(sys.argv[1]), Path(sys.argv[2]))
print(
    f"Generated {sys.argv[2]} ({metadata.width}x{metadata.height}, "
    f"scale={metadata.scale_meters_per_pixel:.8f} m/px, "
    f"origin=({metadata.origin_x:.3f}, {metadata.origin_z:.3f}))"
)
