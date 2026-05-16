import { useState, useRef } from "react"
import { postIhbar } from "../api"

const IHTIYAC_SECENEKLERI = [
  { value: "arama_kurtarma", label: "🔍 Arama kurtarma ekibi" },
  { value: "ambulans",       label: "🚑 Sağlık / Ambulans"    },
  { value: "vinc",           label: "🏗️ Vinç"                 },
  { value: "kepce",          label: "⚙️ Kepçe / İş makinesi" },
  { value: "itfaiye",        label: "🚒 İtfaiye"              },
  { value: "tirci",          label: "🚛 Tır / Kamyon"         },
  { value: "ilac",           label: "💊 İlaç / Tıbbi yardım" },
  { value: "gonullu",        label: "🤝 Gönüllü"              },
  { value: "bilinmiyor",     label: "❓ Bilinmiyor"           },
]

const KISI_SECENEKLERI = [
  { value: "bilinmiyor", label: "Bilinmiyor" },
  { value: "1-5",        label: "1 – 5 kişi" },
  { value: "5-15",       label: "5 – 15 kişi" },
  { value: "15+",        label: "15+ kişi" },
]

export default function IhbarForm() {
  const [form, setForm]             = useState({ adres: "", ses_var: false, kisi_sayisi: "bilinmiyor", lat: "", lng: "" })
  const [ihtiyaclar, setIhtiyaclar] = useState([])
  const [fotograf, setFotograf]     = useState(null)
  const [preview, setPreview]       = useState(null)
  const [gaz, setGaz]               = useState(false)
  const [yarali, setYarali]         = useState(false)
  const [gpsYukleniyor, setGpsY]    = useState(false)
  const [loading, setLoading]       = useState(false)
  const [sonuc, setSonuc]           = useState(null)
  const [hata, setHata]             = useState(null)
  const fileRef = useRef()

  const sifirla = () => {
    setSonuc(null); setFotograf(null); setPreview(null)
    setIhtiyaclar([]); setGaz(false); setYarali(false)
    setForm({ adres: "", ses_var: false, kisi_sayisi: "bilinmiyor", lat: "", lng: "" })
  }

  const konumAl = () => {
    setHata(null)
    if (!navigator.geolocation) { setHata("Tarayıcınız konum desteklemiyor."); return }
    setGpsY(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm(f => ({ ...f, lat: coords.latitude.toFixed(6), lng: coords.longitude.toFixed(6) }))
        setGpsY(false)
      },
      (err) => {
        setGpsY(false)
        setHata(
          err.code === 1 ? "📍 Konum izni reddedildi. Tarayıcı ayarlarından izin verin." :
          err.code === 2 ? "📍 GPS sinyali alınamadı." : "📍 Konum zaman aşımına uğradı."
        )
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    )
  }

  const toggleIhtiyac = (v) =>
    setIhtiyaclar(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v])

  const fotografSec = (e) => {
    const f = e.target.files[0]; if (!f) return
    setFotograf(f); setPreview(URL.createObjectURL(f))
  }

  const gonder = async (e) => {
    e.preventDefault()
    if (!form.adres.trim()) { setHata("Adres zorunludur."); return }
    setLoading(true); setHata(null)
    try {
      const fd = new FormData()
      fd.append("adres",       form.adres)
      fd.append("ses_var",     form.ses_var)
      fd.append("kisi_sayisi", form.kisi_sayisi)
      fd.append("ihtiyac",     ihtiyaclar.length ? ihtiyaclar.join(",") : "bilinmiyor")
      fd.append("gaz_kokusu",  gaz)
      fd.append("yarali_var",  yarali)
      if (form.lat) fd.append("lat", form.lat)
      if (form.lng) fd.append("lng", form.lng)
      if (fotograf) fd.append("fotograf", fotograf)
      setSonuc(await postIhbar(fd))
    } catch (err) {
      setHata(err.response?.data?.detail || "İhbar gönderilemedi. Lütfen tekrar deneyin.")
    } finally { setLoading(false) }
  }

  // ── BAŞARI EKRANI ────────────────────────────────────────────────────────────
  if (sonuc) {
    return (
      <div className="w-full bg-gray-950 min-h-full">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-4">

          <div className="bg-gray-900 rounded-2xl p-8 border border-green-700 text-center space-y-3">
            <div className="text-6xl">✅</div>
            <h2 className="text-2xl font-bold text-white">İhbarınız Alındı</h2>
            <p className="text-gray-400 text-sm">
              İhbar <span className="text-white font-semibold">#{sonuc.id}</span> numarasıyla sisteme kaydedildi.
            </p>
            <p className="text-gray-500 text-sm">
              Koordinasyon merkezi bilgilendirildi. En kısa sürede ekip yönlendirilecektir.
            </p>
          </div>

          {sonuc.duplicate_id && (
            <div className="bg-blue-950 border border-blue-800 rounded-xl p-3 text-sm text-blue-300 text-center">
              📍 Bölgenizde başka ihbarlar da mevcut — ekipler koordineli müdahale edecek.
            </div>
          )}

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-xs text-gray-500 space-y-1.5">
            <p>📞 Acil durumda <strong className="text-white">112</strong>'yi arayın.</p>
            <p>🚫 Enkaz bölgesinden uzaklaşın, kurtarma ekiplerinin çalışmasına izin verin.</p>
            <p>📶 Telefonu şarjlı tutun, koordinasyon merkezi sizi arayabilir.</p>
          </div>

          <button onClick={sifirla}
            className="w-full bg-red-700 hover:bg-red-600 py-4 rounded-xl text-sm font-bold transition">
            🆘 Yeni İhbar Gönder
          </button>
        </div>
      </div>
    )
  }

  // ── FORM ─────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full bg-gray-950 min-h-full">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 space-y-4">

        <div>
          <h1 className="text-xl font-bold">🆘 Enkaz İhbarı</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Formu doldurun — AI analiz eder, koordinasyon merkezine iletir.
          </p>
        </div>

        <form onSubmit={gonder} className="space-y-4">

          {/* Fotoğraf */}
          <div
            className="border-2 border-dashed border-gray-700 rounded-xl p-4 text-center cursor-pointer hover:border-red-500 transition"
            onClick={() => fileRef.current.click()}
          >
            {preview
              ? <img src={preview} alt="" className="max-h-40 mx-auto rounded-lg" />
              : <><div className="text-3xl mb-1">📷</div><p className="text-sm text-gray-400">Fotoğraf ekle <span className="text-gray-600">(opsiyonel — AI skoru artırır)</span></p></>}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={fotografSec} />
          </div>

          {/* Adres */}
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-1.5">📍 Adres <span className="text-red-400">*</span></label>
            <textarea required rows={2} placeholder="Örn: Hatay Antakya Akdeniz Cad. No:14"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 resize-none"
              value={form.adres} onChange={e => setForm(f => ({ ...f, adres: e.target.value }))} />
          </div>

          {/* GPS */}
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-1.5">🛰️ GPS Konumu</label>
            <div className="flex gap-2">
              <input type="number" step="any" placeholder="Enlem"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                value={form.lat} onChange={e => setForm(f => ({ ...f, lat: e.target.value }))} />
              <input type="number" step="any" placeholder="Boylam"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                value={form.lng} onChange={e => setForm(f => ({ ...f, lng: e.target.value }))} />
              <button type="button" onClick={konumAl} disabled={gpsYukleniyor}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 px-4 rounded-xl text-sm font-semibold transition whitespace-nowrap">
                {gpsYukleniyor ? "⏳" : "📍 Al"}
              </button>
            </div>
            {form.lat && form.lng && (
              <p className="text-xs text-green-400 mt-1.5">✅ Konum alındı: {parseFloat(form.lat).toFixed(5)}, {parseFloat(form.lng).toFixed(5)}</p>
            )}
          </div>

          {/* Durum */}
          <div className="bg-gray-800/60 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-200 mb-3">Durum Bilgisi</p>
            <div className="space-y-2.5">
              {[
                { val: form.ses_var, set: v => setForm(f => ({ ...f, ses_var: v })), label: "🔊 Enkaz altından ses / hareket var" },
                { val: yarali, set: setYarali, label: "🩹 Yaralı var" },
                { val: gaz,    set: setGaz,    label: "⚠️ Gaz kokusu var" },
              ].map(({ val, set, label }) => (
                <label key={label} className="flex items-center gap-3 cursor-pointer select-none">
                  <div onClick={() => set(!val)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition
                      ${val ? "bg-red-500 border-red-500" : "border-gray-500 bg-gray-700"}`}>
                    {val && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Kişi sayısı */}
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-2">👥 Tahmini kişi sayısı</label>
            <div className="grid grid-cols-4 gap-2">
              {KISI_SECENEKLERI.map(({ value, label }) => (
                <button key={value} type="button" onClick={() => setForm(f => ({ ...f, kisi_sayisi: value }))}
                  className={`py-2.5 rounded-xl text-sm font-medium transition border ${
                    form.kisi_sayisi === value
                      ? "bg-red-600 border-red-500 text-white"
                      : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* İhtiyaçlar */}
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-2">
              🚨 Ne gerekiyor? <span className="text-gray-500 font-normal text-xs">(çoklu seçim)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {IHTIYAC_SECENEKLERI.map(({ value, label }) => {
                const secili = ihtiyaclar.includes(value)
                return (
                  <button key={value} type="button" onClick={() => toggleIhtiyac(value)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-left transition border ${
                      secili ? "bg-red-900/50 border-red-600 text-white" : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500"}`}>
                    <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition ${secili ? "bg-red-500 border-red-500" : "border-gray-500"}`}>
                      {secili && <span className="text-white text-[10px] font-bold">✓</span>}
                    </div>
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {hata && <div className="bg-red-950 border border-red-700 rounded-xl p-3 text-sm text-red-300">{hata}</div>}

          <button type="submit" disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-700 py-4 rounded-xl font-bold text-base transition flex items-center justify-center gap-2">
            {loading
              ? <><span className="animate-spin inline-block">⏳</span> AI analiz ediyor...</>
              : "🆘 İhbar Gönder"}
          </button>
        </form>
      </div>
    </div>
  )
}
