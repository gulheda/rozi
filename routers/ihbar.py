from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
import shutil
import os

from database import get_db
from models import Ihbar
from schemas import IhbarResponse, IhbarDurumGuncelle
from services.ai_service import analyze_ihbar
from services.duplicate_service import check_duplicate, calculate_guven_skoru
from services.matching_service import find_best_match

router = APIRouter(prefix="/ihbar", tags=["ihbar"])


@router.post("/", response_model=IhbarResponse)
async def ihbar_olustur(
    adres: str = Form(...),
    ses_var: bool = Form(False),
    kisi_sayisi: str = Form(...),
    ihtiyac: str = Form(...),
    lat: Optional[float] = Form(None),
    lng: Optional[float] = Form(None),
    fotograf: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    fotograf_path = None
    fotograf_url = None

    if fotograf:
        os.makedirs("uploads", exist_ok=True)
        fotograf_path = f"uploads/{fotograf.filename}"
        with open(fotograf_path, "wb") as f:
            shutil.copyfileobj(fotograf.file, f)
        fotograf_url = fotograf_path

    ai_sonuc = analyze_ihbar(adres, ses_var, kisi_sayisi, ihtiyac, fotograf_path)

    mevcut_ihbarlar = db.query(Ihbar).all()
    mevcut_liste = [
        {"id": i.id, "text": f"{i.adres} {i.ihtiyac}"}
        for i in mevcut_ihbarlar
    ]
    
    yeni_text = f"{adres} {ihtiyac}"
    duplicate_id = check_duplicate(yeni_text, mevcut_liste)

    guven_skoru = calculate_guven_skoru(
        ses_var=ses_var,
        fotograf_var=fotograf is not None,
        adres=adres,
        kisi_sayisi=kisi_sayisi,
        benzer_ihbar_var=duplicate_id is not None
    )

    yeni_ihbar = Ihbar(
        adres=adres,
        lat=lat,
        lng=lng,
        ses_var=ses_var,
        kisi_sayisi=kisi_sayisi,
        ihtiyac=ihtiyac,
        fotograf_url=fotograf_url,
        oncelik_skoru=ai_sonuc.get("oncelik_skoru", 50),
        guven_skoru=guven_skoru,
        ozet=ai_sonuc.get("ozet", ""),
        duplicate_id=duplicate_id
    )

    db.add(yeni_ihbar)
    db.commit()
    db.refresh(yeni_ihbar)
    return yeni_ihbar


@router.get("/", response_model=list[IhbarResponse])
def ihbarlari_listele(db: Session = Depends(get_db)):
    return db.query(Ihbar).order_by(Ihbar.oncelik_skoru.desc()).all()


@router.put("/{ihbar_id}", response_model=IhbarResponse)
def durum_guncelle(
    ihbar_id: int,
    guncelleme: IhbarDurumGuncelle,
    db: Session = Depends(get_db)
):
    ihbar = db.query(Ihbar).filter(Ihbar.id == ihbar_id).first()
    ihbar.durum = guncelleme.durum
    db.commit()
    db.refresh(ihbar)
    return ihbar