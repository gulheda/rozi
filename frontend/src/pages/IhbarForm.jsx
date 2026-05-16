import { useState, useRef, useEffect } from "react"
import { postIhbar } from "../api"

const IHTIYAC_SECENEKLERI = [
  { value: "arama_kurtarma", label: "🔍 Arama kurtarma ekibi",    code: "SEARCH"    },
  { value: "ambulans",       label: "🚑 Sağlık ekibi / Ambulans",  code: "AMBULANCE" },
  { value: "vinc",           label: "🏗️ Vinç",                     code: "CRANE"     },
  { value: "kepce",          label: "⚙️ Kepçe / İş makinesi",     code: "EXCAVATOR" },
  { value: "itfaiye",        label: "🚒 İtfaiye",                  code: "FIRE"      },
  { value: "tirci",          label: "🚛 Tır / Kamyon",             code: "TRUCK"     },
  { value: "ilac",           label: "💊 İlaç / Tıbbi yardım",     code: "MEDICINE"  },
  { value: "gonullu",        label: "🤝 Gönüllü",                  code: "VOLUNTEER" },
  { value: "bilinmiyor",     label: "❓ Bilinmiyor",               code: "OTHER"     },
]

const KISI_SECENEKLERI = [
  { value: "bilinmiyor", label: "Bilinmiyor" },
  { value: "1-5",        label: "1 – 5" },
  { value: "5-15",       label: "5 – 15" },
  { value: "15+",        label: "15+" },
]

function smsCodOlustur({ adres, lat, lng, ses_var, kisi_sayisi }, ihtiyaclar, gaz, yarali) {
  const sev = ses_var ? "RED" : yarali ? "ORANGE" : "GREEN"
  const konum = lat && lng ? `${parseFloat(lat).toFixed(4)},${parseFloat(lng).toFixed(4)}` : "0,0"
  const kisi = kisi_sayisi === "15+" ? 15 : kisi_sayisi === "5-15" ? 5 : kisi_sayisi === "1-5" ? 1 : 0
  const needCodes = ihtiyaclar.length
    ? ihtiyaclar.map(v => IHTIYAC_SECENEKLERI.find(x => x.value === v)?.code || "OTHER").join("+")
    : "OTHER"
  const kisaAdres = adres.slice(0, 25).replace(/\|/g, " ")
  return `EQ|${sev}|${konum}|INJ:${yarali ? 1 : 0}|VOICE:${ses_var ? 1 : 0}|GAS:${gaz ? 1 : 0}|NEED:${needCodes}|CNT:${kisi}|ADDR:${kisaAdres}`
}

