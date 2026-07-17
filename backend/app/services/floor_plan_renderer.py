"""Render a top-down floor plan PNG from a Wavefront OBJ mesh.

This mirrors the resident iOS LiDAR renderer's 512 px square projection and
0.3 m padding, but accepts an exported OBJ so fixtures can be reproduced.
"""
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw


IMAGE_SIZE = 512
PADDING_METERS = 0.3


@dataclass(frozen=True)
class FloorPlanMetadata:
    width: int
    height: int
    scale_meters_per_pixel: float
    origin_x: float
    origin_z: float


def _read_obj(path: Path) -> tuple[list[tuple[float, float, float]], list[list[int]]]:
    vertices: list[tuple[float, float, float]] = []
    faces: list[list[int]] = []
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        parts = raw_line.strip().split()
        if not parts:
            continue
        if parts[0] == "v" and len(parts) >= 4:
            vertices.append((float(parts[1]), float(parts[2]), float(parts[3])))
        elif parts[0] == "f" and len(parts) >= 4:
            indices = [int(item.split("/", 1)[0]) for item in parts[1:]]
            faces.append([index - 1 if index > 0 else len(vertices) + index for index in indices])
    if not vertices:
        raise ValueError(f"OBJ contains no vertices: {path}")
    return vertices, faces


def render_obj_floor_plan(obj_path: Path, output_path: Path) -> FloorPlanMetadata:
    vertices, faces = _read_obj(obj_path)
    min_x = min(vertex[0] for vertex in vertices) - PADDING_METERS
    max_x = max(vertex[0] for vertex in vertices) + PADDING_METERS
    min_z = min(vertex[2] for vertex in vertices) - PADDING_METERS
    max_z = max(vertex[2] for vertex in vertices) + PADDING_METERS
    range_x, range_z = max_x - min_x, max_z - min_z
    world_range = max(range_x, range_z)
    offset_x = (world_range - range_x) / 2
    offset_z = (world_range - range_z) / 2
    pixels_per_meter = IMAGE_SIZE / world_range
    origin_x = min_x - offset_x
    origin_z = min_z - offset_z

    def project(vertex: tuple[float, float, float]) -> tuple[int, int]:
        x, _, z = vertex
        px = round((x - origin_x) * pixels_per_meter)
        # Match map UI convention: larger world Z is toward the top of the PNG.
        py = IMAGE_SIZE - round((z - origin_z) * pixels_per_meter)
        return px, py

    image = Image.new("L", (IMAGE_SIZE, IMAGE_SIZE), color=235)
    draw = ImageDraw.Draw(image)

    # Horizontal surfaces establish the navigable floor and furniture footprint.
    for face in faces:
        points_3d = [vertices[index] for index in face]
        y_values = [point[1] for point in points_3d]
        if max(y_values) - min(y_values) < 0.05:
            shade = 255 if max(y_values) < 0.15 else 190
            draw.polygon([project(point) for point in points_3d], fill=shade)

    # Vertical faces become dark wall/obstacle lines in the top-down view.
    for face in faces:
        points_3d = [vertices[index] for index in face]
        y_values = [point[1] for point in points_3d]
        # Ignore high-only lintels so door openings remain visible from above.
        if max(y_values) - min(y_values) >= 0.1 and min(y_values) < 0.15:
            projected = [project(point) for point in points_3d]
            unique: list[tuple[int, int]] = []
            for point in projected:
                if point not in unique:
                    unique.append(point)
            if len(unique) >= 2:
                draw.line(unique + [unique[0]], fill=20, width=5, joint="curve")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(output_path, format="PNG")
    return FloorPlanMetadata(
        width=IMAGE_SIZE,
        height=IMAGE_SIZE,
        scale_meters_per_pixel=world_range / IMAGE_SIZE,
        origin_x=origin_x,
        origin_z=origin_z,
    )
