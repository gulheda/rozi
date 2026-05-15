import { useState } from "react"
import { postKaynak } from "../api"

export default function KaynakForm() {
  const [form, setForm] = useState({
    isim: "",
    tip: "gonullu",
    ekipman: "",
    telefon: "",
    lat: "",
    lng: "",
  })
  const [loading, setLoading] = useState(false)
  const [sonuc, setSonuc] = useState(null)
  const [hata, setHata] = useState(null)

  const konumAl = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm((f) => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude })),
      () => setHata("Konum alınamadı")
    )
  }

  const gonder = async (e) => {
    e.preventDefault()
    setLoading(true)
    setHata(null)
    try {
      const body = { ...form }
      if (!body.lat) delete body.lat
      if (!body.lng) delete body.lng
      const data = await postKaynak(body)
      setSonuc(data)
    } catch (err) {
      setHata(err.response?.data?.detail || "Kayıt başarısız")
    } finally {
      setLoading(false)
    }
  }

  if (sonuc) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-8 bg-gray-900 rounded-2xl text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold mb-2">Kaydınız alındı</h2>
        <p className="text-gray-400 mb-4">{sonuc.isim} — {sonuc.tip}</p>
        <button
          onClick={() => setSonuc(null)}
          className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg text-sm"
        >
          Yeni kayıt
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto mt-8 px-4">
      <h1 className="text-2xl font-bold mb-1">Kaynak Kaydı</h1>
      <p className="text-gray-400 text-sm mb-6">Yardım etmeye hazırsanız bilgilerinizi girin.</p>

      <form onSubmit={gonder} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">Adınız *</label>
          <input
            required
            type="text"
            placeholder="Mehmet Yılmaz"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            value={form.isim}
            onChange={(e) => setForm((f) => ({ ...f, isim: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">Ne yapabilirsiniz? *</label>
          <select
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none"
            value={form.tip}
            onChange={(e) => setForm((f) => ({ ...f, tip: e.target.value }))}
          >
            <option value="gonullu">Gönüllü</option>
            <option value="tirci">Tırcı / Kamyon sürücüsü</option>
            <option value="doktor">Doktor</option>
            <option value="hemsire">Hemşire</option>
            <option value="diger">Diğer</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">Ekipman / araç</label>
          <input
            type="text"
            placeholder="Kamyon, sedye, ilaç çantası..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none"
            value={form.ekipman}
            onChange={(e) => setForm((f) => ({ ...f, ekipman: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">Telefon</label>
          <input
            type="tel"
            placeholder="0532 000 0000"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none"
            value={form.telefon}
            onChange={(e) => setForm((f) => ({ ...f, telefon: e.target.value }))}
          />
        </div>

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

        {hata && <p className="text-red-400 text-sm">{hata}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-700 hover:bg-green-600 disabled:bg-gray-700 py-3 rounded-xl font-semibold text-sm transition"
        >
          {loading ? "Kaydediliyor..." : "✅ Kayıt Ol"}
        </button>
      </form>
    </div>
  )
}
