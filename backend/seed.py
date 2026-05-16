"""
Demo verisi yükleyici — jüri sunumu için 30 gerçekçi ihbar + kaynaklar ekler.
Çalıştır: python seed.py
"""
import asyncio
import json
import random
from datetime import datetime, timedelta
from database import init_db, SessionLocal
from models import Ihbar, Kaynak

IHBARLAR = [
    # Yüksek öncelik (kırmızı) — ses var, çok kişi
    {"adres": "Hatay Antakya Akdeniz Cad. No:14", "lat": 36.2021, "lng": 36.1601, "ses_var": True, "kisi_sayisi": "5+", "ihtiyac": "vinç", "oncelik_skoru": 97, "guven_skoru": 95, "ozet": "Enkaz altında canlı sesler duyuluyor, çok katlı bina tamamen çökmüş, vinç acil."},
    {"adres": "Hatay Antakya Narlıca Mah. Atatürk Sk. No:8", "lat": 36.2105, "lng": 36.1720, "ses_var": True, "kisi_sayisi": "3-5", "ihtiyac": "ambulans", "oncelik_skoru": 94, "guven_skoru": 90, "ozet": "Yaralı çıkarıldı, ambulans ve tıbbi ekip acil gerekiyor."},
    {"adres": "Kahramanmaraş Merkez Trabzon Cad. No:32", "lat": 37.5858, "lng": 36.9371, "ses_var": True, "kisi_sayisi": "5+", "ihtiyac": "vinç", "oncelik_skoru": 96, "guven_skoru": 92, "ozet": "6 katlı bina tamamen yıkıldı, enkaz altında birden fazla kişi sesi var."},
    {"adres": "Hatay İskenderun Mareşal Fevzi Çakmak Cad. No:5", "lat": 36.5853, "lng": 36.1653, "ses_var": True, "kisi_sayisi": "3-5", "ihtiyac": "vinç", "oncelik_skoru": 91, "guven_skoru": 88, "ozet": "Apartman çökmüş, bodrum katta ses var, vinç olmadan ulaşılamıyor."},
    {"adres": "Adıyaman Merkez Cumhuriyet Mah. İnönü Cad. No:21", "lat": 37.7648, "lng": 38.2786, "ses_var": True, "kisi_sayisi": "5+", "ihtiyac": "ambulans", "oncelik_skoru": 93, "guven_skoru": 89, "ozet": "Bina çökmüş, 7 kişi mahsur, 2'si ağır yaralı."},
    {"adres": "Hatay Antakya Armutlu Mah. Gündüz Sk. No:3", "lat": 36.1987, "lng": 36.1589, "ses_var": True, "kisi_sayisi": "1-2", "ihtiyac": "ambulans", "oncelik_skoru": 88, "guven_skoru": 85, "ozet": "Yaşlı çift enkaz altında, telefon sesi duyuluyor."},
    {"adres": "Kahramanmaraş Elbistan Cumhuriyet Cad. No:44", "lat": 38.2095, "lng": 37.1960, "ses_var": True, "kisi_sayisi": "3-5", "ihtiyac": "vinç", "oncelik_skoru": 89, "guven_skoru": 86, "ozet": "3 katlı bina yıkıldı, düzenli ses sinyali alınıyor."},
    {"adres": "Gaziantep Şahinbey Suburcu Mah. No:17", "lat": 37.0662, "lng": 37.3833, "ses_var": True, "kisi_sayisi": "3-5", "ihtiyac": "vinç", "oncelik_skoru": 87, "guven_skoru": 84, "ozet": "Enkaz altında ses var, 4 kişi mahsur olduğu tahmin ediliyor."},

    # Orta öncelik (sarı)
    {"adres": "Hatay Antakya Serinyol Mah. No:9", "lat": 36.2601, "lng": 36.2012, "ses_var": False, "kisi_sayisi": "3-5", "ihtiyac": "gonullu", "oncelik_skoru": 62, "guven_skoru": 70, "ozet": "Bina çökmüş, enkaz altında kişi olduğu tahmin ediliyor, ses yok."},
    {"adres": "Malatya Merkez Battalgazi Mah. No:33", "lat": 38.3552, "lng": 38.3095, "ses_var": False, "kisi_sayisi": "1-2", "ihtiyac": "ilaç", "oncelik_skoru": 58, "guven_skoru": 65, "ozet": "Yaralı kurtarıldı, tıbbi malzeme ve ilaç ihtiyacı var."},
    {"adres": "Hatay Kırıkhan Merkez Mah. No:12", "lat": 36.4960, "lng": 36.3590, "ses_var": False, "kisi_sayisi": "bilinmiyor", "ihtiyac": "gonullu", "oncelik_skoru": 55, "guven_skoru": 60, "ozet": "Mahalle hasar gördü, enkaz temizleme için gönüllü gerekiyor."},
    {"adres": "Adıyaman Kahta İlçesi Merkez Cad. No:7", "lat": 37.7867, "lng": 38.6167, "ses_var": False, "kisi_sayisi": "1-2", "ihtiyac": "ilaç", "oncelik_skoru": 52, "guven_skoru": 58, "ozet": "Kronik ilaç ihtiyacı olan hasta enkaz sonrası ilaçsız kaldı."},
    {"adres": "Osmaniye Merkez Atatürk Mah. No:19", "lat": 37.0742, "lng": 36.2462, "ses_var": False, "kisi_sayisi": "3-5", "ihtiyac": "gonullu", "oncelik_skoru": 60, "guven_skoru": 68, "ozet": "Yaşlı ve çocukların bulunduğu bölge, tahliye yardımı gerekiyor."},
    {"adres": "Hatay Dörtyol Merkez Mah. No:22", "lat": 36.8452, "lng": 36.2278, "ses_var": False, "kisi_sayisi": "bilinmiyor", "ihtiyac": "tirci", "oncelik_skoru": 57, "guven_skoru": 62, "ozet": "Yardım malzemeleri bölgeye ulaştırılması gerekiyor, yol kısmen açık."},
    {"adres": "Gaziantep Nizip İlçesi Cumhuriyet Cad. No:5", "lat": 37.0125, "lng": 37.7984, "ses_var": False, "kisi_sayisi": "1-2", "ihtiyac": "ambulans", "oncelik_skoru": 65, "guven_skoru": 72, "ozet": "Kırık bacaklı hasta, ambulans bekleniyor."},

    # Duplicate grubu (aynı enkaz, farklı ihbarlar)
    {"adres": "Hatay Antakya Akdeniz Cad. enkaz var yardım", "lat": 36.2025, "lng": 36.1605, "ses_var": True, "kisi_sayisi": "3-5", "ihtiyac": "vinç", "oncelik_skoru": 97, "guven_skoru": 95, "ozet": "Akdeniz caddesinde enkaz, ses geliyor.", "duplicate_idx": 0},
    {"adres": "Antakya Akdeniz Cd yakınında enkaz var", "lat": 36.2019, "lng": 36.1598, "ses_var": True, "kisi_sayisi": "bilinmiyor", "ihtiyac": "vinç", "oncelik_skoru": 97, "guven_skoru": 95, "ozet": "Akdeniz caddesi enkaz bildirimi.", "duplicate_idx": 0},

    # Düşük öncelik (yeşil)
    {"adres": "Hatay Antakya Yenişehir Mah. No:45", "lat": 36.2156, "lng": 36.1812, "ses_var": False, "kisi_sayisi": "bilinmiyor", "ihtiyac": "gonullu", "oncelik_skoru": 35, "guven_skoru": 45, "ozet": "Hasarlı bina boşaltıldı, enkaz temizliği bekliyor."},
    {"adres": "Malatya Yeşilyurt İlçesi No:8", "lat": 38.3302, "lng": 38.2802, "ses_var": False, "kisi_sayisi": "bilinmiyor", "ihtiyac": "ilaç", "oncelik_skoru": 30, "guven_skoru": 40, "ozet": "Genel ilaç yardımı talebi, aciliyet düşük."},
    {"adres": "Gaziantep Şehitkamil Güneykent Mah. No:3", "lat": 37.0489, "lng": 37.3621, "ses_var": False, "kisi_sayisi": "bilinmiyor", "ihtiyac": "gonullu", "oncelik_skoru": 28, "guven_skoru": 38, "ozet": "Mahalle sakinleri tahliye yardımı bekliyor."},
    {"adres": "Osmaniye Kadirli İlçesi Merkez Mah. No:11", "lat": 37.3726, "lng": 36.0960, "ses_var": False, "kisi_sayisi": "bilinmiyor", "ihtiyac": "gonullu", "oncelik_skoru": 25, "guven_skoru": 35, "ozet": "Hafif hasar, yardım koordinasyonu gerekiyor."},
]

