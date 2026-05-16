import { useState } from "react"
import { postKaynak } from "../api"

const TIP_SECENEKLERI = [
  { value: "arama_kurtarma", label: "🔍 Arama & Kurtarma", code: "arama" },
  { value: "ambulans",       label: "🚑 Sağlık / Ambulans", code: "ambulans" },
  { value: "vinc",           label: "🏗️ Vinç Operatörü",   code: "vinc" },
  { value: "kepce",          label: "⚙️ Kepçe / İş Makinesi", code: "kepce" },
  { value: "itfaiye",        label: "🚒 İtfaiye",           code: "itfaiye" },
  { value: "tirci",          label: "🚛 Tır / Kamyon",      code: "tirci" },
  { value: "ilac",           label: "💊 Tıbbi Malzeme",     code: "ilac" },
  { value: "gonullu",        label: "🤝 Gönüllü",           code: "gonullu" },
]

function kayitSmsCodu(form) {
  const lat = form.lat ? parseFloat(form.lat).toFixed(4) : "0"
  const lng = form.lng ? parseFloat(form.lng).toFixed(4) : "0"
  const isim = (form.isim || "Bilinmiyor").replace(/\|/g, " ").slice(0, 25)
  const tel = (form.telefon || "").replace(/\s/g, "")
  const tip = TIP_SECENEKLERI.find(t => t.value === form.tip)?.code || "gonullu"
  const ekipman = (form.ekipman || "").replace(/\|/g, " ").slice(0, 20)
  return `KAYIT|${tip}|${isim}|${tel}|${lat},${lng}|${ekipman}`
}

