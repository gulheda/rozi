from openai import OpenAI
from dotenv import load_dotenv
import os
import base64
import json

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def analyze_ihbar(adres: str, ses_var: bool, kisi_sayisi: str, ihtiyac: str, fotograf_path: str = None):
    
    prompt = f"""Sen bir afet koordinasyon asistanısın. Türkiye deprem senaryosunda çalışıyorsun.

Sana bir enkaz ihbarı geldi:
- Adres: {adres}
- Ses geliyor mu: {"Evet" if ses_var else "Hayır"}
- Tahmini kişi sayısı: {kisi_sayisi}
- İhtiyaç: {ihtiyac}

Şunları hesapla ve SADECE JSON döndür, başka hiçbir şey yazma:

{{
  "oncelik_skoru": 0-100 arası sayı,
  "guven_skoru": 0-100 arası sayı,
  "ozet": "1 cümle Türkçe özet"
}}

Öncelik skoru hesaplama:
- Ses geliyor: +30 puan
- Kişi sayısı 5+: +20 puan
- Kişi sayısı 1-5: +10 puan
- İhtiyaç vinç: +20 puan
- İhtiyaç ambulans: +25 puan
- Adres net: +10 puan

Güven skoru hesaplama:
- Adres detaylı: +30 puan
- Ses var: +25 puan
- Kişi sayısı belirtilmiş: +20 puan
- İhtiyaç belirtilmiş: +25 puan"""

    messages = [{"role": "user", "content": prompt}]

    if fotograf_path and os.path.exists(fotograf_path):
        with open(fotograf_path, "rb") as f:
            image_data = base64.b64encode(f.read()).decode("utf-8")
        messages = [{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}}
            ]
        }]

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        max_tokens=300
    )

    result = response.choices[0].message.content.strip()
    
    try:
        result = result.replace("```json", "").replace("```", "").strip()
        return json.loads(result)
    except:
        return {
            "oncelik_skoru": 50,
            "guven_skoru": 50,
            "ozet": "AI analizi tamamlandı"
        }