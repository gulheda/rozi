import { useEffect, useState, useCallback, useRef } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { getIhbarlar, updateIhbarDurum, getEslestir, atamaYap, api } from "../api"

// Renkli pin ikonları
const createIcon = (color) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  })

const icons = {
  red: createIcon("red"),
  orange: createIcon("orange"),
  green: createIcon("green"),
  grey: createIcon("grey"),
}

const pinIcon = (skor, durum) => {
  if (durum === "tamam") return icons.grey
  if (skor >= 70) return icons.red
  if (skor >= 40) return icons.orange
  return icons.green
}

const KART_RENK = (skor, durum) => {
  if (durum === "tamam") return "border-gray-600 bg-gray-900"
  if (skor >= 70) return "border-red-600 bg-red-950"
  if (skor >= 40) return "border-yellow-600 bg-yellow-950"
  return "border-green-700 bg-green-950"
}

const BADGE = (durum) => {
  if (durum === "tamam") return "bg-green-700 text-green-100"
  if (durum === "yolda") return "bg-blue-700 text-blue-100"
  return "bg-gray-700 text-gray-200"
}

function MapFlyTo({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.flyTo(center, 14, { duration: 1 })
  }, [center, map])
  return null
}

export default function OperatorPanel() {
  const [ihbarlar, setIhbarlar] = useState([])
  const [secili, setSecili] = useState(null)
  const [eslesen, setEslesen] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filtre, setFiltre] = useState("hepsi")
  const [mapCenter, setMapCenter] = useState(null)
  const [smsInput, setSmsInput] = useState("")
  const [smsDurum, setSmsDurum] = useState(null)
  const [smsPanel, setSmsPanel] = useState(false)

  const yukle = useCallback(async () => {
    const data = await getIhbarlar()
    setIhbarlar(data)
  }, [])

  useEffect(() => {
    yukle()
    const wsPort = window.location.port === "5173" ? "8000" : window.location.port
    const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:"
    const ws = new WebSocket(`${wsProto}//${window.location.hostname}${wsPort ? ":" + wsPort : ""}/ws`)
    ws.onmessage = () => yukle()
    return () => ws.close()
  }, [yukle])

  const ihbarSec = async (ihbar) => {
    setSecili(ihbar)
    setEslesen(null)
    if (ihbar.lat && ihbar.lng) setMapCenter([ihbar.lat, ihbar.lng])
    try {
      const data = await getEslestir(ihbar.id)
      setEslesen(data)
    } catch {}
  }

  const durumGuncelle = async (id, durum) => {
    await updateIhbarDurum(id, durum)
    await yukle()
    if (secili?.id === id) setSecili((p) => ({ ...p, durum }))
  }

  const smsDecode = async () => {
    if (!smsInput.trim()) return
    setSmsDurum("loading")
    try {
      const fd = new FormData()
      fd.append("sms_kodu", smsInput.trim())
      await api.post("/ihbar/sms-decode", fd)
      setSmsDurum("ok")
      setSmsInput("")
      await yukle()
      setTimeout(() => setSmsDurum(null), 3000)
    } catch (e) {
      setSmsDurum("error")
      setTimeout(() => setSmsDurum(null), 3000)
    }
  }

  const kaynakaAta = async (kaynakId) => {
    if (!secili) return
    setLoading(true)
    try {
      await atamaYap(secili.id, kaynakId)
      await yukle()
      setSecili((p) => ({ ...p, durum: "yolda" }))
      setEslesen(null)
    } catch (e) {
      alert(e.response?.data?.detail || "Atama başarısız")
    } finally {
      setLoading(false)
    }
  }

  const filtreliIhbarlar = ihbarlar.filter((i) => {
    if (filtre === "hepsi") return true
    if (filtre === "kritik") return i.oncelik_skoru >= 70 && i.durum === "bekliyor"
    return i.durum === filtre
  })

  const haritalik = ihbarlar.filter((i) => i.lat && i.lng)
  const varsayilanMerkez = haritalik.length > 0
    ? [haritalik[0].lat, haritalik[0].lng]
    : [36.2021, 36.1601]

  // İstatistikler
  const stats = {
    toplam: ihbarlar.length,
    kritik: ihbarlar.filter((i) => i.oncelik_skoru >= 70 && i.durum === "bekliyor").length,
    yolda: ihbarlar.filter((i) => i.durum === "yolda").length,
    tamam: ihbarlar.filter((i) => i.durum === "tamam").length,
    duplicate: ihbarlar.filter((i) => i.duplicate_id).length,
  }

  return (
    <div className="flex flex-col h-[calc(100vh-52px)]">
      {/* İstatistik bar */}
      <div className="relative bg-gray-900 border-b border-gray-800 px-6 py-2 flex gap-6 text-sm flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Toplam</span>
          <span className="font-bold text-white text-lg">{stats.toplam}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-gray-400">Kritik</span>
          <span className="font-bold text-red-400 text-lg">{stats.kritik}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-gray-400">Yolda</span>
          <span className="font-bold text-blue-400 -lg">{stats.yolda}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-gray-400">Çözüldü</span>
          <span className="font-bold text-green-400 text-lg">{stats.tamam}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-yellow-400">⚠️</span>
          <span className="text-gray-400">Duplicate</span>
          <span className="font-bold text-yellow-400 text-lg">{stats.duplicate}</span>
        </div>
        <div className="ml-auto flex gap-2 items-center">
          {["hepsi", "kritik", "bekliyor", "yolda", "tamam"].map((f) => (
            <button key={f} onClick={() => setFiltre(f)}
              className={`px-3 py-1 rounded-lg text-xs capitalize transition ${filtre === f ? "bg-red-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
              {f}
            </button>
          ))}
          <button onClick={() => setSmsPanel((v) => !v)}
            className={`px-3 py-1 rounded-lg text-xs border transition ${smsPanel ? "bg-orange-900 border-orange-600 text-orange-300" : "border-gray-700 text-gray-400 hover:border-orange-600 hover:text-orange-300"}`}>
            📡 SMS İhbar
          </button>
        </div>

        {/* SMS decode paneli */}
        {smsPanel && (
          <div className="absolute top-full right-0 mt-1 w-96 bg-gray-900 border border-orange-700 rounded-xl p-4 z-50 shadow-xl">
            <p className="text-xs text-orange-300 font-semibold mb-2">📡 SMS İhbar Ekle</p>
            <p className="text-xs text-gray-400 mb-3">Sahadaki kişiden gelen SMS kodunu yapıştırın:</p>
            <textarea
              rows={3}
              placeholder="EQ|RED|36.2021,36.1601|INJ:1|TRP:1|VOICE:1|GAS:0|NEED:CRANE|CNT:3|ADDR:Antakya Akdeniz"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-orange-500 mb-2"
              value={smsInput}
              onChange={(e) => setSmsInput(e.target.value)}
            />
            <button onClick={smsDecode} disabled={smsDurum === "loading"}
              className="w-full bg-orange-700 hover:bg-orange-600 disabled:bg-gray-700 py-2 rounded-lg text-xs font-semibold transition">
              {smsDurum === "loading" ? "Çözümleniyor..." : smsDurum === "ok" ? "✅ İhbar eklendi!" : smsDurum === "error" ? "❌ Hatalı kod" : "Çözümle ve Ekle"}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sol: ihbar listesi */}
        <div className="w-80 flex-shrink-0 overflow-y-auto border-r border-gray-800 bg-gray-900">
          <div className="p-3 border-b border-gray-800 text-xs text-gray-400">
            {filtreliIhbarlar.length} ihbar gösteriliyor
          </div>
          {filtreliIhbarlar.map((ihbar) => (
            <div
              key={ihbar.id}
              onClick={() => ihbarSec(ihbar)}
              className={`border-l-4 p-3 cursor-pointer hover:bg-gray-800 transition ${KART_RENK(ihbar.oncelik_skoru, ihbar.durum)} ${secili?.id === ihbar.id ? "ring-1 ring-white/20" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate text-white">{ihbar.adres}</p>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{ihbar.ozet || "—"}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xs font-bold text-red-400">#{ihbar.oncelik_skoru}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${BADGE(ihbar.durum)}`}>
                    {ihbar.durum}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mt-1">
                {ihbar.ses_var && <span className="text-xs text-green-400">🔊 Ses var</span>}
                {ihbar.duplicate_id && <span className="text-xs text-yellow-400">⚠️ Dup #{ihbar.duplicate_id}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Orta: detay paneli */}
        {secili && (
          <div className="w-72 flex-shrink-0 overflow-y-auto border-r border-gray-800 bg-gray-900 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">İhbar #{secili.id}</h3>
              <button onClick={() => setSecili(null)} className="text-gray-500 hover:text-white text-xs">✕</button>
            </div>

            <p className="text-sm text-gray-300 leading-relaxed">{secili.adres}</p>
            {secili.ozet && (
              <p className="text-xs text-gray-400 italic border-l-2 border-gray-600 pl-2">"{secili.ozet}"</p>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-800 rounded-lg p-2">
                <div className="text-gray-400 mb-1">Öncelik</div>
                <div className={`font-bold text-xl ${secili.oncelik_skoru >= 70 ? "text-red-400" : secili.oncelik_skoru >= 40 ? "text-yellow-400" : "text-green-400"}`}>
                  {secili.oncelik_skoru}
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-2">
                <div className="text-gray-400 mb-1">Güven</div>
                <div className="font-bold text-xl text-blue-400">{secili.guven_skoru}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-2">
                <div className="text-gray-400 mb-1">İhtiyaç</div>
                <div className="font-medium capitalize">{secili.ihtiyac}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-2">
                <div className="text-gray-400 mb-1">Kişi</div>
                <div className="font-medium">{secili.kisi_sayisi}</div>
              </div>
            </div>

            {secili.ses_var && (
              <div className="bg-green-950 border border-green-700 rounded-lg p-2 text-xs text-green-300 flex items-center gap-2">
                <span className="animate-pulse">🔊</span> Enkaz altında ses tespit edildi
              </div>
            )}
            {secili.duplicate_id && (
              <div className="bg-yellow-950 border border-yellow-700 rounded-lg p-2 text-xs text-yellow-300">
                ⚠️ Bu ihbar #{secili.duplicate_id} ile aynı enkaz — sistem birleştirdi
              </div>
            )}

            {/* Durum güncelle */}
            <div>
              <p className="text-xs text-gray-400 mb-2">Durum güncelle</p>
              <div className="flex gap-1.5">
                {["bekliyor", "yolda", "tamam"].map((d) => (
                  <button
                    key={d}
                    onClick={() => durumGuncelle(secili.id, d)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
                      secili.durum === d ? "bg-blue-600 text-white" : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Önerilen kaynaklar */}
            {eslesen && (
              <div>
                <p className="text-xs text-gray-400 mb-2">{eslesen.aciklama}</p>
                <div className="space-y-2">
                  {eslesen.onerilen_kaynaklar.map((k) => (
                    <div key={k.id} className="bg-gray-800 rounded-lg p-2.5 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white">{k.isim}</p>
                        <p className="text-xs text-gray-400">{k.tip}{k.ekipman ? ` · ${k.ekipman}` : ""}</p>
                        {k.telefon && <p className="text-xs text-blue-400">{k.telefon}</p>}
                      </div>
                      <button
                        onClick={() => kaynakaAta(k.id)}
                        disabled={loading}
                        className="ml-2 bg-green-700 hover:bg-green-600 disabled:bg-gray-700 text-xs px-2.5 py-1.5 rounded-lg flex-shrink-0"
                      >
                        Ata
                      </button>
                    </div>
                  ))}
                  {eslesen.onerilen_kaynaklar.length === 0 && (
                    <p className="text-xs text-gray-500">Uygun müsait kaynak bulunamadı.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Harita */}
        <div className="flex-1 relative">
          <MapContainer
            center={varsayilanMerkez}
            zoom={10}
            className="h-full w-full"
            style={{ background: "#1a1a2e" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
            {mapCenter && <MapFlyTo center={mapCenter} />}
            {haritalik.map((ihbar) => (
              <Marker
                key={ihbar.id}
                position={[ihbar.lat, ihbar.lng]}
                icon={pinIcon(ihbar.oncelik_skoru, ihbar.durum)}
                eventHandlers={{ click: () => ihbarSec(ihbar) }}
              >
                <Popup>
                  <div className="text-xs min-w-[160px]">
                    <p className="font-bold mb-1">#{ihbar.id} — Öncelik: {ihbar.oncelik_skoru}</p>
                    <p className="text-gray-600 mb-1">{ihbar.adres}</p>
                    {ihbar.ozet && <p className="italic text-gray-500">{ihbar.ozet}</p>}
                    <p className="mt-1">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-white text-xs ${
                        ihbar.durum === "tamam" ? "bg-green-600" :
                        ihbar.durum === "yolda" ? "bg-blue-600" : "bg-gray-600"
                      }`}>{ihbar.durum}</span>
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Harita lejantı */}
          <div className="absolute bottom-8 left-4 bg-gray-900/90 backdrop-blur rounded-lg p-3 text-xs space-y-1.5 z-[1000]">
            <p className="text-gray-400 font-semibold mb-2">Öncelik</p>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500" /><span>Kritik (70+)</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-500" /><span>Orta (40-70)</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500" /><span>Düşük (&lt;40)</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gray-500" /><span>Çözüldü</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
