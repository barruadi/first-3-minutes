import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.openapi.utils import get_openapi

from app.core.config import settings
from app.core.errors import ApiException, error_payload
from app.api.v1 import scan, resident, drill, admin, guest, location

logger = logging.getLogger("3minutes.api")

app = FastAPI(
    title="3MINUTES API",
    version="0.1.0",
    docs_url="/docs" if settings.app_env == "development" else None,
    redoc_url="/redoc" if settings.app_env == "development" else None,
)


def custom_openapi() -> dict:
    """Keep OpenAPI 3.1 while making multipart arrays usable in Swagger UI.

    Pydantic emits ``contentMediaType`` for UploadFile arrays. The bundled
    Swagger UI currently recognizes ``format: binary`` for its file picker.
    Both describe the same HTTP payload; including both preserves the schema
    and makes manual Spatial AI testing possible from /docs.
    """
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(title=app.title, version=app.version, routes=app.routes)
    body = schema.get("components", {}).get("schemas", {}).get(
        "Body_create_spatial_map_api_scans_spatial_map_post", {}
    )
    image_items = body.get("properties", {}).get("images", {}).get("items", {})
    if image_items.get("contentMediaType") == "application/octet-stream":
        image_items["format"] = "binary"
    app.openapi_schema = schema
    return schema


app.openapi = custom_openapi

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ApiException)
async def api_exception_handler(request: Request, exc: ApiException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=error_payload(exc.code, exc.message, exc.details),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    details = [{"field": ".".join(map(str, error["loc"])), "message": error["msg"]} for error in exc.errors()]
    return JSONResponse(
        status_code=422,
        content=error_payload("VALIDATION_ERROR", "Request tidak valid.", details),
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(status_code=exc.status_code, content=error_payload("HTTP_ERROR", str(exc.detail)))


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled API exception on %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content=error_payload("INTERNAL_ERROR", "Internal server error"),
    )


api_prefix = "/api"

app.include_router(scan.router, prefix=api_prefix)
app.include_router(resident.router, prefix=api_prefix)
app.include_router(drill.router, prefix=api_prefix)
app.include_router(admin.router, prefix=api_prefix)
app.include_router(guest.router, prefix=api_prefix)
app.include_router(location.router, prefix=api_prefix)


@app.get("/")
def health():
    return {"status": "ok", "service": "3MINUTES API", "env": settings.app_env}


@app.get("/api/health")
def api_health():
    return {"status": "ok"}