KAYNAKLAR = [
    {"isim": "Mehmet Yılmaz", "tip": "tirci", "ekipman": "50 tonluk vinçli TIR", "lat": 36.5012, "lng": 36.2145, "telefon": "0532 111 2233"},
    {"isim": "Ahmet Kaya", "tip": "tirci", "ekipman": "Kamyon + platform", "lat": 36.8012, "lng": 36.3012, "telefon": "0533 222 3344"},
    {"isim": "Dr. Ayşe Demir", "tip": "doktor", "ekipman": "Acil tıp seti", "lat": 36.2145, "lng": 36.1745, "telefon": "0535 333 4455"},
    {"isim": "Dr. Mustafa Çelik", "tip": "doktor", "ekipman": "Cerrahi ekipman", "lat": 37.0145, "lng": 36.9012, "telefon": "0536 444 5566"},
    {"isim": "Hemşire Fatma Arslan", "tip": "hemsire", "ekipman": "Serum, pansuman malzemesi", "lat": 36.2312, "lng": 36.1612, "telefon": "0537 555 6677"},
    {"isim": "Hemşire Zeynep Kurt", "tip": "hemsire", "ekipman": "İlk yardım çantası", "lat": 36.5845, "lng": 36.1534, "telefon": "0538 666 7788"},
    {"isim": "Ali Öztürk", "tip": "gonullu", "ekipman": "Kepçe operatörü", "lat": 36.2589, "lng": 36.2012, "telefon": "0539 777 8899"},
    {"isim": "Hasan Şahin", "tip": "gonullu", "ekipman": "Arama kurtarma eğitimli", "lat": 37.5901, "lng": 36.9412, "telefon": "0541 888 9900"},
    {"isim": "Elif Yıldız", "tip": "gonullu", "ekipman": "Psikolog, kriz müdahale", "lat": 36.2001, "lng": 36.1589, "telefon": "0542 999 0011"},
    {"isim": "Kadir Aydın", "tip": "tirci", "ekipman": "Vinç + iş makinesi", "lat": 37.7701, "lng": 38.2901, "telefon": "0543 100 1122"},
]


