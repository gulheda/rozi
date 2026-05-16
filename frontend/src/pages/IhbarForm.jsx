import { useState, useRef, useEffect } from "react"
import { postIhbar } from "../api"

// ── Sabitler ────────────────────────────────────────────────────────────────
const IHTIYAC_SECENEKLERI = [
  { value: "arama_kurtarma", label: "🔍 Arama kurtarma ekibi",   code: "SEARCH"    },
  { value: "ambulans",       label: "🚑 Sağlık ekibi / Ambulans", code: "AMBULANCE" },
  { value: "vinç",           label: "🏗️ Vinç",                    code: "CRANE"     },
  { value: "kepçe",          label: "⚙️ Kepçe / İş makinesi",    code: "EXCAVATOR" },
  { value: "itfaiye",        label: "🚒 İtfaiye",                 code: "FIRE"      },
  { value: "tirci",          label: "🚛 Tır / Kamyon",            code: "TRUCK"     },
  { value: "ilaç",           label: "💊 İlaç / Tıbbi yardım",    code: "MEDICINE"  },
  { value: "gonullu",        label: "🤝 Gönüllü",                 code: "VOLUNTEER" },
  { value: "bilinmiyor",     label: "❓ Bilinmiyor",              code: "OTHER"     },
]

const KISI_SECENEKLERI = [
  { value: "bilinmiyor", label: "Bilinmiyor" },
  { value: "1-5",        label: "1 – 5 kişi" },
  { value: "5-15",       label: "5 – 15 kişi" },
  { value: "15+",        label: "15+ kişi" },
]

