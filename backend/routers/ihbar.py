import json
import os
import shutil
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Ihbar, Atama, Kaynak
from schemas import IhbarResponse, IhbarDurumGuncelle, AtamaCreate, AtamaResponse, EslestirmeResponse, KaynakResponse
from services.ai_service import analiz_et
from services.duplicate_service import metni_hazirla, embedding_uret, duplicate_bul
from services.matching_service import kaynak_sirala

router = APIRouter(prefix="/ihbar", tags=["İhbar"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("", response_model=IhbarResponse)
async def ihbar_olustur(
    adres: str = Form(...),
    ses_var: bool = Form(False),
    kisi_sayisi: str = Form("bilinmiyor"),
    ihtiyac: str = Form("bilinmiyor"),
    lat: Optional[float] = Form(None),
    lng: Optional[float] = Form(None),
    fotograf: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
):
    fotograf_url = None
    fotograf_path = None

    if fotograf:
        ext = fotograf.filename.split(".")[-1] if "." in fotograf.filename else "jpg"
        dosya_adi = f"{uuid.uuid4()}.{ext}"
        fotograf_path = os.path.join(UPLOAD_DIR, dosya_adi)
        with open(fotograf_path, "wb") as f:
            shutil.copyfileobj(fotograf.file, f)
        fotograf_url = f"/{fotograf_path}"

    ai_sonuc = await analiz_et(adres, ses_var, kisi_sayisi, ihtiyac, fotograf_path)

    metin = metni_hazirla(adres, ihtiyac, kisi_sayisi)
    embedding = embedding_uret(metin)

    mevcut = await db.execute(
        select(Ihbar).where(Ihbar.duplicate_id.is_(None)).order_by(Ihbar.olusturulma.desc()).limit(100)
    )
    mevcut_liste = [
        {"id": r.id, "embedding_json": r.embedding_json}
        for r in mevcut.scalars().all()
    ]

    duplicate_id = duplicate_bul(embedding, mevcut_liste)

    yeni = Ihbar(
        adres=adres,
        lat=lat,
        lng=lng,
        ses_var=ses_var,
        kisi_sayisi=kisi_sayisi,
        ihtiyac=ihtiyac,
        fotograf_url=fotograf_url,
        oncelik_skoru=ai_sonuc.get("oncelik_skoru", 0),
        guven_skoru=ai_sonuc.get("guven_skoru", 0),
        ozet=ai_sonuc.get("ozet"),
        duplicate_id=duplicate_id,
        embedding_json=json.dumps(embedding),
    )
    db.add(yeni)
    await db.commit()
    await db.refresh(yeni)
    return yeni


@router.get("lar", response_model=List[IhbarResponse])
async def ihbarlari_listele(
    durum: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(Ihbar).order_by(Ihbar.oncelik_skoru.desc())
    if durum:
        q = q.where(Ihbar.durum == durum)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{ihbar_id}", response_model=IhbarResponse)
async def ihbar_detay(ihbar_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Ihbar).where(Ihbar.id == ihbar_id))
    ihbar = result.scalar_one_or_none()
    if not ihbar:
        raise HTTPException(status_code=404, detail="İhbar bulunamadı")
    return ihbar


@router.put("/{ihbar_id}", response_model=IhbarResponse)
async def ihbar_guncelle(
    ihbar_id: int,
    body: IhbarDurumGuncelle,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Ihbar).where(Ihbar.id == ihbar_id))
    ihbar = result.scalar_one_or_none()
    if not ihbar:
        raise HTTPException(status_code=404, detail="İhbar bulunamadı")
    ihbar.durum = body.durum
    await db.commit()
    await db.refresh(ihbar)
    return ihbar


@router.post("/{ihbar_id}/ata", response_model=AtamaResponse)
async def kaynak_ata(
    ihbar_id: int,
    body: AtamaCreate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Ihbar).where(Ihbar.id == ihbar_id))
    ihbar = result.scalar_one_or_none()
    if not ihbar:
        raise HTTPException(status_code=404, detail="İhbar bulunamadı")

    kaynak_result = await db.execute(select(Kaynak).where(Kaynak.id == body.kaynak_id))
    kaynak = kaynak_result.scalar_one_or_none()
    if not kaynak:
        raise HTTPException(status_code=404, detail="Kaynak bulunamadı")

    atama = Atama(ihbar_id=ihbar_id, kaynak_id=body.kaynak_id, notlar=body.notlar)
    kaynak.musait = False
    ihbar.durum = "yolda"
    db.add(atama)
    await db.commit()
    await db.refresh(atama)
    return atama


@router.get("/{ihbar_id}/eslesir", response_model=EslestirmeResponse)
async def kaynak_eslesir(ihbar_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Ihbar).where(Ihbar.id == ihbar_id))
    ihbar = result.scalar_one_or_none()
    if not ihbar:
        raise HTTPException(status_code=404, detail="İhbar bulunamadı")

    kaynaklar_result = await db.execute(select(Kaynak).where(Kaynak.musait == True))
    kaynaklar = [
        {"id": k.id, "tip": k.tip, "musait": k.musait, "lat": k.lat, "lng": k.lng,
         "isim": k.isim, "ekipman": k.ekipman, "telefon": k.telefon, "olusturulma": k.olusturulma}
        for k in kaynaklar_result.scalars().all()
    ]

    uygun = kaynak_sirala(ihbar.ihtiyac, ihbar.lat, ihbar.lng, kaynaklar)
    kaynaklar_donus = [KaynakResponse(**k) for k in uygun]

    return EslestirmeResponse(
        ihbar_id=ihbar_id,
        onerilen_kaynaklar=kaynaklar_donus,
        aciklama=f"'{ihbar.ihtiyac}' ihtiyacı için {len(uygun)} kaynak önerildi.",
    )