export default function IhbarForm() {
  const [form, setForm]             = useState({ adres: "", ses_var: false, kisi_sayisi: "bilinmiyor", lat: "", lng: "" })
  const [ihtiyaclar, setIhtiyaclar] = useState([])
  const [fotograf, setFotograf]     = useState(null)
  const [preview, setPreview]       = useState(null)
  const [gaz, setGaz]               = useState(false)
  const [yarali, setYarali]         = useState(false)
  const [offlineMod, setOfflineMod] = useState(false)
  const [gpsYukleniyor, setGpsY]    = useState(false)
  const [loading, setLoading]       = useState(false)
  const [sonuc, setSonuc]           = useState(null)
  const [hata, setHata]             = useState(null)
  const [kopya, setKopya]           = useState(false)
  const fileRef = useRef()

  const smsKodu = smsCodOlustur(form, ihtiyaclar, gaz, yarali)

  // İnternet kontrolü
  useEffect(() => {
    const kontrol = () => setOfflineMod(!navigator.onLine)
    kontrol()
    window.addEventListener("online",  kontrol)
    window.addEventListener("offline", kontrol)
    return () => { window.removeEventListener("online", kontrol); window.removeEventListener("offline", kontrol) }
  }, [])

  // GPS
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
        const msg = err.code === 1 ? "Konum izni reddedildi. Tarayıcı ayarlarından izin verin."
                  : err.code === 2 ? "Konum alınamadı — GPS sinyali yok."
                  : "Konum zaman aşımına uğradı."
        setHata("📍 " + msg)
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
      setHata(err.response?.data?.detail || "Bağlantı hatası. İnternet bağlantınızı kontrol edin.")
    } finally { setLoading(false) }
  }

  // Başarı ekranı
  if (sonuc) {
    const renk = sonuc.oncelik_skoru >= 70 ? "text-red-400" : sonuc.oncelik_skoru >= 40 ? "text-yellow-400" : "text-green-400"
    return (
      <div className="max-w-md mx-auto p-4 pt-6">
        <div className="bg-gray-900 rounded-2xl p-6 border border-green-700 text-center space-y-4">
          <div className="text-5xl">✅</div>
          <div>
            <h2 className="text-xl font-bold">İhbarınız alındı!</h2>
            <p className="text-gray-400 text-sm mt-1">Koordinasyon merkezine otomatik iletildi.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800 rounded-xl p-3">
              <div className={`text-3xl font-black ${renk}`}>{sonuc.oncelik_skoru}</div>
              <div className="text-xs text-gray-500 mt-0.5">Öncelik</div>
            </div>
            <div className="bg-gray-800 rounded-xl p-3">
              <div className="text-3xl font-black text-blue-400">{sonuc.guven_skoru}</div>
              <div className="text-xs text-gray-500 mt-0.5">Güven</div>
            </div>
          </div>
          {sonuc.ozet && <p className="text-sm text-gray-300 bg-gray-800 rounded-xl p-3 text-left italic">"{sonuc.ozet}"</p>}
          {sonuc.duplicate_id && (
            <p className="text-yellow-300 text-sm bg-yellow-950 border border-yellow-800 rounded-xl p-3">
              ⚠️ Bu ihbar #{sonuc.duplicate_id} ile aynı bölge — sistem birleştirdi.
            </p>
          )}
          <div className="bg-green-950 border border-green-800 rounded-xl p-3 text-green-300 text-sm">
            📡 SMS merkeze otomatik gönderildi.
          </div>
          <button onClick={() => { setSonuc(null); setFotograf(null); setPreview(null); setIhtiyaclar([]) }}
            className="w-full bg-gray-700 hover:bg-gray-600 py-3 rounded-xl text-sm font-semibold transition">
            Yeni ihbar gönder
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pt-5 space-y-4">

      {/* Mod seçici */}
      <div className="flex gap-2">
        <button onClick={() => setOfflineMod(false)}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition ${!offlineMod ? "bg-blue-700 border-blue-600 text-white" : "bg-gray-800 border-gray-700 text-gray-400"}`}>
          🌐 Online — Direkt Gönder
        </button>
        <button onClick={() => setOfflineMod(true)}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition ${offlineMod ? "bg-orange-700 border-orange-600 text-white" : "bg-gray-800 border-gray-700 text-gray-400"}`}>
          📵 Offline — SMS Kodu
        </button>
      </div>

      {/* Offline SMS kutusu */}
      {offlineMod && (
        <div className="bg-orange-950 border border-orange-700 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-orange-300">📡 Offline Mod — SMS Kodu</p>
          <p className="text-xs text-gray-400">Formu doldurun, kod oluşsun. Kodu kopyalayıp <strong>+1 (978) 754-6496</strong> numarasına gönderin.</p>
          <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs text-green-400 break-all">{smsKodu}</div>
          <button onClick={() => { navigator.clipboard.writeText(smsKodu); setKopya(true); setTimeout(() => setKopya(false), 2000) }}
            className="w-full bg-orange-700 hover:bg-orange-600 py-2.5 rounded-xl text-sm font-semibold transition">
            {kopya ? "✅ Kopyalandı!" : "📋 SMS Kodunu Kopyala"}
          </button>
        </div>
      )}

      <form onSubmit={gonder} className="space-y-4">

        {/* Fotoğraf */}
        <div className="border-2 border-dashed border-gray-700 rounded-xl p-4 text-center cursor-pointer hover:border-red-500 transition"
          onClick={() => fileRef.current.click()}>
          {preview
            ? <img src={preview} alt="" className="max-h-40 mx-auto rounded-lg" />
            : <><div className="text-3xl mb-1">📷</div><p className="text-sm text-gray-400">Fotoğraf ekle <span className="text-gray-600">(opsiyonel — AI skoru artırır)</span></p></>
          }
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
            <input type="number" step="any" placeholder="Enlem (lat)"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              value={form.lat} onChange={e => setForm(f => ({ ...f, lat: e.target.value }))} />
            <input type="number" step="any" placeholder="Boylam (lng)"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              value={form.lng} onChange={e => setForm(f => ({ ...f, lng: e.target.value }))} />
            <button type="button" onClick={konumAl} disabled={gpsYukleniyor}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 px-4 rounded-xl text-sm font-semibold transition whitespace-nowrap">
              {gpsYukleniyor ? "⏳" : "📍 Al"}
            </button>
          </div>
          {form.lat && form.lng && (
            <p className="text-xs text-green-400 mt-1.5">✅ {parseFloat(form.lat).toFixed(5)}, {parseFloat(form.lng).toFixed(5)}</p>
          )}
        </div>

        {/* Durum */}
        <div className="bg-gray-800/60 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-200 mb-3">Durum Bilgisi</p>
          <div className="space-y-2.5">
            {[
              { val: form.ses_var, set: v => setForm(f => ({...f, ses_var: v})), label: "🔊 Enkaz altından ses / hareket var" },
              { val: yarali, set: setYarali, label: "🩹 Yaralı var" },
              { val: gaz,    set: setGaz,    label: "⚠️ Gaz kokusu var" },
            ].map(({ val, set, label }) => (
              <label key={label} className="flex items-center gap-3 cursor-pointer select-none">
                <div onClick={() => set(!val)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition cursor-pointer
                    ${val ? "bg-red-500 border-red-500" : "border-gray-500 bg-gray-700"}`}>
                  {val && <span className="text-white text-xs font-bold">✓</span>}
                </div>
                <span className="text-sm text-gray-200">{label}</span>
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
                  <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition ${secili ? "bg-red-500 border-red-500" : "border-gray-500"}`}>
                    {secili && <span className="text-white text-xs">✓</span>}
                  </div>
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {hata && (
          <div className="bg-red-950 border border-red-700 rounded-xl p-3 text-sm text-red-300">{hata}</div>
        )}

        <button type="submit" disabled={loading}
          className="w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-700 py-4 rounded-xl font-bold text-base transition flex items-center justify-center gap-2">
          {loading
            ? <><span className="animate-spin inline-block">⏳</span> Analiz ediliyor, iletiliyor...</>
            : offlineMod
              ? "📋 SMS Kodunu Oluştur"
              : "🆘 İhbar Gönder → Merkeze Otomatik İletilir"}
        </button>
      </form>
    </div>
  )
}
