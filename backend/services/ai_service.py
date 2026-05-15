import os
import base64
import json
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """Sen bir afet koordinasyon asistanısın. Türkiye'deki deprem sonrası enkaz ihbarlarını analiz ediyorsun.

Sana bir enkaz fotoğrafı (varsa) ve form verisi gelecek. Şunları çıkar:

- oncelik_skoru: 0-100 arası. Yüksek = acil müdahale gerekiyor.
  * Canlı ses/hareket varsa: +40
  * Çok kişi varsa (5+): +25
  * Fotoğrafta aktif hasar görünüyorsa: +20
  * Adres neti ise: +15

- guven_skoru: 0-100 arası. Yüksek = ihbar güvenilir.
  * Fotoğraf varsa: +30
  * Ses var dediyse: +25
  * Adres detaylıysa: +20
  * Kişi sayısı belirliyse: +25

- ihtiyac_turu: vinç / ambulans / ilaç / gonullu / tirci / diger

- canli_var: true/false (tahmini)

- ozet: Tek cümle, Türkçe, operatör için özet.

SADECE geçerli JSON döndür, başka metin ekleme:
{
  "oncelik_skoru": <int>,
  "guven_skoru": <int>,
  "ihtiyac_turu": "<string>",
  "canli_var": <bool>,
  "ozet": "<string>"
}"""


def hesapla_guven_skoru(ses_var: bool, adres: str, fotograf_var: bool, kisi_sayisi: str) -> int:
    skor = 0
    if fotograf_var:
        skor += 30
    if ses_var:
        skor += 25
    if len(adres) > 20:
        skor += 20
    if kisi_sayisi not in ("bilinmiyor", ""):
        skor += 25
    return min(skor, 100)


async def analiz_et(
    adres: str,
    ses_var: bool,
    kisi_sayisi: str,
    ihtiyac: str,
    fotograf_path: str | None = None,
) -> dict:
    user_content = []

    if fotograf_path and os.path.exists(fotograf_path):
        with open(fotograf_path, "rb") as f:
            img_b64 = base64.b64encode(f.read()).decode()
        user_content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{img_b64}", "detail": "low"},
        })

    form_metni = f"""
Adres: {adres}
Ses/Hareket var mı: {"Evet" if ses_var else "Hayır"}
Tahmini kişi sayısı: {kisi_sayisi}
İhtiyaç: {ihtiyac}
"""
    user_content.append({"type": "text", "text": form_metni})

    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            max_tokens=300,
            timeout=15,
        )
        raw = response.choices[0].message.content.strip()
        # JSON bloğu varsa temizle
        if "```" in raw:
            raw = raw.split("```")[1].replace("json", "").strip()
        return json.loads(raw)
    except Exception:
        # AI başarısız olursa basit formülle hesapla
        guven = hesapla_guven_skoru(ses_var, adres, fotograf_path is not None, kisi_sayisi)
        oncelik = guven
        if ses_var:
            oncelik = min(oncelik + 20, 100)
        return {
            "oncelik_skoru": oncelik,
            "guven_skoru": guven,
            "ihtiyac_turu": ihtiyac,
            "canli_var": ses_var,
            "ozet": f"{adres} adresinde ihbar. İhtiyaç: {ihtiyac}.",
        }
