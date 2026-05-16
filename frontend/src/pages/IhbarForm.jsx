import { useState, useRef, useEffect } from "react"
import { postIhbar } from "../api"

const NEED_MAP = {
  "bilinmiyor": "OTHER",
  "vinç": "CRANE",
  "ambulans": "AMBULANCE",
  "ilaç": "MEDICINE",
  "gonullu": "VOLUNTEER",
  "tirci": "TRUCK",
}

function smsCodOlustur(form, gaz, yarali) {
  const sev = form.ses_var ? "RED" : (yarali ? "ORANGE" : "GREEN")
  const konum = form.lat && form.lng ? `${parseFloat(form.lat).toFixed(4)},${parseFloat(form.lng).toFixed(4)}` : "0,0"
  const kisi = form.kisi_sayisi === "5+" ? 5 : form.kisi_sayisi === "3-5" ? 3 : form.kisi_sayisi === "1-2" ? 1 : 0
  const need = NEED_MAP[form.ihtiyac] || "OTHER"
  const adres = form.adres.slice(0, 30).replace(/\|/g, " ")
  return `EQ|${sev}|${konum}|INJ:${yarali ? 1 : 0}|TRP:${form.ses_var ? 1 : 0}|VOICE:${form.ses_var ? 1 : 0}|GAS:${gaz ? 1 : 0}|NEED:${need}|CNT:${kisi}|ADDR:${adres}`
}

