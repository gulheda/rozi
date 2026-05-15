from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import ihbar, kaynak

Base.metadata.create_all(bind=engine)

app = FastAPI(title="DisasterRoute API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ihbar.router)
app.include_router(kaynak.router)

@app.get("/")
def root():
    return {"mesaj": "DisasterRoute API çalışıyor"}