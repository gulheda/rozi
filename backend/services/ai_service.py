import os
import base64
import json
import requests
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))

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

- ozet: Tek cümle, Türkçe, operatör için özet.

SADECE geçerli JSON döndür, başka metin ekleme:
{"oncelik_skoru": <int>, "guven_skoru": <int>, "ozet": "<string>"}"""


def kural_bazli_analiz(ses_var: bool, kisi_sayisi: str, ihtiyac: str, adres: str) -> dict:
    skor = 30
    if ses_var:
        skor += 30
    if "10" in str(kisi_sayisi) or "5+" in str(kisi_sayisi):
        skor += 20
    elif "3" in str(kisi_sayisi) or "5" in str(kisi_sayisi):
        skor += 10
    if ihtiyac == "ambulans":
        skor += 25
    elif ihtiyac in ("vinç", "tirci"):
        skor += 20

    guven = 30
    if ses_var:
        guven += 25
    if len(adres) > 20:
        guven += 20

    return {
        "oncelik_skoru": min(skor, 100),
        "guven_skoru": min(guven, 100),
        "ihtiyac_turu": ihtiyac,
        "canli_var": ses_var,
        "ozet": f"{'Canlı sesi var. ' if ses_var else ''}{ihtiyac.capitalize()} gerekli. {adres} adresinde ihbar.",
    }


async def gpt4o_analiz(
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
        if "```" in raw:
            raw = raw.split("```")[1].replace("json", "").strip()
        result = json.loads(raw)
        if "ihtiyac_turu" not in result:
            result["ihtiyac_turu"] = ihtiyac
        if "canli_var" not in result:
            result["canli_var"] = ses_var
        return result
    except Exception:
        return kural_bazli_analiz(ses_var, kisi_sayisi, ihtiyac, adres)


async def analiz_et(
    adres: str,
    ses_var: bool,
    kisi_sayisi: str,
    ihtiyac: str,
    fotograf_path: str | None = None,
) -> dict:
    api_key = os.getenv("OPENAI_API_KEY", "")
    if api_key.startswith("sk-"):
        return await gpt4o_analiz(adres, ses_var, kisi_sayisi, ihtiyac, fotograf_path)
    else:
        # API key yoksa kural bazlı analiz
        return kural_bazli_analiz(ses_var, kisi_sayisi, ihtiyac, adres)
