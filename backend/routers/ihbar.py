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
from services.sms_service import decode_sms, encode_sms
from services.twilio_service import sms_gonder
from ws_manager import manager

MERKEZ = os.getenv("MERKEZ_PHONE_NUMBER", "")

router = APIRouter(prefix="/ihbar", tags=["İhbar"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("", response_model=IhbarResponse)
async def ihbar_olustur(
    adres: str = Form(...),
    ses_var: bool = Form(False),
    kisi_sayisi: str = Form("bilinmiyor"),
    ihtiyac: str = Form("bilinmiyor"),   # virgülle ayrılmış çoklu: "vinç,ambulans"
    lat: Optional[float] = Form(None),
    lng: Optional[float] = Form(None),
    gaz_kokusu: bool = Form(False),
    yarali_var: bool = Form(False),
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

    await manager.broadcast({
        "tip": "yeni_ihbar",
        "ihbar_id": yeni.id,
        "adres": yeni.adres,
        "oncelik_skoru": yeni.oncelik_skoru,
        "kaynak": "form",
    })

    # Koordinasyon merkezine otomatik SMS gönder
    if MERKEZ:
        try:
            ihtiyac_kod = ihtiyac.upper().replace("Ç", "C").replace("Ğ", "G").replace("İ", "I").replace("Ö", "O").replace("Ş", "S").replace("Ü", "U")
            sev = "RED" if yeni.oncelik_skoru >= 70 else ("ORANGE" if yeni.oncelik_skoru >= 40 else "GREEN")
            konum = f"LOC:{yeni.lat:.4f},{yeni.lng:.4f}" if yeni.lat and yeni.lng else "LOC:0,0"
            sms_metni = (
                f"EQ|{sev}|{konum}"
                f"|INJ:{'1' if yarali_var else '0'}"
                f"|VOICE:{'1' if yeni.ses_var else '0'}"
                f"|GAS:{'1' if gaz_kokusu else '0'}"
                f"|NEED:{ihtiyac_kod[:30]}"
                f"|CNT:{yeni.kisi_sayisi}"
                f"|ADDR:{yeni.adres[:30]}"
                f"\n#{yeni.id} Öncelik:{yeni.oncelik_skoru}"
            )
            sms_gonder(MERKEZ, sms_metni)
            print(f"[AUTO-SMS] #{yeni.id} → {MERKEZ}")
        except Exception as e:
            print(f"[AUTO-SMS] Hata: {e}")

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


@router.post("/sms-decode", response_model=IhbarResponse)
async def sms_ihbar_ekle(
    sms_kodu: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    """SMS kodunu çözüp ihbar olarak kaydeder."""
    try:
        veri = decode_sms(sms_kodu)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    metin = metni_hazirla(veri["adres"], veri["ihtiyac"], veri["kisi_sayisi"])
    embedding = embedding_uret(metin)

    mevcut = await db.execute(
        select(Ihbar).where(Ihbar.duplicate_id.is_(None)).order_by(Ihbar.olusturulma.desc()).limit(100)
    )
    mevcut_liste = [
        {"id": r.id, "embedding_json": r.embedding_json}
        for r in mevcut.scalars().all()
    ]
    duplicate_id = duplicate_bul(embedding, mevcut_liste)

    ihbar = Ihbar(
        adres=veri["adres"],
        lat=veri["lat"],
        lng=veri["lng"],
        ses_var=veri["ses_var"],
        kisi_sayisi=veri["kisi_sayisi"],
        ihtiyac=veri["ihtiyac"],
        oncelik_skoru=veri["oncelik_skoru"],
        guven_skoru=veri["guven_skoru"],
        ozet=veri["ozet"],
        duplicate_id=duplicate_id,
        embedding_json=json.dumps(embedding),
    )
    db.add(ihbar)
    await db.commit()
    await db.refresh(ihbar)
    return ihbar


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