export default function IhbarForm() {
  const [form, setForm] = useState({
    adres: "",
    ses_var: false,
    kisi_sayisi: "bilinmiyor",
    ihtiyac: "bilinmiyor",
    lat: "",
    lng: "",
  })
  const [fotograf, setFotograf] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sonuc, setSonuc] = useState(null)
  const [hata, setHata] = useState(null)
  const [gaz, setGaz] = useState(false)
  const [yarali, setYarali] = useState(false)
  const [offlineMod, setOfflineMod] = useState(false)
  const [smsKodu, setSmsKodu] = useState("")
  const [kopya, setKopya] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    // İnternet bağlantısını kontrol et
    const kontrol = async () => {
      try {
        await fetch("https://api.openai.com", { method: "HEAD", signal: AbortSignal.timeout(3000) })
      } catch {
        setOfflineMod(true)
      }
    }
    kontrol()
  }, [])

  useEffect(() => {
    if (offlineMod && form.adres) {
      setSmsKodu(smsCodOlustur(form, gaz, yarali))
    }
  }, [form, gaz, yarali, offlineMod])

  const konumAl = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm((f) => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude })),
      () => setHata("Konum alınamadı")
    )
  }

  const fotografSec = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFotograf(file)
    setPreview(URL.createObjectURL(file))
  }

  const gonder = async (e) => {
    e.preventDefault()
    setLoading(true)
    setHata(null)
    setSonuc(null)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => v !== "" && fd.append(k, v))
      if (fotograf) fd.append("fotograf", fotograf)
      const data = await postIhbar(fd)
      setSonuc(data)
    } catch (err) {
      setHata(err.response?.data?.detail || "Gönderim başarısız")
    } finally {
      setLoading(false)
    }
  }

  if (sonuc) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-8 bg-gray-900 rounded-2xl text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold mb-2">İhbarınız alındı</h2>
        <p className="text-gray-400 mb-6">{sonuc.ozet}</p>
        <div className="flex gap-4 justify-center mb-6">
          <div className="bg-red-950 border border-red-700 rounded-xl p-4 flex-1">
            <div className="text-2xl font-bold text-red-400">{sonuc.oncelik_skoru}</div>
            <div className="text-xs text-gray-400">Öncelik skoru</div>
          </div>
          <div className="bg-yellow-950 border border-yellow-700 rounded-xl p-4 flex-1">
            <div className="text-2xl font-bold text-yellow-400">{sonuc.guven_skoru}</div>
            <div className="text-xs text-gray-400">Güven skoru</div>
          </div>
        </div>
        {sonuc.duplicate_id && (
          <p className="text-yellow-400 text-sm mb-4">
            ⚠️ Bu ihbar #{sonuc.duplicate_id} ile benzer — sistem birleştirdi.
          </p>
        )}
        <button
          onClick={() => { setSonuc(null); setFotograf(null); setPreview(null) }}
          className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg text-sm"
        >
          Yeni ihbar gönder
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto mt-8 px-4">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Enkaz İhbarı</h1>
        <button
          onClick={() => setOfflineMod((v) => !v)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition ${offlineMod ? "bg-orange-900 border-orange-600 text-orange-300" : "bg-gray-800 border-gray-700 text-gray-400"}`}
        >
          {offlineMod ? "📵 Offline Mod" : "🌐 Online Mod"}
        </button>
      </div>
      <p className="text-gray-400 text-sm mb-4">
        {offlineMod
          ? "İnternet yok — SMS kodu oluşturulacak. 📱 Kodu 182'ye veya koordinasyon merkezine gönderin."
          : "Bilgileri doldurun, AI analiz edecek."}
      </p>

      {offlineMod && (
        <div className="bg-orange-950 border border-orange-700 rounded-xl p-4 mb-4">
          <p className="text-xs text-orange-300 font-semibold mb-2">📡 Offline Mod Aktif</p>
          <p className="text-xs text-gray-400 mb-3">Formu doldurun, SMS kodu otomatik oluşur. Bu kodu koordinasyon merkezine veya <strong>182</strong>'ye gönderin.</p>
          {smsKodu && (
            <>
              <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs text-green-400 break-all mb-2">
                {smsKodu}
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(smsKodu); setKopya(true); setTimeout(() => setKopya(false), 2000) }}
                className="w-full bg-orange-700 hover:bg-orange-600 py-2 rounded-lg text-xs font-semibold"
              >
                {kopya ? "✅ Kopyalandı!" : "📋 Kodu Kopyala"}
              </button>
            </>
          )}
        </div>
      )}

      <form onSubmit={gonder} className="space-y-4">
        {/* Fotoğraf */}
        <div
          className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-red-500 transition"
          onClick={() => fileRef.current.click()}
        >
          {preview ? (
            <img src={preview} alt="önizleme" className="max-h-40 mx-auto rounded-lg" />
          ) : (
            <>
              <div className="text-3xl mb-2">📷</div>
              <p className="text-gray-400 text-sm">Fotoğraf ekle (opsiyonel)</p>
            </>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={fotografSec} />
        </div>

        {/* Adres */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">Adres *</label>
          <textarea
            required
            rows={2}
            placeholder="Hatay Antakya Akdeniz Cad. No:14"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
            value={form.adres}
            onChange={(e) => setForm((f) => ({ ...f, adres: e.target.value }))}
          />
        </div>

        {/* GPS */}
        <div className="flex gap-2">
          <input
            type="number" step="any" placeholder="Enlem"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none"
            value={form.lat}
            onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
          />
          <input
            type="number" step="any" placeholder="Boylam"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none"
            value={form.lng}
            onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
          />
          <button
            type="button"
            onClick={konumAl}
            className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg text-sm whitespace-nowrap"
          >
            📍 GPS Al
          </button>
        </div>

        {/* Ek sorular */}
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-5 h-5 accent-red-500" checked={form.ses_var}
              onChange={(e) => setForm((f) => ({ ...f, ses_var: e.target.checked }))} />
            <span className="text-sm">🔊 Enkaz altından ses / hareket var</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-5 h-5 accent-orange-500" checked={yarali}
              onChange={(e) => setYarali(e.target.checked)} />
            <span className="text-sm">🩹 Yaralı var</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-5 h-5 accent-yellow-500" checked={gaz}
              onChange={(e) => setGaz(e.target.checked)} />
            <span className="text-sm">⚠️ Gaz kokusu var</span>
          </label>
        </div>

        {/* Kişi sayısı */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">Tahmini kişi sayısı</label>
          <select
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none"
            value={form.kisi_sayisi}
            onChange={(e) => setForm((f) => ({ ...f, kisi_sayisi: e.target.value }))}
          >
            <option value="bilinmiyor">Bilinmiyor</option>
            <option value="1-2">1-2 kişi</option>
            <option value="3-5">3-5 kişi</option>
            <option value="5+">5+ kişi</option>
          </select>
        </div>

        {/* İhtiyaç */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">Ne lazım?</label>
          <select
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none"
            value={form.ihtiyac}
            onChange={(e) => setForm((f) => ({ ...f, ihtiyac: e.target.value }))}
          >
            <option value="bilinmiyor">Bilinmiyor</option>
            <option value="vinç">Vinç</option>
            <option value="ambulans">Ambulans</option>
            <option value="ilaç">İlaç / Tıbbi yardım</option>
            <option value="gonullu">Gönüllü</option>
            <option value="tirci">Tır / Kamyon</option>
          </select>
        </div>

        {hata && <p className="text-red-400 text-sm">{hata}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-700 py-3 rounded-xl font-semibold text-sm transition"
        >
          {loading ? "AI analiz ediyor..." : "🆘 İhbar Gönder"}
        </button>
      </form>
    </div>
  )
}
