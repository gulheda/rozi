"""
Twilio SMS Webhook Router
Twilio bu endpoint'i her gelen SMS için çağırır.

Desteklenen formatlar:
  EQ|SEV|lat,lng|...   → enkaz ihbarı
  KAYIT|tip|isim|...   → görevli kaydı
"""
import json
from fastapi import APIRouter, Form, Depends, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Ihbar, Kaynak
from services.sms_service import decode_sms, decode_kaynak_sms
from services.duplicate_service import metni_hazirla, embedding_uret, duplicate_bul
from services.twilio_service import sms_gonder, twilio_aktif
from ws_manager import manager

router = APIRouter(prefix="/sms", tags=["SMS"])


@router.post("/webhook", response_class=PlainTextResponse)
async def twilio_webhook(
    request: Request,
    From: str = Form(...),
    Body: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    print(f"[SMS-WEBHOOK] {From} → {Body[:80]}")
    metin = Body.strip()
    prefix = metin.upper().split("|")[0]

    # ── KAYIT: görevli kaydı ──────────────────────────────────────────────────
    if prefix == "KAYIT":
        try:
            veri = decode_kaynak_sms(metin)
        except ValueError as e:
            sms_gonder(From, f"❌ Kayıt formatı hatalı: {str(e)[:80]}\nÖrnek: KAYIT|gonullu|Ad Soyad|tel|lat,lng|ekipman")
            return _twiml()

        # Telefonu SMS gönderen numaradan al, eğer SMS'te yoksa
        telefon = veri.get("telefon") or From

        kaynak = Kaynak(
            tip=veri["tip"],
            isim=veri["isim"],
            telefon=telefon,
            lat=veri["lat"],
            lng=veri["lng"],
            ekipman=veri["ekipman"] or None,
            musait=True,
        )
        db.add(kaynak)
        await db.commit()
        await db.refresh(kaynak)

        tip_label = {
            "arama_kurtarma": "Arama Kurtarma",
            "ambulans": "Sağlık/Ambulans",
            "vinc": "Vinç Op.",
            "kepce": "Kepçe Op.",
            "itfaiye": "İtfaiye",
            "tirci": "Tır/Kamyon",
            "ilac": "Tıbbi Malzeme",
            "gonullu": "Gönüllü",
        }.get(veri["tip"], veri["tip"])

        onay = (
            f"✅ DisasterRoute\n"
            f"Kayıt alındı: {kaynak.isim}\n"
            f"Görev: {tip_label}\n"
            f"#{kaynak.id} sisteme eklendi.\n"
            f"Görev atandığında SMS gelecek."
        )
        sms_gonder(From, onay)
        print(f"[SMS-WEBHOOK] Yeni kaynak #{kaynak.id} — {kaynak.isim} ({From})")

        await manager.broadcast({
            "tip": "yeni_kaynak",
            "kaynak_id": kaynak.id,
            "isim": kaynak.isim,
            "tip": kaynak.tip,
        })
        return _twiml()

    # ── EQ: enkaz ihbarı ──────────────────────────────────────────────────────
    if prefix == "EQ":
        try:
            veri = decode_sms(metin)
        except ValueError as e:
            sms_gonder(From, f"❌ Kod çözülemedi: {str(e)[:80]}")
            return _twiml()

        metin_embed = metni_hazirla(veri["adres"], veri["ihtiyac"], veri["kisi_sayisi"])
        embedding = embedding_uret(metin_embed)

        mevcut = await db.execute(
            select(Ihbar).where(Ihbar.duplicate_id.is_(None))
            .order_by(Ihbar.olusturulma.desc()).limit(100)
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

        renk = "🔴 KRİTİK" if ihbar.oncelik_skoru >= 70 else ("🟡 ORTA" if ihbar.oncelik_skoru >= 40 else "🟢 DÜŞÜK")
        dup_notu = f" (#{duplicate_id} ile birleştirildi)" if duplicate_id else ""
        sms_gonder(From, (
            f"✅ DisasterRoute #{ihbar.id}\n"
            f"{renk} | Skor: {ihbar.oncelik_skoru}\n"
            f"{ihbar.ozet[:80]}{dup_notu}\n"
            f"Ekip yönlendiriliyor."
        ))
        print(f"[SMS-WEBHOOK] İhbar #{ihbar.id} — {From}")

        await manager.broadcast({
            "tip": "yeni_ihbar",
            "ihbar_id": ihbar.id,
            "adres": ihbar.adres,
            "oncelik_skoru": ihbar.oncelik_skoru,
            "kaynak": "SMS",
        })
        return _twiml()

    # ── Bilinmeyen format ─────────────────────────────────────────────────────
    sms_gonder(From, (
        "DisasterRoute:\n"
        "• Enkaz ihbarı → EQ|RED|lat,lng|...\n"
        "• Görevli kaydı → KAYIT|tip|isim|tel|lat,lng\n"
        "Uygulamadan SMS kodu alın."
    ))
    return _twiml()


def _twiml():
    return "<?xml version='1.0'?><Response></Response>"


@router.get("/test")
async def sms_test():
    return {
        "twilio_aktif": twilio_aktif(),
        "mesaj": "Twilio bağlı" if twilio_aktif() else "Env var eksik (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER)",
        "desteklenen_formatlar": [
            "EQ|RED|lat,lng|INJ:1|VOICE:1|GAS:0|NEED:CRANE|CNT:3|ADDR:Adres  → enkaz ihbarı",
            "KAYIT|tip|isim|telefon|lat,lng|ekipman                            → görevli kaydı",
        ],
        "webhook_url": "/sms/webhook  (POST)",
    }


@router.post("/webhook-test")
async def webhook_test(Body: str = Form(default="test")):
    """ngrok olmadan webhook'u direkt test et."""
    return {"alindi": True, "body": Body, "mesaj": "Webhook çalışıyor!"}
