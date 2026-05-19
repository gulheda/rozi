# 🆘 DisasterRoute — Yapay Zeka Destekli Enkaz Koordinasyon Sistemi

> Deprem ve doğal afet anlarında enkaz ihbarlarını yapay zeka ile analiz edip kurtarma ekiplerine otomatik yönlendiren gerçek zamanlı koordinasyon platformu.

---

## 📌 Proje Hakkında

Büyük depremlerde koordinasyon kaosunu çözmek için geliştirilmiştir. Sistem üç temel sorunu çözer:

- **Önceliklendirme:** Yüzlerce ihbar aynı anda geldiğinde hangisinin acil olduğunu GPT-4o belirler
- **Eşleştirme:** Enkaza en uygun kaynağı (vinç, ambulans, arama-kurtarma ekibi) otomatik önerir
- **İletişim:** İnternet olmayan bölgelerden SMS ile ihbar alır, görevlilere otomatik SMS gönderir

---

## 🖥️ Ekranlar

| Vatandaş | Operatör |
|----------|----------|
| Enkaz ihbar formu (online/SMS) | Canlı harita + ihbar listesi |
| GPT-4o AI analiz sonucu | Kaynak atama paneli |
| Takip numarası | 🤖 AI Brifing butonu |

---

## 🤖 Yapay Zeka Özellikleri

### 1. İhbar Analizi (GPT-4o)
Her ihbar gönderildiğinde GPT-4o devreye girer:
- **Öncelik skoru** üretir (0–100)
- **Güven skoru** üretir
- **Türkçe özet** yazar
- Yüklenen **fotoğrafı görsel olarak analiz** eder

### 2. Duplicate Tespiti (Sentence Transformers)
Aynı enkaz için birden fazla ihbar gelirse sistem otomatik birleştirir. Model yüklenemezse kelime örtüşme algoritmasına döner.

### 3. Kaynak Eşleştirme
İhtiyaca göre (vinç/ambulans/arama-kurtarma) en uygun müsait kaynağı mesafeye göre sıralayarak önerir.

### 4. Operatör Brifing (GPT-4o)
Operatör panelindeki **🤖 Brifing** butonu ile GPT-4o tüm aktif ihbarları okuyup operasyonel durum özeti üretir:
- Genel durum
- En kritik vakalar
- Önerilen aksiyon

---

## 📡 SMS Sistemi (Twilio)

**Vatandaştan sisteme:**
1. Vatandaş offline form doldurur → şifreli SMS kodu oluşur
2. `+1 (978) 754-6496` numarasına gönderir
3. Backend kodu çözümler → ihbar sisteme düşer

**Sistemden görevliye:**
- Operatör atama yapınca görevliye otomatik SMS gider
- Format: `KAYIT|tip|isim|tel|lat,lng|ekipman`

---

## 🛠️ Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| **Backend** | Python, FastAPI, SQLAlchemy 2.0, aiosqlite |
| **Frontend** | React 18, Vite, TailwindCSS, Leaflet |
| **Yapay Zeka** | GPT-4o (OpenAI), Sentence Transformers |
| **Gerçek Zamanlı** | WebSocket |
| **SMS** | Twilio |
| **Veritabanı** | SQLite (lokal), PostgreSQL (production) |
| **Deployment** | Render.com |

---

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler
- Python 3.11+
- Node.js 18+

### Backend

```bash
cd backend
pip install -r requirements.txt
```

`.env` dosyası oluştur:
```env
OPENAI_API_KEY=sk-...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
MERKEZ_PHONE_NUMBER=+90...
DUPLICATE_THRESHOLD=0.65
```

Başlat:
```bash
python -m uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Tarayıcı: `http://localhost:5173`

---

## 📁 Proje Yapısı

```
rozi/
├── backend/
│   ├── main.py              # FastAPI app, lifespan, static serve
│   ├── models.py            # SQLAlchemy modelleri
│   ├── seed.py              # Demo veri yükleyici
│   ├── routers/
│   │   ├── ihbar.py         # İhbar CRUD + AI brifing
│   │   ├── kaynak.py        # Kaynak CRUD
│   │   └── sms.py           # Twilio webhook
│   └── services/
│       ├── ai_service.py    # GPT-4o analiz
│       ├── duplicate_service.py  # Embedding + duplicate tespiti
│       ├── matching_service.py   # Kaynak eşleştirme
│       ├── sms_service.py   # SMS encode/decode
│       └── twilio_service.py    # Twilio entegrasyonu
└── frontend/
    └── src/
        ├── pages/
        │   ├── IhbarForm.jsx     # Vatandaş ihbar formu
        │   ├── OperatorPanel.jsx # Operatör koordinasyon paneli
        │   └── OperatorGiris.jsx # Operatör giriş ekranı
        └── api.js               # Tüm API çağrıları
```

---

## 🌐 Deployment (Render.com)

**Build:** `pip install -r backend/requirements.txt`  
**Start:** `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`

Environment Variables:
- `OPENAI_API_KEY`
- `DATABASE_URL` (PostgreSQL — kalıcı depolama için)
- Twilio değişkenleri

İlk deployment'ta demo verisi otomatik yüklenir (`seed_silently()`).

---

## 👥 Geliştirici

**Takım:** codepuffgirls  
**Hackathon:** EBST Hackathon 2026
