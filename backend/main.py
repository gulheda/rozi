from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from database import init_db
from routers import ihbar, kaynak, sms
from ws_manager import manager

# Birden fazla yerde ara — lokal ve Render için
_possible = [
    Path(__file__).parent.parent / "frontend" / "dist",
    Path(__file__).parent / "frontend" / "dist",
    Path("/opt/render/project/src/frontend/dist"),
]
FRONTEND_DIST = next((p for p in _possible if p.exists()), _possible[0])
print(f"[FRONTEND] dist path: {FRONTEND_DIST} — exists: {FRONTEND_DIST.exists()}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # uploads/ klasörü yoksa oluştur
    Path("uploads").mkdir(exist_ok=True)
    await init_db()
    # Production'da DB boşsa demo verisi yükle
    try:
        from seed import seed_silently
        await seed_silently()
    except Exception as e:
        print(f"[SEED] Atlandı: {e}")
    yield


app = FastAPI(
    title="DisasterRoute API",
    description="Deprem enkaz ihbar ve koordinasyon sistemi",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(ihbar.router)
app.include_router(kaynak.router)
app.include_router(sms.router)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# Frontend'i serve et (build edilmişse)
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/sw.js")
    async def service_worker():
        return FileResponse(str(FRONTEND_DIST / "sw.js"), media_type="application/javascript")

    @app.get("/manifest.webmanifest")
    async def manifest():
        return FileResponse(str(FRONTEND_DIST / "manifest.webmanifest"), media_type="application/manifest+json")

    @app.get("/icon-192.png")
    async def icon192():
        return FileResponse(str(FRONTEND_DIST / "icon-192.png"))

    @app.get("/icon-512.png")
    async def icon512():
        return FileResponse(str(FRONTEND_DIST / "icon-512.png"))

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # API rotaları zaten yukarıda yakalandı, geri kalanlar frontend
        file_path = FRONTEND_DIST / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(FRONTEND_DIST / "index.html"))

else:
    @app.get("/")
    async def root():
        return {"message": "DisasterRoute API çalışıyor", "docs": "/docs"}
