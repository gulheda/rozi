"""
Twilio SMS Webhook Router
Twilio bu endpoint'i her gelen SMS için çağırır.
"""
import json
from fastapi import APIRouter, Form, Depends, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Ihbar
from services.sms_service import decode_sms
from services.duplicate_service import metni_hazirla, embedding_uret, duplicate_bul
from services.twilio_service import sms_gonder, onay_sms_gonder, twilio_aktif
from ws_manager import manager

router = APIRouter(prefix="/sms", tags=["SMS"])


@router.post("/webhook", response_class=PlainTextResponse)
async def twilio_webhook(
    request: Request,
    From: str = Form(...),
    Body: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Twilio'dan gelen SMS'i işler.
    Twilio Dashboard'da webhook URL: https://NGROK_URL/sms/webhook
    """
    print(f"[SMS] Gelen: {From} → {Body}")

    sms_metin = Body.strip()

    # EQ| ile başlamıyorsa cevap ver ve çık
    if not sms_metin.upper().startswith("EQ|"):
        sms_gonder(From, "❌ Geçersiz format. Lütfen DisasterRoute uygulamasını kullanın.")
        return "<?xml version='1.0'?><Response></Response>"

    try:
        veri = decode_sms(sms_metin)
    except ValueError as e:
        sms_gonder(From, f"❌ Kod çözülemedi: {str(e)[:100]}")
        return "<?xml version='1.0'?><Response></Response>"

    # Embedding ve duplicate kontrolü
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

    # Onay SMS'i gönder
    renk = "🔴 KRİTİK" if ihbar.oncelik_skoru >= 70 else ("🟡 ORTA" if ihbar.oncelik_skoru >= 40 else "🟢 DÜŞÜK")
    dup_mesaj = f" (Benzer ihbar #{duplicate_id} ile birleştirildi)" if duplicate_id else ""
    onay = (
        f"✅ DisasterRoute #{ihbar.id}\n"
        f"{renk} | Skor: {ihbar.oncelik_skoru}\n"
        f"{ihbar.ozet[:80]}{dup_mesaj}\n"
        f"Ekip yönlendiriliyor."
    )
    sms_gonder(From, onay)

    print(f"[SMS] İhbar #{ihbar.id} oluşturuldu — {From}")

    # Operator paneline gerçek zamanlı bildir
    await manager.broadcast({
        "tip": "yeni_ihbar",
        "ihbar_id": ihbar.id,
        "adres": ihbar.adres,
        "oncelik_skoru": ihbar.oncelik_skoru,
        "kaynak": "SMS",
    })

    # Twilio TwiML yanıtı (boş — zaten yukarıda sms_gonder ile gönderdik)
    return "<?xml version='1.0'?><Response></Response>"


@router.get("/test")
async def sms_test():
    """Twilio bağlantısını test eder."""
    return {
        "twilio_aktif": twilio_aktif(),
        "mesaj": "Twilio bağlı" if twilio_aktif() else "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER eksik"
    }
