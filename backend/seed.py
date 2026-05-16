"""
Demo verisi yükleyici — jüri sunumu için gerçekçi veri seti oluşturur.
Kullanım: python seed.py
"""
import asyncio
import json
from datetime import datetime, timedelta
from sqlalchemy import select
from database import engine, SessionLocal, init_db
from models import Base, Ihbar, Kaynak, Atama


# ─── Gerçekçi kaynaklar (görevliler) ─────────────────────────────────────────
KAYNAKLAR = [
    # Arama kurtarma ekipleri
    dict(isim="AKUT Hatay Ekibi",         tip="arama_kurtarma", ekipman="Termal kamera, enkaz köpeği, telsiz",      telefon="+905321234567", lat=36.2021, lng=36.1601, musait=True),
    dict(isim="AFAD Arama Kurtarma 1",    tip="arama_kurtarma", ekipman="Hidrolik kurtarma seti, botascope",        telefon="+905339876543", lat=36.1950, lng=36.1720, musait=False),
    dict(isim="Gönüllü Kurtarma Timi",    tip="arama_kurtarma", ekipman="El feneri, ilk yardım seti",               telefon="+905441112233", lat=36.2100, lng=36.1450, musait=True),

    # Sağlık
    dict(isim="Dr. Mehmet Yılmaz",        tip="ambulans",       ekipman="Ambulans, defibrilatör, kan grubu seti",   telefon="+905554443322", lat=36.1980, lng=36.1810, musait=True),
    dict(isim="112 Hatay Ambulans #3",    tip="ambulans",       ekipman="Tam donanımlı ambulans, paramedik",        telefon="+905557778899", lat=36.2200, lng=36.1300, musait=False),

    # Ağır ekipman
    dict(isim="Kadir Bey — Vinç Op.",     tip="vinc",           ekipman="50 ton hidrolik vinç, lisanslı operatör",  telefon="+905326667788", lat=36.1900, lng=36.1550, musait=True),
    dict(isim="İnşaat Makina A.Ş.",       tip="kepce",          ekipman="Komatsu kepçe + kamyon kombo",             telefon="+905338889900", lat=36.2050, lng=36.1900, musait=True),

    # Lojistik
    dict(isim="Hasan Çelik — TIR",        tip="tirci",          ekipman="40 tonluk TIR, soğutmalı kasa",            telefon="+905551234567", lat=36.2150, lng=36.1250, musait=True),
    dict(isim="Kızılay Lojistik",         tip="tirci",          ekipman="Çadır, battaniye, gıda paketi x200",       telefon="+905444321098", lat=36.1850, lng=36.1700, musait=False),

    # İtfaiye
    dict(isim="Hatay İtfaiye 1. Grup",    tip="itfaiye",        ekipman="Yangın söndürme, gaz dedektörü, TÜPGAZ",   telefon="+905319998877", lat=36.2010, lng=36.1580, musait=True),

    # İlaç / Tıbbi
    dict(isim="Eczacı Ayşe Demir",        tip="ilac",           ekipman="Acil ilaç seti, pansuman malzeme, serum",  telefon="+905302223344", lat=36.2080, lng=36.1620, musait=True),

    # Gönüllüler
    dict(isim="Öğrenci Gönüllü Grubu",    tip="gonullu",        ekipman="10 kişi, fiziksel destek",                 telefon="+905453334455", lat=36.2000, lng=36.1500, musait=True),
    dict(isim="Emekli Asker Grubu",       tip="gonullu",        ekipman="5 kişi, koordinasyon deneyimi, telsiz",    telefon="+905467778899", lat=36.1920, lng=36.1660, musait=True),
]