export default function KaynakForm() {
  const [mod, setMod] = useState("online") // "online" | "offline"
  const [form, setForm] = useState({
    isim: "", tip: "gonullu", ekipman: "", telefon: "", lat: "", lng: "",
  })
  const [loading, setLoading] = useState(false)
  const [sonuc, setSonuc] = useState(null)
  const [hata, setHata] = useState(null)
  const [gpsYukleniyor, setGpsY] = useState(false)
  const [kopya, setKopya] = useState(false)

  const smsKodu = kayitSmsCodu(form)
  const cevrimici = navigator.onLine

  const konumAl = () => {
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
          err.code === 1 ? "Konum izni reddedildi. Ayarlardan izin verin." :
          err.code === 2 ? "GPS sinyali alınamadı." : "Konum zaman aşımına uğradı."
        )
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    )
  }

  const gonder = async (e) => {
    e.preventDefault()
    if (!form.isim.trim()) { setHata("Adınızı girin."); return }
    setLoading(true); setHata(null)
    try {
      const body = { ...form }
      if (!body.lat || body.lat === "") delete body.lat
      if (!body.lng || body.lng === "") delete body.lng
      const data = await postKaynak(body)
      setSonuc(data)
    } catch (err) {
      setHata(err.response?.data?.detail || "Bağlantı hatası. İnternet bağlantınızı kontrol edin.")
    } finally { setLoading(false) }
  }

  // ── BAŞARI EKRANI ─────────────────────────────────────────────────────────
  if (sonuc) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <div className="bg-gray-900 border border-green-700 rounded-2xl p-6 text-center">
          <div className="text-5xl mb-3">✅</div>
          <h2 className="text-xl font-bold text-white">Kaydınız alındı!</h2>
          <p className="text-gray-400 text-sm mt-1">{sonuc.isim} — {sonuc.tip?.replace("_", " ")}</p>
          <p className="text-gray-500 text-xs mt-2">
            Koordinasyon merkezi sizi görevlendirdiğinde{" "}
            {sonuc.telefon
              ? <span className="text-blue-400">aranacaksınız.</span>
              : <span>aranacaksınız.</span>}
          </p>
        </div>

        {/* Yedek SMS kodu */}
        <div className="bg-orange-950 border border-orange-700 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-orange-200">
            📡 İnternet kesilirse SMS ile gönderin
          </p>
          <p className="text-xs text-gray-400">
            Aşağıdaki kodu kopyalayıp <strong className="text-white">+1 (978) 754-6496</strong> numarasına
            SMS ile gönderin. Koordinasyon merkezi sizi sisteme ekler.
          </p>
          <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs text-green-400 break-all select-all">
            {kayitSmsCodu({ ...form, isim: sonuc.isim, tip: sonuc.tip, telefon: sonuc.telefon || form.telefon })}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(smsKodu)
              setKopya(true)
              setTimeout(() => setKopya(false), 2500)
            }}
            className={`w-full py-2.5 rounded-xl text-sm font-bold transition
              ${kopya ? "bg-green-700 text-white" : "bg-orange-700 hover:bg-orange-600 text-white"}`}
          >
            {kopya ? "✅ Kopyalandı!" : "📋 SMS Kodunu Kopyala"}
          </button>
        </div>

        <button
          onClick={() => { setSonuc(null); setForm({ isim: "", tip: "gonullu", ekipman: "", telefon: "", lat: "", lng: "" }) }}
          className="w-full bg-gray-800 hover:bg-gray-700 py-3 rounded-xl text-sm font-semibold transition"
        >
          Yeni kayıt
        </button>
      </div>
    )
  }

  // ── FORM ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Başlık */}
      <div>
        <h1 className="text-2xl font-bold">👤 Görevli Kaydı</h1>
        <p className="text-gray-400 text-sm mt-1">
          Yardım etmeye hazırsanız bilgilerinizi girin. Koordinasyon merkezi sizi en uygun enkaza yönlendirecek.
        </p>
      </div>

      {/* Mod seçimi */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-1 flex gap-1">
        <button
          onClick={() => setMod("online")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition
            ${mod === "online" ? "bg-green-700 text-white" : "text-gray-400 hover:text-white"}`}
        >
          🌐 <span>İnternetli Kayıt</span>
        </button>
        <button
          onClick={() => setMod("offline")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition
            ${mod === "offline" ? "bg-orange-700 text-white" : "text-gray-400 hover:text-white"}`}
        >
          📡 <span>SMS ile Kayıt</span>
        </button>
      </div>

      {/* Bağlantı uyarısı */}
      {!cevrimici && mod === "online" && (
        <div className="bg-yellow-950 border border-yellow-700 rounded-xl p-3 text-sm text-yellow-300 flex items-center gap-2">
          ⚠️ İnternet bağlantısı yok. SMS moduna geçin.
        </div>
      )}

      {/* ── SMS MODU ─────────────────────────────────────────────────────── */}
      {mod === "offline" ? (
        <div className="space-y-4">
          <div className="bg-orange-950/50 border border-orange-700 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📡</span>
              <div>
                <p className="font-semibold text-orange-200">İnternetsiz Kayıt — SMS Yöntemi</p>
                <p className="text-xs text-gray-400 mt-1">
                  Formu doldurun, SMS kodunu kopyalayın ve{" "}
                  <strong className="text-white">+1 (978) 754-6496</strong>'ya gönderin.
                  Koordinasyon merkezi sizi sisteme ekleyecek.
                </p>
              </div>
            </div>
          </div>

          {/* Form alanları (SMS kodu için) */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-1.5">Adınız Soyadınız *</label>
              <input
                type="text" placeholder="Mehmet Yılmaz"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500"
                value={form.isim} onChange={e => setForm(f => ({ ...f, isim: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">Ne yapabilirsiniz? *</label>
              <div className="grid grid-cols-2 gap-2">
                {TIP_SECENEKLERI.map(({ value, label }) => (
                  <button key={value} type="button" onClick={() => setForm(f => ({ ...f, tip: value }))}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left border transition
                      ${form.tip === value ? "bg-orange-900/50 border-orange-600 text-white" : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500"}`}>
                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${form.tip === value ? "bg-orange-500 border-orange-500" : "border-gray-500"}`} />
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-1.5">Telefon *</label>
              <input
                type="tel" placeholder="0532 000 0000"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500"
                value={form.telefon} onChange={e => setForm(f => ({ ...f, telefon: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-1.5">Ekipman / Araç</label>
              <input
                type="text" placeholder="Kamyon, sedye, vinç..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500"
                value={form.ekipman} onChange={e => setForm(f => ({ ...f, ekipman: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-1.5">📍 GPS Konumunuz</label>
              <div className="flex gap-2">
                <input type="number" step="any" placeholder="Enlem"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  value={form.lat} onChange={e => setForm(f => ({ ...f, lat: e.target.value }))} />
                <input type="number" step="any" placeholder="Boylam"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  value={form.lng} onChange={e => setForm(f => ({ ...f, lng: e.target.value }))} />
                <button type="button" onClick={konumAl} disabled={gpsYukleniyor}
                  className="bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 px-3 rounded-xl text-sm font-semibold transition">
                  {gpsYukleniyor ? "⏳" : "📍"}
                </button>
              </div>
              {form.lat && form.lng && (
                <p className="text-xs text-green-400 mt-1">✅ Konum alındı</p>
              )}
            </div>
          </div>

          {/* SMS kodu önizleme */}
          {form.isim && (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
              <p className="text-xs text-gray-400 font-semibold">Oluşan SMS kodu:</p>
              <div className="font-mono text-xs text-green-400 break-all select-all bg-gray-800 rounded-lg p-3">
                {smsKodu}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(smsKodu)
                  setKopya(true)
                  setTimeout(() => setKopya(false), 2500)
                }}
                className={`w-full py-3 rounded-xl text-sm font-bold transition
                  ${kopya ? "bg-green-700 text-white" : "bg-orange-700 hover:bg-orange-600 text-white"}`}
              >
                {kopya ? "✅ Kopyalandı! Şimdi SMS gönderin." : "📋 Kodu Kopyala"}
              </button>
              <a
                href={`sms:+19787546496&body=${encodeURIComponent(smsKodu)}`}
                className="block w-full py-3 rounded-xl text-sm font-bold text-center bg-gray-700 hover:bg-gray-600 transition"
              >
                📱 SMS Uygulamasını Doğrudan Aç
              </a>
            </div>
          )}

          {!form.isim && (
            <p className="text-center text-gray-600 text-sm py-4">
              Yukarıdaki alanları doldurunca SMS kodu oluşacak.
            </p>
          )}
        </div>
      ) : (
        // ── ONLINE FORM ────────────────────────────────────────────────────
        <form onSubmit={gonder} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-1.5">Adınız Soyadınız *</label>
            <input
              required type="text" placeholder="Mehmet Yılmaz"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500"
              value={form.isim} onChange={e => setForm(f => ({ ...f, isim: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-2">Ne yapabilirsiniz? *</label>
            <div className="grid grid-cols-2 gap-2">
              {TIP_SECENEKLERI.map(({ value, label }) => (
                <button key={value} type="button" onClick={() => setForm(f => ({ ...f, tip: value }))}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left border transition
                    ${form.tip === value ? "bg-green-900/50 border-green-600 text-white" : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500"}`}>
                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${form.tip === value ? "bg-green-500 border-green-500" : "border-gray-500"}`} />
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-1.5">Ekipman / Araç</label>
            <input
              type="text" placeholder="Kamyon, sedye, ilaç çantası..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500"
              value={form.ekipman} onChange={e => setForm(f => ({ ...f, ekipman: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-1.5">
              📞 Telefon{" "}
              <span className="text-gray-500 font-normal text-xs">(görev atanınca SMS gelir)</span>
            </label>
            <input
              type="tel" placeholder="0532 000 0000"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500"
              value={form.telefon} onChange={e => setForm(f => ({ ...f, telefon: e.target.value }))}
            />
            <p className="text-xs text-gray-500 mt-1">
              ⚡ Operatör size görev atadığında bu numaraya otomatik SMS gönderilir.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-1.5">📍 GPS Konumunuz</label>
            <div className="flex gap-2">
              <input type="number" step="any" placeholder="Enlem"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                value={form.lat} onChange={e => setForm(f => ({ ...f, lat: e.target.value }))} />
              <input type="number" step="any" placeholder="Boylam"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                value={form.lng} onChange={e => setForm(f => ({ ...f, lng: e.target.value }))} />
              <button type="button" onClick={konumAl} disabled={gpsYukleniyor}
                className="bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 px-3 rounded-xl text-sm font-semibold transition whitespace-nowrap">
                {gpsYukleniyor ? "⏳" : "📍 Al"}
              </button>
            </div>
            {form.lat && form.lng && (
              <p className="text-xs text-green-400 mt-1.5">✅ Konum alındı: {parseFloat(form.lat).toFixed(5)}, {parseFloat(form.lng).toFixed(5)}</p>
            )}
          </div>

          {hata && (
            <div className="bg-red-950 border border-red-700 rounded-xl p-3 text-sm text-red-300">
              ❌ {hata}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-green-700 hover:bg-green-600 disabled:bg-gray-700 py-4 rounded-xl font-bold text-base transition">
            {loading ? "⏳ Kaydediliyor..." : "✅ Sisteme Kayıt Ol"}
          </button>

          <p className="text-center text-xs text-gray-600">
            İnternetiniz kesilirse SMS moduna geçip tekrar gönderebilirsiniz.
          </p>
        </form>
      )}
    </div>
  )
}
