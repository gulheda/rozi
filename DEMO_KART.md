# 🛡️ DisasterRoute — Demo & Sunum Kartı

## 🚀 Sistemi Başlatma

```
1. baslat.bat dosyasını çift tıkla
2. Tarayıcıda aç: http://localhost:8000
3. İlk açılışta: cd backend && python seed.py
```

---

## 👤 Roller ve Kimler Ne Yapıyor?

| Rol | Kim? | Nasıl giriş? | Ne görüyor? |
|-----|------|--------------|-------------|
| **Vatandaş** | Enkaz altındaki kişi veya yanındaki | Ana sayfa (şifresiz) | İhbar formu |
| **Görevli** | Gönüllü, vinççi, doktor, tirci... | Kaynak kayıt sayfası (şifresiz) | Kendi kayıt formu |
| **Operatör** | AFAD koordinatörü, komuta merkezi | 🔑 Şifre: **AFET2026** | Tüm panel, harita, atama |

---

## 🔑 Operatör Giriş Bilgileri

```
URL   : http://localhost:8000/panel
Şifre : AFET2026
```

---

## 📋 Demo Senaryosu (Jüri için)

### 1️⃣ Vatandaş olarak ihbar gönder
- Ana sayfaya git → Form doldur
- "GPS Al" butonuna bas → adres yaz → ihtiyaç seç
- "İhbar Gönder" → AI analiz eder → SMS kodu çıkar
- **Jüriye söyle:** "İnternet yoksa bu kodu kopyalayıp SMS olarak gönderebilir"

### 2️⃣ Görevli olarak kayıt ol
- `/kaynak` sayfasına git
- İnternetli mod → form doldur → kayıt ol
- SMS moduna geç → KAYIT|... kodu oluşur → kopyala
- **Jüriye söyle:** "Afet bölgesinde internet olmayanlar SMS modunu kullanıyor"

### 3️⃣ Operatör panelini göster
- `/panel` → şifre gir: **AFET2026**
- Sol: renkli ihbar listesi (kırmızı = kritik, yeşil = düşük)
- Bir ihbara tıkla → sağda detay + AI özeti + güven skoru
- "Uygun Ekipler" bölümüne bak → "Ata" butonuna bas
- **Jüriye söyle:** "Ata dedikten sonra görevlinin telefonuna otomatik SMS gidiyor"
- Haritada pin'e tıkla → anlık konum

### 4️⃣ Kaynaklar sekmesini göster
- "👥 Kaynaklar" sekmesine geç
- Yeşil = müsait, kırmızı = görevde
- "Serbest Bırak" → anlık müsait oluyor
- **Jüriye söyle:** "Görev bitti mi? Tek butonla serbest bırak, başka ihbara atanabilir"

### 5️⃣ SMS İhbar ekle (operatör panelinden)
- Üstteki "📡 SMS" butonuna tıkla
- Şunu yapıştır:
  ```
  EQ|RED|36.2021,36.1601|INJ:1|VOICE:1|GAS:0|NEED:CRANE|CNT:5|ADDR:Antakya Akdeniz
  ```
- "Çözümle ve Ekle" → ihbar sisteme giriyor
- **Jüriye söyle:** "Sahadaki kişi SMS attı, merkez kodu panele yapıştırdı"

---

## 🤖 Yapay Zeka Ne Yapıyor?

- Her ihbarı **öncelik skoru** (0-100) ile sıralar
- Fotoğraf varsa GPT-4o Vision analiz eder
- Fotoğraf yoksa Ollama llama3.2 → rule-based fallback
- **Güven skoru:** GPS var mı? Ses var mı? Yaralı var mı? — her biri puan ekler
- **Duplicate tespiti:** Aynı enkaz için 2 ayrı ihbar gelirse birleştiriyor

---

## 📡 İnternetli / İnternetsiz Senaryolar

```
Vatandaşın interneti VAR  → Form gönder → AI analiz → sistem kaydeder
Vatandaşın interneti YOK  → SMS kodunu kopyala → numaraya at → merkez alır

Görevlinin interneti VAR  → Kaynak formu → sisteme kaydolur
Görevlinin interneti YOK  → KAYIT|... SMS kodu → operatör panelden ekler

Operatör atama yaptı      → Görevlinin telefonu varsa OTOMATİK SMS gider
                            (Internet olmasa bile SMS gelir)
```

---

## 🛠️ Teknik Stack

- **Backend:** FastAPI + SQLite + SQLAlchemy async
- **AI:** GPT-4o Vision → Ollama llama3.2 → rule-based fallback zinciri
- **Duplicate tespiti:** Sentence Transformers cosine similarity
- **SMS:** Twilio (webhook + gönderim)
- **Harita:** Leaflet + OpenStreetMap
- **Frontend:** React + Vite + TailwindCSS
- **Deploy:** Render.com (https://rozi-b585.onrender.com)
