from app.main import app


def test_spatial_images_render_as_binary_file_array():
    schema = app.openapi()
    body = schema["components"]["schemas"]["Body_create_spatial_map_api_scans_spatial_map_post"]
    items = body["properties"]["images"]["items"]
    assert items["type"] == "string"
    assert items["format"] == "binary"
