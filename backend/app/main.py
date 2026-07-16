from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api.v1 import scan, resident, drill, admin, guest, location

app = FastAPI(
    title="3MINUTES API",
    version="0.1.0",
    docs_url="/docs" if settings.app_env == "development" else None,
    redoc_url="/redoc" if settings.app_env == "development" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "https://localhost:5173",
        "https://localhost:5174",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL_SERVER_ERROR", "message": "Internal server error", "details": None}},
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
