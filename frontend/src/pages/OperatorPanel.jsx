import { useEffect, useState, useCallback } from "react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { getIhbarlar, updateIhbarDurum, getEslestir, atamaYap } from "../api"

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

const RENK = (skor) => {
  if (skor >= 70) return "border-red-600 bg-red-950"
  if (skor >= 40) return "border-yellow-600 bg-yellow-950"
  return "border-green-700 bg-green-950"
}

const BADGE = (durum) => {
  if (durum === "tamam") return "bg-green-700 text-green-100"
  if (durum === "yolda") return "bg-blue-700 text-blue-100"
  return "bg-gray-700 text-gray-200"
}

export default function OperatorPanel() {
  const [ihbarlar, setIhbarlar] = useState([])
  const [secili, setSecili] = useState(null)
  const [eslesen, setEslesen] = useState(null)
  const [loading, setLoading] = useState(false)

  const yukle = useCallback(async () => {
    const data = await getIhbarlar()
    setIhbarlar(data)
  }, [])

  useEffect(() => {
    yukle()
    // WebSocket canlı güncelleme
    const ws = new WebSocket(`ws://${window.location.hostname}:8000/ws`)
    ws.onmessage = () => yukle()
    return () => ws.close()
  }, [yukle])

  const ihbarSec = async (ihbar) => {
    setSecili(ihbar)
    setEslesen(null)
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

  const haritalik = ihbarlar.filter((i) => i.lat && i.lng)

  return (
    <div className="flex h-[calc(100vh-52px)]">
      {/* Sol: liste */}
      <div className="w-96 flex-shrink-0 overflow-y-auto border-r border-gray-800 bg-gray-900">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="font-bold">İhbarlar ({ihbarlar.length})</h2>
          <button onClick={yukle} className="text-xs text-gray-400 hover:text-white">Yenile</button>
        </div>

        {ihbarlar.map((ihbar) => (
          <div
            key={ihbar.id}
            onClick={() => ihbarSec(ihbar)}
            className={`border-l-4 p-4 cursor-pointer hover:bg-gray-800 transition ${RENK(ihbar.oncelik_skoru)} ${secili?.id === ihbar.id ? "bg-gray-800" : ""}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ihbar.adres}</p>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{ihbar.ozet || "—"}</p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-xs font-bold text-red-400">#{ihbar.oncelik_skoru}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${BADGE(ihbar.durum)}`}>
                  {ihbar.durum}
                </span>
              </div>
            </div>
            {ihbar.duplicate_id && (
              <p className="text-xs text-yellow-400 mt-1">⚠️ Duplicate #{ihbar.duplicate_id}</p>
            )}
          </div>
        ))}
      </div>

      {/* Orta: detay */}
      {secili && (
        <div className="w-80 flex-shrink-0 overflow-y-auto border-r border-gray-800 bg-gray-900 p-4 space-y-4">
          <h3 className="font-bold text-sm">#{secili.id} — Detay</h3>
          <p className="text-sm text-gray-300">{secili.adres}</p>
          {secili.ozet && <p className="text-sm text-gray-400 italic">"{secili.ozet}"</p>}

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-800 rounded p-2">
              <div className="text-gray-400">Öncelik</div>
              <div className="font-bold text-red-400 text-lg">{secili.oncelik_skoru}</div>
            </div>
            <div className="bg-gray-800 rounded p-2">
              <div className="text-gray-400">Güven</div>
              <div className="font-bold text-yellow-400 text-lg">{secili.guven_skoru}</div>
            </div>
            <div className="bg-gray-800 rounded p-2">
              <div className="text-gray-400">İhtiyaç</div>
              <div className="font-medium">{secili.ihtiyac}</div>
            </div>
            <div className="bg-gray-800 rounded p-2">
              <div className="text-gray-400">Kişi</div>
              <div className="font-medium">{secili.kisi_sayisi}</div>
            </div>
          </div>

          {/* Durum güncelle */}
          <div className="flex gap-2">
            {["bekliyor", "yolda", "tamam"].map((d) => (
              <button
                key={d}
                onClick={() => durumGuncelle(secili.id, d)}
                className={`flex-1 py-1.5 rounded text-xs font-medium transition ${
                  secili.durum === d ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Önerilen kaynaklar */}
          {eslesen && (
            <div>
              <p className="text-xs text-gray-400 mb-2">{eslesen.aciklama}</p>
              <div className="space-y-2">
                {eslesen.onerilen_kaynaklar.map((k) => (
                  <div key={k.id} className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{k.isim}</p>
                      <p className="text-xs text-gray-400">{k.tip} {k.ekipman ? `· ${k.ekipman}` : ""}</p>
                    </div>
                    <button
                      onClick={() => kaynakaAta(k.id)}
                      disabled={loading}
                      className="bg-green-700 hover:bg-green-600 disabled:bg-gray-700 text-xs px-3 py-1.5 rounded-lg"
                    >
                      Ata
                    </button>
                  </div>
                ))}
                {eslesen.onerilen_kaynaklar.length === 0 && (
                  <p className="text-xs text-gray-500">Uygun kaynak bulunamadı.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sağ: harita */}
      <div className="flex-1">
        {haritalik.length > 0 ? (
          <MapContainer
            center={[haritalik[0].lat, haritalik[0].lng]}
            zoom={12}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {haritalik.map((ihbar) => (
              <Marker key={ihbar.id} position={[ihbar.lat, ihbar.lng]}>
                <Popup>
                  <div className="text-sm">
                    <b>#{ihbar.id}</b> — Öncelik: {ihbar.oncelik_skoru}<br />
                    {ihbar.adres}<br />
                    <span className="text-gray-500">{ihbar.durum}</span>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-600">
            <div className="text-center">
              <div className="text-4xl mb-2">🗺️</div>
              <p>Koordinatlı ihbar olmadığında harita boş kalır</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
