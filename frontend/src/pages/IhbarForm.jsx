import { useState, useRef } from "react"
import { postIhbar } from "../api"

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
  const fileRef = useRef()

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
      <h1 className="text-2xl font-bold mb-1">Enkaz İhbarı</h1>
      <p className="text-gray-400 text-sm mb-6">Lütfen bilgileri doldurun, AI analiz edecek.</p>

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

        {/* Ses var mı */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="w-5 h-5 accent-red-500"
            checked={form.ses_var}
            onChange={(e) => setForm((f) => ({ ...f, ses_var: e.target.checked }))}
          />
          <span className="text-sm">Enkaz altından ses / hareket var</span>
        </label>

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