// ── Bileşen ──────────────────────────────────────────────────────────────────
export default function IhbarForm() {
  const [form, setForm] = useState({
    adres: "",
    ses_var: false,
    kisi_sayisi: "bilinmiyor",
    lat: "",
    lng: "",
  })
  const [ihtiyaclar, setIhtiyaclar]     = useState([])   // çoklu seçim
  const [fotograf, setFotograf]         = useState(null)
  const [preview, setPreview]           = useState(null)
  const [loading, setLoading]           = useState(false)
  const [konumYukleniyor, setKonumY]    = useState(false)
  const [gaz, setGaz]                   = useState(false)
  const [yarali, setYarali]             = useState(false)
  const [sonuc, setSonuc]               = useState(null)
  const [hata, setHata]                 = useState(null)
  const fileRef = useRef()

  // ── GPS ───────────────────────────────────────────────────────────────────
  const konumAl = () => {
    setHata(null)
    if (!navigator.geolocation) {
      setHata("❌ Tarayıcınız konum desteği sunmuyor.")
      return
    }
    setKonumY(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({
          ...f,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }))
        setKonumY(false)
      },
      (err) => {
        setKonumY(false)
        if (err.code === 1)
          setHata("❌ Konum izni reddedildi. Tarayıcı ayarlarından izin verin.")
        else if (err.code === 2)
          setHata("❌ Konum alınamadı. GPS sinyali zayıf.")
        else
          setHata("❌ Konum zaman aşımına uğradı. Tekrar deneyin.")
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    )
  }

  // ── Fotoğraf ──────────────────────────────────────────────────────────────
  const fotografSec = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFotograf(file)
    setPreview(URL.createObjectURL(file))
  }

  // ── İhtiyaç toggle ────────────────────────────────────────────────────────
  const toggleIhtiyac = (value) => {
    setIhtiyaclar(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  // ── Gönder ────────────────────────────────────────────────────────────────
  const gonder = async (e) => {
    e.preventDefault()
    if (!form.adres.trim()) { setHata("❌ Adres zorunludur."); return }
    setLoading(true)
    setHata(null)
    setSonuc(null)

    try {
      const fd = new FormData()
      fd.append("adres",      form.adres)
      fd.append("ses_var",    form.ses_var)
      fd.append("kisi_sayisi", form.kisi_sayisi)
      if (form.lat)  fd.append("lat", form.lat)
      if (form.lng)  fd.append("lng", form.lng)
      fd.append("gaz_kokusu", gaz)
      fd.append("yarali_var", yarali)

      // Çoklu ihtiyaç → virgülle birleştir
      const ihtiyac = ihtiyaclar.length > 0
        ? ihtiyaclar.join(",")
        : "bilinmiyor"
      fd.append("ihtiyac", ihtiyac)

      if (fotograf) fd.append("fotograf", fotograf)

      const data = await postIhbar(fd)
      setSonuc(data)
    } catch (err) {
      setHata(err.response?.data?.detail || "❌ Gönderim başarısız, tekrar deneyin.")
    } finally {
      setLoading(false)
    }
  }

  // ── Başarı ekranı ─────────────────────────────────────────────────────────
  if (sonuc) {
    const renk = sonuc.oncelik_skoru >= 70 ? "text-red-400" :
                 sonuc.oncelik_skoru >= 40 ? "text-yellow-400" : "text-green-400"
    return (
      <div className="max-w-lg mx-auto mt-10 px-4">
        <div className="bg-gray-900 rounded-2xl p-8 text-center border border-green-700">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold mb-1">İhbarınız alındı</h2>
          <p className="text-gray-400 text-sm mb-6">Koordinasyon merkezine otomatik iletildi.</p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-gray-800 rounded-xl p-4">
              <div className={`text-3xl font-black ${renk}`}>{sonuc.oncelik_skoru}</div>
              <div className="text-xs text-gray-400 mt-1">Öncelik skoru</div>
            </div>
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="text-3xl font-black text-blue-400">{sonuc.guven_skoru}</div>
              <div className="text-xs text-gray-400 mt-1">Güven skoru</div>
            </div>
          </div>

          {sonuc.ozet && (
            <p className="text-sm text-gray-300 italic bg-gray-800 rounded-xl p-3 mb-4 text-left">
              "{sonuc.ozet}"
            </p>
          )}

          {sonuc.duplicate_id && (
            <div className="bg-yellow-950 border border-yellow-700 rounded-xl p-3 text-sm text-yellow-300 mb-4">
              ⚠️ Bu ihbar #{sonuc.duplicate_id} ile aynı bölge — sistem birleştirdi.
            </div>
          )}

          <div className="bg-green-950 border border-green-700 rounded-xl p-3 text-sm text-green-300 mb-6">
            📡 SMS koordinasyon merkezine otomatik gönderildi.
          </div>

          <button
            onClick={() => { setSonuc(null); setFotograf(null); setPreview(null); setIhtiyaclar([]) }}
            className="bg-gray-700 hover:bg-gray-600 px-8 py-3 rounded-xl text-sm font-semibold transition"
          >
            Yeni ihbar gönder
          </button>
        </div>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto mt-6 px-4 pb-4">
      <h1 className="text-2xl font-bold mb-1">🆘 Enkaz İhbarı</h1>
      <p className="text-gray-400 text-sm mb-5">
        Formu doldurun — SMS merkeze otomatik iletilir.
      </p>

      <form onSubmit={gonder} className="space-y-5">

        {/* Fotoğraf */}
        <div
          className="border-2 border-dashed border-gray-700 rounded-xl p-5 text-center cursor-pointer hover:border-red-500 transition"
          onClick={() => fileRef.current.click()}
        >
          {preview ? (
            <img src={preview} alt="önizleme" className="max-h-44 mx-auto rounded-lg" />
          ) : (
            <>
              <div className="text-4xl mb-2">📷</div>
              <p className="text-gray-400 text-sm">Fotoğraf ekle <span className="text-gray-600">(opsiyonel — AI skoru artırır)</span></p>
            </>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={fotografSec} />
        </div>

        {/* Adres */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            📍 Adres <span className="text-red-400">*</span>
          </label>
          <textarea
            required
            rows={2}
            placeholder="Örn: Hatay Antakya Akdeniz Cad. No:14"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 resize-none"
            value={form.adres}
            onChange={(e) => setForm(f => ({ ...f, adres: e.target.value }))}
          />
        </div>

        {/* GPS */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">🛰️ Konum</label>
          <div className="flex gap-2">
            <input
              type="number" step="any" placeholder="Enlem"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              value={form.lat}
              onChange={(e) => setForm(f => ({ ...f, lat: e.target.value }))}
            />
            <input
              type="number" step="any" placeholder="Boylam"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              value={form.lng}
              onChange={(e) => setForm(f => ({ ...f, lng: e.target.value }))}
            />
            <button
              type="button"
              onClick={konumAl}
              disabled={konumYukleniyor}
              className="bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition flex items-center gap-1.5"
            >
              {konumYukleniyor ? (
                <><span className="animate-spin">⏳</span> Alınıyor...</>
              ) : (
                <>📍 GPS Al</>
              )}
            </button>
          </div>
          {form.lat && form.lng && (
            <p className="text-xs text-green-400 mt-1.5">
              ✅ Konum alındı: {parseFloat(form.lat).toFixed(4)}, {parseFloat(form.lng).toFixed(4)}
            </p>
          )}
        </div>

        {/* Ek bilgiler */}
        <div className="bg-gray-800/50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-gray-300 mb-2">Durum bilgisi</p>
          {[
            { state: form.ses_var, setter: v => setForm(f => ({...f, ses_var: v})), label: "🔊 Enkaz altından ses / hareket var", color: "accent-green-500" },
            { state: yarali,       setter: setYarali,                                label: "🩹 Yaralı var",                       color: "accent-orange-500" },
            { state: gaz,          setter: setGaz,                                   label: "⚠️ Gaz kokusu var",                   color: "accent-yellow-500" },
          ].map(({ state, setter, label, color }) => (
            <label key={label} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className={`w-5 h-5 rounded ${color}`}
                checked={state}
                onChange={e => setter(e.target.checked)}
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>

        {/* Kişi sayısı */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">👥 Tahmini kişi sayısı</label>
          <div className="grid grid-cols-2 gap-2">
            {KISI_SECENEKLERI.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm(f => ({ ...f, kisi_sayisi: value }))}
                className={`py-2.5 rounded-xl text-sm font-medium transition border ${
                  form.kisi_sayisi === value
                    ? "bg-red-600 border-red-500 text-white"
                    : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* İhtiyaçlar — çoklu seçim */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            🚨 Ne gerekiyor? <span className="text-gray-500 font-normal">(birden fazla seçebilirsiniz)</span>
          </label>
          <div className="grid grid-cols-1 gap-2">
            {IHTIYAC_SECENEKLERI.map(({ value, label }) => {
              const secili = ihtiyaclar.includes(value)
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleIhtiyac(value)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition border text-left ${
                    secili
                      ? "bg-red-900/60 border-red-600 text-red-200"
                      : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500"
                  }`}
                >
                  <span className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    secili ? "bg-red-500 border-red-500" : "border-gray-500"
                  }`}>
                    {secili && <span className="text-white text-xs">✓</span>}
                  </span>
                  {label}
                </button>
              )
            })}
          </div>
          {ihtiyaclar.length > 0 && (
            <p className="text-xs text-red-400 mt-2">
              {ihtiyaclar.length} seçenek seçildi
            </p>
          )}
        </div>

        {hata && (
          <div className="bg-red-950 border border-red-700 rounded-xl p-3 text-sm text-red-300">
            {hata}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-700 py-4 rounded-xl font-bold text-base transition flex items-center justify-center gap-2"
        >
          {loading ? (
            <><span className="animate-spin">⏳</span> AI analiz ediyor, SMS gönderiliyor...</>
          ) : (
            <>🆘 İhbar Gönder — SMS Otomatik İletilir</>
          )}
        </button>

        <p className="text-center text-xs text-gray-600">
          Gönderi otomatik olarak koordinasyon merkezine SMS ile iletilir.
        </p>
      </form>
    </div>
  )
}