async def seed():
    await init_db()
    async with SessionLocal() as db:
        # Mevcut veriyi temizleme — sadece ekle
        from sqlalchemy import select, func
        count = await db.execute(select(func.count()).select_from(Ihbar))
        if count.scalar() > 5:
            print("Veritabanında zaten yeterli veri var. Seed atlanıyor.")
            return

        print("Kaynaklar ekleniyor...")
        for k in KAYNAKLAR:
            kaynak = Kaynak(**k, musait=True)
            db.add(kaynak)
        await db.commit()
        print(f"  {len(KAYNAKLAR)} kaynak eklendi.")

        print("İhbarlar ekleniyor...")
        eklenen = []
        for i, ihbar_data in enumerate(IHBARLAR):
            duplicate_id = None
            if "duplicate_idx" in ihbar_data:
                idx = ihbar_data.pop("duplicate_idx")
                if idx < len(eklenen):
                    duplicate_id = eklenen[idx].id

            # Geçmişe yayılmış zaman damgaları
            saat_once = random.randint(1, 28)
            zaman = datetime.utcnow() - timedelta(hours=saat_once, minutes=random.randint(0, 59))

            ihbar = Ihbar(
                **{k: v for k, v in ihbar_data.items() if k != "duplicate_idx"},
                duplicate_id=duplicate_id,
                durum=random.choice(["bekliyor", "bekliyor", "bekliyor", "yolda", "tamam"]),
                embedding_json=json.dumps([0.0] * 384),
                olusturulma=zaman,
            )
            db.add(ihbar)
            await db.flush()
            eklenen.append(ihbar)

        await db.commit()
        print(f"  {len(IHBARLAR)} ihbar eklendi.")
        print("\nSeed tamamlandı! Sistemi açıp Operatör Paneli'ne bakabilirsiniz.")


if __name__ == "__main__":
    asyncio.run(seed())
