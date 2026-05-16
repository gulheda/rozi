"""
SMS Encode/Decode Servisi
Format: EQ|SEV|lat,lng|INJ:n|TRP:n|VOICE:n|GAS:n|NEED:type|ADDR:kisa_adres

Örnek: EQ|RED|36.2021,36.1601|INJ:3|TRP:1|VOICE:1|GAS:0|NEED:CRANE|ADDR:Antakya Akdeniz Cd
"""

SEVERITY_MAP = {
    "RED": (85, "Kritik"),
    "ORANGE": (55, "Orta"),
    "GREEN": (25, "Düşük"),
}

NEED_MAP = {
    "CRANE": "vinç",
    "AMBULANCE": "ambulans",
    "MEDICINE": "ilaç",
    "VOLUNTEER": "gonullu",
    "TRUCK": "tirci",
    "OTHER": "bilinmiyor",
}

NEED_REVERSE = {v: k for k, v in NEED_MAP.items()}


def encode_sms(
    adres: str,
    lat: float | None,
    lng: float | None,
    ses_var: bool,
    kisi_sayisi: str,
    ihtiyac: str,
    gaz_kokusu: bool = False,
    yaralı_var: bool = False,
    oncelik: str = "RED",
) -> str:
    """Form verilerini kısa SMS koduna çevirir."""
    konum = f"{lat:.4f},{lng:.4f}" if lat and lng else "0,0"

    # Kişi sayısını sayıya çevir
    kisi = 0
    if "1" in kisi_sayisi:
        kisi = 1
    elif "3" in kisi_sayisi:
        kisi = 3
    elif "5" in kisi_sayisi or "+" in kisi_sayisi:
        kisi = 5

    need_code = NEED_REVERSE.get(ihtiyac, "OTHER")
    # Adresi kısalt (max 30 karakter)
    kisa_adres = adres[:30].replace("|", " ")

    kod = (
        f"EQ|{oncelik}|{konum}"
        f"|INJ:{1 if yaralı_var else 0}"
        f"|TRP:{1 if ses_var else 0}"
        f"|VOICE:{1 if ses_var else 0}"
        f"|GAS:{1 if gaz_kokusu else 0}"
        f"|NEED:{need_code}"
        f"|CNT:{kisi}"
        f"|ADDR:{kisa_adres}"
    )
    return kod


def decode_sms(sms: str) -> dict:
    """SMS kodunu ihbar verisine çevirir."""
    parcalar = sms.strip().split("|")

    if len(parcalar) < 3 or parcalar[0] != "EQ":
        raise ValueError("Geçersiz SMS formatı. 'EQ|...' ile başlamalı.")

    veri = {}
    for parca in parcalar:
        if ":" in parca:
            key, val = parca.split(":", 1)
            veri[key] = val

    sev = parcalar[1] if len(parcalar) > 1 else "RED"
    konum = parcalar[2] if len(parcalar) > 2 else "0,0"

    oncelik_skoru, _ = SEVERITY_MAP.get(sev, (50, "Orta"))

    lat, lng = None, None
    try:
        lat_str, lng_str = konum.split(",")
        lat_f, lng_f = float(lat_str), float(lng_str)
        if lat_f != 0 and lng_f != 0:
            lat, lng = lat_f, lng_f
    except Exception:
        pass

    ses_var = veri.get("VOICE", "0") == "1" or veri.get("TRP", "0") == "1"
    kisi = int(veri.get("CNT", "0"))
    kisi_sayisi = "bilinmiyor" if kisi == 0 else ("1-2" if kisi <= 2 else ("3-5" if kisi <= 5 else "5+"))
    ihtiyac = NEED_MAP.get(veri.get("NEED", "OTHER"), "bilinmiyor")
    adres = veri.get("ADDR", "SMS ile gönderildi")
    gaz = veri.get("GAS", "0") == "1"
    yarali = veri.get("INJ", "0") == "1"

    # Gerçekçi güven skoru — veri kalitesine göre
    guven_skoru = 25  # SMS tabanlı ihbar base skoru (form'dan daha az güvenilir)
    if lat and lng:
        guven_skoru += 22   # GPS koordinatı doğrulanmış konum
    if ses_var:
        guven_skoru += 18   # Canlı sinyal
    if kisi > 0:
        guven_skoru += 12   # Kişi sayısı belirtilmiş
    if yarali:
        guven_skoru += 10   # Yaralı bildirimi (somut bilgi)
    if gaz:
        guven_skoru += 5    # Gaz detayı (spesifik gözlem)
    if len(adres) > 15:
        guven_skoru += 8    # Detaylı adres

    guven_skoru = min(guven_skoru, 92)  # SMS max 92 — fotoğraflı form kadar güvenilir değil

    ozet_parcalar = ["SMS ihbarı."]
    if ses_var:
        ozet_parcalar.append("Ses/hareket var.")
    if yarali:
        ozet_parcalar.append(f"{kisi} yaralı.")
    if gaz:
        ozet_parcalar.append("Gaz kokusu.")
    ozet_parcalar.append(f"{ihtiyac.capitalize()} gerekli.")
    ozet = " ".join(ozet_parcalar)

    return {
        "adres": adres,
        "lat": lat,
        "lng": lng,
        "ses_var": ses_var,
        "kisi_sayisi": kisi_sayisi,
        "ihtiyac": ihtiyac,
        "oncelik_skoru": oncelik_skoru,
        "guven_skoru": guven_skoru,
        "ozet": ozet,
        "sms_kaynakli": True,
    }