# ─── Gerçekçi ihbarlar ────────────────────────────────────────────────────────
IHBARLAR = [
    dict(
        adres="Hatay Antakya, Akdeniz Cad. No:47 — 5 katlı bina",
        lat=36.2021, lng=36.1601,
        ses_var=True, kisi_sayisi="5-15", ihtiyac="arama_kurtarma,ambulans",
        oncelik_skoru=92, guven_skoru=88, durum="yolda",
        ozet="Enkaz altında 8 kişi sıkışmış. Ses ve hareket tespit edildi. Kritik müdahale gerekiyor.",
        dakika_once=35,
    ),
    dict(
        adres="İskenderun, Atatürk Bulvarı 120 — çökmüş zemin kat",
        lat=36.5895, lng=36.1660,
        ses_var=False, kisi_sayisi="1-5", ihtiyac="vinc,arama_kurtarma",
        oncelik_skoru=78, guven_skoru=71, durum="bekliyor",
        ozet="3 kişi enkaz altında. Ağır beton plakalar mevcut, vinç olmadan ulaşılamıyor.",
        dakika_once=52,
    ),
    dict(
        adres="Defne ilçesi, Çağdaş Mah. Papatya Sok. No:8",
        lat=36.1727, lng=36.1578,
        ses_var=True, kisi_sayisi="1-5", ihtiyac="ambulans,ilac",
        oncelik_skoru=85, guven_skoru=79, durum="bekliyor",
        ozet="Yaralı var, gaz kokusu bildiriliyor. Acil tıbbi müdahale gerekiyor.",
        dakika_once=18,
    ),
    dict(
        adres="Samandağ, Sahil Cad. No:3 — bodrum kat su baskını",
        lat=36.0867, lng=35.9818,
        ses_var=False, kisi_sayisi="bilinmiyor", ihtiyac="tirci,gonullu",
        oncelik_skoru=45, guven_skoru=52, durum="bekliyor",
        ozet="Bodrum katta mahsur kişiler var. Kesin sayı bilinmiyor, iletişim kopuk.",
        dakika_once=71,
    ),
    dict(
        adres="Antakya, Cumhuriyet Mah. Istiklal Sok. — çöken çatı",
        lat=36.2065, lng=36.1623,
        ses_var=False, kisi_sayisi="1-5", ihtiyac="kepce,gonullu",
        oncelik_skoru=61, guven_skoru=65, durum="tamam",
        ozet="2 kişi kurtarıldı. Ekip görevden döndü, kaynak serbest.",
        dakika_once=140,
    ),
    dict(
        adres="Reyhanlı, Merkez Mah. Patlama Bölgesi — büyük hasar",
        lat=36.2635, lng=36.5538,
        ses_var=True, kisi_sayisi="15+", ihtiyac="itfaiye,ambulans,arama_kurtarma",
        oncelik_skoru=95, guven_skoru=84, durum="bekliyor",
        ozet="Büyük çaplı hasar. 15+ kişi bildirildi. İtfaiye + kurtarma ekibi acil gerekiyor.",
        dakika_once=8,
    ),
    dict(
        adres="Kırıkhan, Çarşı Cad. No:22 — 3 katlı apartman",
        lat=36.4973, lng=36.3572,
        ses_var=False, kisi_sayisi="1-5", ihtiyac="arama_kurtarma",
        oncelik_skoru=55, guven_skoru=60, durum="bekliyor",
        ozet="İhbar SMS ile geldi. GPS koordinatı doğrulandı. Enkaz altı kontrol edilmeli.",
        dakika_once=25,
    ),
]


