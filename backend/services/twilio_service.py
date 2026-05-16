import os
import hashlib
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()

TWILIO_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM = os.getenv("TWILIO_PHONE_NUMBER", "")
MERKEZ_NUMARA = os.getenv("MERKEZ_PHONE_NUMBER", "")  # Senin numaran


def twilio_aktif() -> bool:
    return bool(TWILIO_SID and TWILIO_TOKEN and TWILIO_FROM)


def sms_gonder(to: str, mesaj: str) -> bool:
    """Verilen numaraya SMS gönderir. Başarıysa True döner."""
    if not twilio_aktif():
        print(f"[TWILIO] Devre dışı — SMS gönderilmedi: {mesaj}")
        return False
    try:
        client = Client(TWILIO_SID, TWILIO_TOKEN)
        message = client.messages.create(
            body=mesaj,
            from_=TWILIO_FROM,
            to=to,
        )
        print(f"[TWILIO] SMS gönderildi: {message.sid}")
        return True
    except Exception as e:
        print(f"[TWILIO] Hata: {e}")
        return False


def onay_sms_gonder(telefon: str, ihbar_id: int, oncelik: int, ozet: str) -> bool:
    """İhbar sahibine onay SMS'i gönderir."""
    if not telefon:
        return False
    renk = "🔴 KRİTİK" if oncelik >= 70 else ("🟡 ORTA" if oncelik >= 40 else "🟢 DÜŞÜK")
    mesaj = (
        f"✅ DisasterRoute ihbarınız alındı.\n"
        f"#{ihbar_id} | {renk} | Skor: {oncelik}\n"
        f"{ozet[:80]}\n"
        f"Ekip yönlendiriliyor."
    )
    return sms_gonder(telefon, mesaj)


def sha256_hash(metin: str) -> str:
    """Metin için SHA-256 hash üretir — duplicate detection için."""
    normalize = metin.lower().strip()
    return hashlib.sha256(normalize.encode("utf-8")).hexdigest()


def incident_hash(adres: str, ihtiyac: str, lat: float = None, lng: float = None) -> str:
    """İhbar parmak izi üretir."""
    parca = f"{adres.lower().strip()}:{ihtiyac}"
    if lat and lng:
        parca += f":{lat:.2f}:{lng:.2f}"
    return sha256_hash(parca)