async def seed():
    await init_db()

    async with SessionLocal() as db:
        # Mevcut veri kontrolü
        mevcut_k = await db.execute(select(Kaynak))
        mevcut_i = await db.execute(select(Ihbar))
        k_sayisi = len(mevcut_k.scalars().all())
        i_sayisi = len(mevcut_i.scalars().all())

        print(f"\n📦 Mevcut: {k_sayisi} kaynak, {i_sayisi} ihbar")

        if k_sayisi > 0 or i_sayisi > 0:
            cevap = input("⚠️  Veri zaten var. Üstüne eklemek ister misiniz? (e/h): ").strip().lower()
            if cevap != "e":
                print("❌ İptal edildi.")
                return

        # ── Kaynakları ekle
        print("\n👥 Kaynaklar ekleniyor...")
        for k in KAYNAKLAR:
            db.add(Kaynak(
                isim=k["isim"], tip=k["tip"], ekipman=k["ekipman"],
                telefon=k["telefon"], lat=k["lat"], lng=k["lng"],
                musait=k["musait"],
            ))
            simge = "✅" if k["musait"] else "🔴"
            print(f"  {simge} {k['isim']}")

        await db.commit()

        # ── İhbarları ekle
        print("\n🆘 İhbarlar ekleniyor...")
        for i in IHBARLAR:
            zaman = datetime.utcnow() - timedelta(minutes=i["dakika_once"])
            db.add(Ihbar(
                adres=i["adres"], lat=i["lat"], lng=i["lng"],
                ses_var=i["ses_var"], kisi_sayisi=i["kisi_sayisi"],
                ihtiyac=i["ihtiyac"], oncelik_skoru=i["oncelik_skoru"],
                guven_skoru=i["guven_skoru"], durum=i["durum"],
                ozet=i["ozet"], olusturulma=zaman,
                embedding_json=json.dumps([0.0] * 384),
            ))
            sev = "🔴" if i["oncelik_skoru"] >= 70 else ("🟡" if i["oncelik_skoru"] >= 40 else "🟢")
            print(f"  {sev} [{i['durum']:8}] öncelik:{i['oncelik_skoru']}  {i['adres'][:45]}")

        await db.commit()

        # ── "yolda" ihbara atama oluştur (gerçekçi görünsün)
        print("\n🔗 Örnek atama oluşturuluyor...")
        yolda_q = await db.execute(select(Ihbar).where(Ihbar.durum == "yolda").limit(1))
        yolda = yolda_q.scalar_one_or_none()
        gorevde_q = await db.execute(select(Kaynak).where(Kaynak.musait == False).limit(1))
        gorevde = gorevde_q.scalar_one_or_none()

        if yolda and gorevde:
            db.add(Atama(
                ihbar_id=yolda.id, kaynak_id=gorevde.id,
                notlar="AFAD Arama Kurtarma ekibi yönlendirildi. Tahmini varış: 12 dk."
            ))
            await db.commit()
            print(f"  ✅ İhbar #{yolda.id} ← → {gorevde.isim}")

        # ── Özet
        print()
        print("=" * 58)
        print("  ✅  DEMO VERİSİ YÜKLEME TAMAMLANDI")
        print("=" * 58)
        print(f"  Kaynak (görevli) sayısı : {len(KAYNAKLAR)}")
        print(f"    • Müsait              : {sum(1 for k in KAYNAKLAR if k['musait'])}")
        print(f"    • Görevde             : {sum(1 for k in KAYNAKLAR if not k['musait'])}")
        print(f"  İhbar sayısı            : {len(IHBARLAR)}")
        print(f"    • Kritik (70+)        : {sum(1 for i in IHBARLAR if i['oncelik_skoru'] >= 70)}")
        print(f"    • Bekliyor            : {sum(1 for i in IHBARLAR if i['durum'] == 'bekliyor')}")
        print(f"    • Yolda               : {sum(1 for i in IHBARLAR if i['durum'] == 'yolda')}")
        print(f"    • Tamamlandı          : {sum(1 for i in IHBARLAR if i['durum'] == 'tamam')}")
        print()
        print("  🔑  OPERATÖR ŞİFRESİ    : AFET2026")
        print("  🌐  LOCAL URL           : http://localhost:8000")
        print("=" * 58)


async def seed_silently():
    """
    Render / production auto-seed:
    input() yok — DB boşsa sessizce demo verisi yükler.
    """
    from sqlalchemy import select

    await init_db()
    async with SessionLocal() as db:
        mevcut = await db.execute(select(Kaynak).limit(1))
        if mevcut.scalar_one_or_none() is not None:
            return  # Zaten veri var, dokunma

        print("[AUTO-SEED] DB boş → demo verisi yükleniyor...")

        for k in KAYNAKLAR:
            db.add(Kaynak(
                isim=k["isim"], tip=k["tip"], ekipman=k["ekipman"],
                telefon=k["telefon"], lat=k["lat"], lng=k["lng"],
                musait=k["musait"],
            ))
        await db.commit()

        for i in IHBARLAR:
            zaman = datetime.utcnow() - timedelta(minutes=i["dakika_once"])
            db.add(Ihbar(
                adres=i["adres"], lat=i["lat"], lng=i["lng"],
                ses_var=i["ses_var"], kisi_sayisi=i["kisi_sayisi"],
                ihtiyac=i["ihtiyac"], oncelik_skoru=i["oncelik_skoru"],
                guven_skoru=i["guven_skoru"], durum=i["durum"],
                ozet=i["ozet"], olusturulma=zaman,
                embedding_json=json.dumps([0.0] * 384),
            ))
        await db.commit()

        # Örnek atama
        yolda_q = await db.execute(select(Ihbar).where(Ihbar.durum == "yolda").limit(1))
        yolda = yolda_q.scalar_one_or_none()
        gorevde_q = await db.execute(select(Kaynak).where(Kaynak.musait == False).limit(1))
        gorevde = gorevde_q.scalar_one_or_none()
        if yolda and gorevde:
            db.add(Atama(
                ihbar_id=yolda.id, kaynak_id=gorevde.id,
                notlar="AFAD Arama Kurtarma ekibi yönlendirildi.",
            ))
            await db.commit()

        print(f"[AUTO-SEED] ✅ {len(KAYNAKLAR)} kaynak + {len(IHBARLAR)} ihbar yüklendi.")


if __name__ == "__main__":
    asyncio.run(seed())
