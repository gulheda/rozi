import { useEffect, useState, useCallback } from "react"
import { createPortal } from "react-dom"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { getIhbarlar, updateIhbarDurum, getEslestir, atamaYap, getKaynaklar, updateKaynakMusait, getBrifing, api, WS_URL } from "../api"
import OperatorGiris from "./OperatorGiris"

// ─── Leaflet ikonları ─────────────────────────────────────────────────────────
const mkIcon = (c) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${c}.png`,
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
})
const ICONS = { red: mkIcon("red"), orange: mkIcon("orange"), green: mkIcon("green"), grey: mkIcon("grey") }
const pinIcon = (s, d) => d === "tamam" ? ICONS.grey : s >= 70 ? ICONS.red : s >= 40 ? ICONS.orange : ICONS.green

const KART_SINIF = (s, d) => {
  if (d === "tamam") return "border-gray-600 bg-gray-900/60"
  if (s >= 70) return "border-red-600 bg-red-950/40"
  if (s >= 40) return "border-yellow-600 bg-yellow-950/40"
  return "border-green-700 bg-green-950/40"
}
const BADGE = (d) =>
  d === "tamam" ? "bg-green-800 text-green-100" :
  d === "yolda"  ? "bg-blue-800 text-blue-100" : "bg-gray-700 text-gray-200"

const TIP_ICON = {
  vinc: "🏗️", ambulans: "🚑", arama_kurtarma: "🔍", itfaiye: "🚒",
  tirci: "🚛", gonullu: "🤝", kepce: "⚙️", ilac: "💊",
}

function MapFlyTo({ center }) {
  const map = useMap()
  useEffect(() => { if (center) map.flyTo(center, 14, { duration: 1 }) }, [center, map])
  return null
}

// ─── Kaynaklar sekmesi ────────────────────────────────────────────────────────
function KaynakListesi({ onGuncelle, refreshKey }) {
  const [kaynaklar, setKaynaklar] = useState([])
  const [filtre, setFiltre] = useState("hepsi")
  const [yukleniyor, setY] = useState(false)
  const [sonYenileme, setSonYenileme] = useState(null)

  const yukle = useCallback(async () => {
    try {
      setKaynaklar(await getKaynaklar())
      setSonYenileme(new Date())
    } catch {}
  }, [])

  // İlk yükleme + WebSocket tetiklemesi (refreshKey değişince)
  useEffect(() => { yukle() }, [yukle, refreshKey])

  const toggle = async (k) => {
    setY(true)
    try { await updateKaynakMusait(k.id, !k.musait); await yukle(); onGuncelle?.() }
    catch (e) { alert("Güncellenemedi: " + (e?.response?.data?.detail || e.message)) }
    finally { setY(false) }
  }

  const listele = kaynaklar.filter(k =>
    filtre === "musait" ? k.musait : filtre === "gorevde" ? !k.musait : true
  )
  const musait = kaynaklar.filter(k => k.musait).length
  const gorevde = kaynaklar.filter(k => !k.musait).length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Özet bar */}
      <div className="px-4 py-2.5 border-b border-gray-800 bg-gray-900 flex gap-4 flex-wrap items-center flex-shrink-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-gray-400">Müsait</span>
          <span className="font-bold text-green-400">{musait}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <span className="text-gray-400">Görevde</span>
          <span className="font-bold text-red-400">{gorevde}</span>
        </div>
        <div className="ml-auto flex gap-1.5 flex-wrap items-center">
          {sonYenileme && (
            <span className="text-[10px] text-gray-600 hidden sm:block">
              Son: {sonYenileme.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          {[["hepsi","Hepsi"],["musait","✅ Müsait"],["gorevde","🔴 Görevde"]].map(([v,l]) => (
            <button key={v} onClick={() => setFiltre(v)}
              className={`px-2.5 py-1 rounded-lg text-xs transition ${filtre === v ? "bg-blue-700 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
              {l}
            </button>
          ))}
          <button onClick={yukle} className="px-2.5 py-1 rounded-lg text-xs bg-gray-800 text-gray-400 hover:bg-gray-700 transition" title="Yenile">
            🔄
          </button>
        </div>
      </div>

      {/* SMS ile kayıt gelince bilgi bandı */}
      <div className="px-4 py-2 bg-blue-950/40 border-b border-blue-900/50 text-xs text-blue-300 flex items-center gap-2 flex-shrink-0">
        <span className="animate-pulse">📡</span>
        <span>
          SMS ile kayıt: Görevli <strong>KAYIT|tip|isim|tel|lat,lng</strong> gönderirse buraya otomatik düşer.
          Atama yapınca görevliye <strong>otomatik SMS</strong> gider.
        </span>
      </div>

      {/* Kart grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {listele.length === 0 && (
            <div className="col-span-full text-center text-gray-600 text-sm py-12">
              Bu filtrede kaynak bulunamadı.
            </div>
          )}
          {listele.map(k => (
            <div key={k.id}
              className={`rounded-xl border p-4 flex flex-col gap-3 ${k.musait ? "border-green-800 bg-green-950/20" : "border-red-900 bg-red-950/20"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{TIP_ICON[k.tip] || "👤"}</span>
                  <div>
                    <p className="font-semibold text-white text-sm leading-tight">{k.isim}</p>
                    <p className="text-xs text-gray-400 capitalize">{k.tip?.replace("_", " ")}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold flex-shrink-0
                  ${k.musait ? "bg-green-800 text-green-100" : "bg-red-800 text-red-100"}`}>
                  {k.musait ? "✅ Müsait" : "🔴 Görevde"}
                </span>
              </div>
              {k.ekipman && <p className="text-xs text-gray-400">🔧 {k.ekipman}</p>}
              {k.telefon && (
                <a href={`tel:${k.telefon}`} className="text-xs text-blue-400 hover:text-blue-300">
                  📞 {k.telefon}
                </a>
              )}
              <button onClick={() => toggle(k)} disabled={yukleniyor}
                className={`w-full py-2 rounded-lg text-xs font-semibold transition disabled:opacity-50
                  ${k.musait ? "bg-red-900 hover:bg-red-800 text-red-100" : "bg-green-900 hover:bg-green-800 text-green-100"}`}>
                {k.musait ? "🔴 Göreve Al" : "✅ Serbest Bırak"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Panel içeriği (giriş yapmış kullanıcı) ──────────────────────────────────
function PanelIci() {
  const [sekme, setSekme] = useState("ihbarlar")
  const [ihbarlar, setIhbarlar] = useState([])
  const [secili, setSecili] = useState(null)
  const [eslesen, setEslesen] = useState(null)
  const [detayAcik, setDetayAcik] = useState(false)
  const [loading, setLoading] = useState(false)
  const [atamaMsg, setAtamaMsg] = useState(null)
  const [filtre, setFiltre] = useState("hepsi")
  const [mapCenter, setMapCenter] = useState(null)
  const [smsInput, setSmsInput] = useState("")
  const [smsDurum, setSmsDurum] = useState(null)
  const [smsPanel, setSmsPanel] = useState(false)
  // WebSocket'ten gelen her mesajda bu artar → KaynakListesi yenilenir
  const [kaynaklarKey, setKaynaklarKey] = useState(0)
  const [brifingAcik, setBrifingAcik] = useState(false)
  const [brifingMetin, setBrifingMetin] = useState("")
  const [brifingYukleniyor, setBrifingYukleniyor] = useState(false)

  const yukle = useCallback(async () => {
    try { setIhbarlar(await getIhbarlar()) } catch {}
  }, [])

  useEffect(() => {
    yukle()
    const ws = new WebSocket(WS_URL)
    ws.onmessage = (evt) => {
      // Her WS mesajında hem ihbarları hem kaynakları yenile
      yukle()
      setKaynaklarKey(k => k + 1)
      // Yeni kaynak gelince kaynaklar sekmesine geç (opsiyonel bildirim)
      try {
        const msg = JSON.parse(evt.data)
        if (msg.tip === "yeni_kaynak") {
          // Kullanıcı ihbarlardaysa geçme, sadece badge göster gibi bir şey eklenebilir
          console.log("[WS] Yeni kaynak:", msg.isim)
        }
      } catch {}
    }
    return () => ws.close()
  }, [yukle])

  const ihbarSec = async (ihbar) => {
    setSecili(ihbar)
    setEslesen(null)
    setAtamaMsg(null)
    setDetayAcik(true)
    if (ihbar.lat && ihbar.lng) setMapCenter([ihbar.lat, ihbar.lng])
    try { setEslesen(await getEslestir(ihbar.id)) } catch {}
  }

  const durumGuncelle = async (id, durum) => {
    await updateIhbarDurum(id, durum)
    await yukle()
    if (secili?.id === id) setSecili(p => ({ ...p, durum }))
  }

  const smsDecode = async () => {
    if (!smsInput.trim()) return
    setSmsDurum("loading")
    const kod = smsInput.trim()
    try {
      const fd = new FormData()
      fd.append("sms_kodu", kod)
      // EQ|... → ihbar, KAYIT|... → kaynak
      if (kod.toUpperCase().startsWith("KAYIT")) {
        await api.post("/kaynak/sms-decode", fd)
        setSmsDurum("ok_kaynak")
      } else {
        await api.post("/ihbar/sms-decode", fd)
        setSmsDurum("ok_ihbar")
      }
      setSmsInput("")
      await yukle()
      setTimeout(() => setSmsDurum(null), 3500)
    } catch {
      setSmsDurum("error")
      setTimeout(() => setSmsDurum(null), 3000)
    }
  }

  const kaynakaAta = async (kaynakId, kaynakTelefon) => {
    if (!secili) return
    setLoading(true)
    setAtamaMsg(null)
    try {
      await atamaYap(secili.id, kaynakId)
      await yukle()
      setSecili(p => ({ ...p, durum: "yolda" }))
      setEslesen(null)
      // Telefon varsa SMS gönderildi, yoksa gösterilmedi
      setAtamaMsg(kaynakTelefon ? "sms_gonderildi" : "sms_yok")
      setTimeout(() => setAtamaMsg(null), 6000)
    } catch (e) {
      setAtamaMsg("hata")
      setTimeout(() => setAtamaMsg(null), 4000)
    } finally { setLoading(false) }
  }

  const cikis = () => { sessionStorage.removeItem("operator_giris"); window.location.reload() }

  const brifingAl = async () => {
    setBrifingAcik(true)
    setBrifingYukleniyor(true)
    setBrifingMetin("")
    try {
      const data = await getBrifing()
      setBrifingMetin(data.brifing)
    } catch {
      setBrifingMetin("⚠️ Brifing alınamadı. Backend bağlantısını kontrol edin.")
    } finally {
      setBrifingYukleniyor(false)
    }
  }

  const filtreli = ihbarlar.filter(i =>
    filtre === "hepsi" ? true :
    filtre === "kritik" ? i.oncelik_skoru >= 70 && i.durum === "bekliyor" :
    i.durum === filtre
  )
  const haritalik = ihbarlar.filter(i => i.lat && i.lng)
  const merkez = haritalik.length > 0 ? [haritalik[0].lat, haritalik[0].lng] : [36.2021, 36.1601]
  const stats = {
    toplam: ihbarlar.length,
    kritik: ihbarlar.filter(i => i.oncelik_skoru >= 70 && i.durum === "bekliyor").length,
    yolda: ihbarlar.filter(i => i.durum === "yolda").length,
    tamam: ihbarlar.filter(i => i.durum === "tamam").length,
  }

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 56px)" }}>

      {/* ── AI Brifing Modal (portal → body'e render, z-index sorunu yok) ── */}
      {brifingAcik && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/75"
          style={{ zIndex: 99999 }}
          onClick={(e) => { if (e.target === e.currentTarget) setBrifingAcik(false) }}>
          <div className="bg-gray-900 border border-purple-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col"
            style={{ maxHeight: "80vh" }}>

            {/* Başlık */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">🤖</span>
                <div>
                  <p className="font-bold text-white text-sm">AI Durum Brifing</p>
                  <p className="text-xs text-gray-500">GPT-4o · Tüm aktif ihbarlar analiz edildi</p>
                </div>
              </div>
              <button onClick={() => setBrifingAcik(false)} className="text-gray-500 hover:text-white text-xl leading-none">✕</button>
            </div>

            {/* İçerik */}
            <div className="p-5 flex-1 overflow-y-auto">
              {brifingYukleniyor ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-gray-400">
                  <span className="text-4xl animate-spin inline-block">⚙️</span>
                  <p className="text-sm">GPT-4o sahayı analiz ediyor...</p>
                </div>
              ) : (
                <p className="text-sm text-gray-200 leading-7 whitespace-pre-line">{brifingMetin}</p>
              )}
            </div>

            {/* Alt butonlar */}
            <div className="px-5 py-3 border-t border-gray-800 flex gap-2 justify-end flex-shrink-0">
              <button onClick={brifingAl}
                className="px-4 py-2 rounded-lg text-xs bg-purple-800 hover:bg-purple-700 text-white transition">
                🔄 Yenile
              </button>
              <button onClick={() => setBrifingAcik(false)}
                className="px-4 py-2 rounded-lg text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 transition">
                Kapat
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Üst bar ──────────────────────────────────────────────────────── */}
      <div className="bg-gray-900 border-b border-gray-800 px-3 py-2 flex flex-wrap gap-2 items-center flex-shrink-0 relative">
        {/* Sekmeler */}
        <div className="flex gap-0.5 border border-gray-700 rounded-lg p-0.5">
          <button onClick={() => setSekme("ihbarlar")}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition
              ${sekme === "ihbarlar" ? "bg-red-700 text-white" : "text-gray-400 hover:text-white"}`}>
            🆘 İhbarlar
          </button>
          <button onClick={() => setSekme("kaynaklar")}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition
              ${sekme === "kaynaklar" ? "bg-blue-700 text-white" : "text-gray-400 hover:text-white"}`}>
            👥 Kaynaklar
          </button>
        </div>

        {/* İstatistikler */}
        {sekme === "ihbarlar" && (
          <div className="flex gap-3 text-xs flex-wrap">
            <span className="text-gray-400">Toplam: <b className="text-white">{stats.toplam}</b></span>
            <span className="text-red-400">🔴 <b>{stats.kritik}</b> kritik</span>
            <span className="text-blue-400">🔵 <b>{stats.yolda}</b> yolda</span>
            <span className="text-green-400">🟢 <b>{stats.tamam}</b> bitti</span>
          </div>
        )}

        {/* Sağ: filtreler + SMS + çıkış */}
        <div className="ml-auto flex gap-1.5 flex-wrap items-center">
          {sekme === "ihbarlar" && ["hepsi","kritik","bekliyor","yolda","tamam"].map(f => (
            <button key={f} onClick={() => setFiltre(f)}
              className={`px-2 py-1 rounded-lg text-xs capitalize transition
                ${filtre === f ? "bg-red-700 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
              {f}
            </button>
          ))}
          <button onClick={() => setSmsPanel(v => !v)}
            className={`px-2.5 py-1 rounded-lg text-xs border transition
              ${smsPanel ? "bg-orange-900 border-orange-600 text-orange-300" : "border-gray-700 text-gray-400 hover:text-orange-300 hover:border-orange-700"}`}>
            📡 SMS
          </button>
          <button onClick={brifingAl}
            className="px-2.5 py-1 rounded-lg text-xs border border-purple-700 text-purple-300 hover:bg-purple-900/40 transition flex items-center gap-1">
            🤖 Brifing
          </button>
          <button onClick={cikis}
            className="px-2.5 py-1 rounded-lg text-xs border border-gray-700 text-gray-500 hover:text-red-400 hover:border-red-800 transition">
            🔒 Çıkış
          </button>
        </div>

        {/* SMS decode paneli */}
        {smsPanel && (
          <div className="absolute top-full right-0 mt-1 w-80 sm:w-96 bg-gray-900 border border-orange-700 rounded-xl p-4 z-50 shadow-2xl">
            <p className="text-xs text-orange-300 font-semibold mb-1">📡 SMS İhbar / Kayıt Ekle</p>
            <p className="text-xs text-gray-400 mb-3">
              <b className="text-white">EQ|RED|...</b> → enkaz ihbarı<br />
              <b className="text-white">KAYIT|tip|isim|tel|...</b> → görevli kaydı
            </p>
            <textarea rows={3}
              placeholder="EQ|RED|36.20,36.16|INJ:1|VOICE:1|GAS:0|NEED:CRANE|CNT:3|ADDR:Antakya"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-orange-500 mb-2"
              value={smsInput} onChange={e => setSmsInput(e.target.value)} />
            <button onClick={smsDecode} disabled={smsDurum === "loading"}
              className="w-full bg-orange-700 hover:bg-orange-600 disabled:bg-gray-700 py-2 rounded-lg text-xs font-semibold transition">
              {smsDurum === "loading"   ? "Çözümleniyor..." :
               smsDurum === "ok_ihbar" ? "✅ İhbar eklendi!" :
               smsDurum === "ok_kaynak"? "✅ Görevli eklendi!" :
               smsDurum === "error"    ? "❌ Hatalı kod" : "Çözümle ve Ekle"}
            </button>
          </div>
        )}
      </div>

      {/* ── Sekme içerikleri ──────────────────────────────────────────────── */}
      {sekme === "kaynaklar" ? (
        <KaynakListesi onGuncelle={yukle} refreshKey={kaynaklarKey} />
      ) : (
        <div className="flex flex-1 overflow-hidden relative">

          {/* Sol: ihbar listesi ───────────────────────────────────────────── */}
          <div className={`flex-shrink-0 overflow-y-auto border-r border-gray-800 bg-gray-900
            ${detayAcik ? "hidden md:flex md:flex-col md:w-64 lg:w-72" : "w-full md:w-64 lg:w-72 flex flex-col"}`}>
            <div className="px-3 py-2 border-b border-gray-800 text-xs text-gray-500 flex-shrink-0">
              {filtreli.length} ihbar
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtreli.map(ihbar => (
                <div key={ihbar.id} onClick={() => ihbarSec(ihbar)}
                  className={`border-l-4 p-3 cursor-pointer hover:bg-gray-800 transition
                    ${KART_SINIF(ihbar.oncelik_skoru, ihbar.durum)}
                    ${secili?.id === ihbar.id ? "ring-1 ring-inset ring-white/10" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate text-white">{ihbar.adres}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{ihbar.ozet || "—"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-xs font-bold text-red-400">#{ihbar.oncelik_skoru}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${BADGE(ihbar.durum)}`}>{ihbar.durum}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {ihbar.ses_var && <span className="text-[10px] text-green-400">🔊 Ses var</span>}
                    {ihbar.duplicate_id && <span className="text-[10px] text-yellow-400">⚠️ Dup</span>}
                  </div>
                </div>
              ))}
              {filtreli.length === 0 && (
                <p className="text-center text-gray-600 text-xs py-8">Bu filtrede ihbar yok.</p>
              )}
            </div>
          </div>

          {/* Orta: detay ──────────────────────────────────────────────────── */}
          {secili && (
            <div className={`bg-gray-900 border-r border-gray-800 overflow-y-auto
              ${detayAcik
                ? "absolute inset-0 z-10 md:static md:z-auto md:w-64 lg:w-72 md:flex-shrink-0 flex flex-col"
                : "hidden"}`}>
              {/* Geri butonu (mobil) */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 flex-shrink-0">
                <button onClick={() => setDetayAcik(false)}
                  className="md:hidden text-gray-400 hover:text-white text-sm flex items-center gap-1">
                  ← Geri
                </button>
                <h3 className="font-bold text-sm flex-1">İhbar #{secili.id}</h3>
                <button onClick={() => { setSecili(null); setDetayAcik(false) }}
                  className="text-gray-500 hover:text-white text-xs">✕</button>
              </div>

              <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                <p className="text-sm text-gray-200 leading-relaxed">{secili.adres}</p>
                {secili.ozet && (
                  <p className="text-xs text-gray-400 italic border-l-2 border-gray-600 pl-2">"{secili.ozet}"</p>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ["Öncelik", secili.oncelik_skoru,
                      secili.oncelik_skoru >= 70 ? "text-red-400" : secili.oncelik_skoru >= 40 ? "text-yellow-400" : "text-green-400"],
                    ["Güven", secili.guven_skoru, "text-blue-400"],
                  ].map(([lbl, val, cls]) => (
                    <div key={lbl} className="bg-gray-800 rounded-lg p-2">
                      <div className="text-gray-400 mb-1">{lbl}</div>
                      <div className={`font-bold text-xl ${cls}`}>{val}</div>
                    </div>
                  ))}
                  <div className="bg-gray-800 rounded-lg p-2">
                    <div className="text-gray-400 mb-1 text-xs">İhtiyaç</div>
                    <div className="text-xs font-medium leading-tight">{secili.ihtiyac?.replace(/,/g, ", ")}</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-2">
                    <div className="text-gray-400 mb-1 text-xs">Kişi</div>
                    <div className="font-medium text-sm">{secili.kisi_sayisi}</div>
                  </div>
                </div>

                {secili.ses_var && (
                  <div className="bg-green-950 border border-green-700 rounded-lg p-2 text-xs text-green-300 flex gap-2">
                    <span className="animate-pulse">🔊</span> Enkaz altında ses tespit edildi
                  </div>
                )}
                {secili.duplicate_id && (
                  <div className="bg-yellow-950 border border-yellow-700 rounded-lg p-2 text-xs text-yellow-300">
                    ⚠️ #{secili.duplicate_id} ile aynı enkaz — birleştirildi
                  </div>
                )}

                {/* Atama mesajı */}
                {atamaMsg && (
                  <div className={`rounded-lg p-3 text-xs border
                    ${atamaMsg === "sms_gonderildi" ? "bg-green-950 border-green-700 text-green-200" :
                      atamaMsg === "sms_yok" ? "bg-blue-950 border-blue-800 text-blue-200" :
                      "bg-red-950 border-red-800 text-red-200"}`}>
                    {atamaMsg === "sms_gonderildi" && (
                      <>✅ <strong>Görevli atandı!</strong> Enkaz adresi ve GPS ile birlikte telefona otomatik SMS gönderildi. Görevli internetsiz olsa bile bilgilendi.</>
                    )}
                    {atamaMsg === "sms_yok" && (
                      <>✅ <strong>Görevli atandı.</strong> Ancak telefon numarası kayıtlı değil — SMS gönderilemedi. Telsiz veya başka yöntemle ulaşın.</>
                    )}
                    {atamaMsg === "hata" && "❌ Atama başarısız. Tekrar deneyin."}
                  </div>
                )}

                {/* Müdahale akışı */}
                <div className="bg-gray-800 rounded-lg p-3 text-xs space-y-1.5">
                  <p className="text-gray-400 font-semibold mb-2">📋 Durum Güncelle</p>
                  {[
                    { d: "bekliyor", i: "🟡", l: "Bekliyor",   desc: "Ekip atanmadı" },
                    { d: "yolda",   i: "🔵", l: "Yolda",      desc: "Ekip hareket etti" },
                    { d: "tamam",   i: "🟢", l: "Tamamlandı", desc: "Kaynak serbest bırakıldı" },
                  ].map(({ d, i, l, desc }) => (
                    <button key={d} onClick={() => durumGuncelle(secili.id, d)}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg transition text-left
                        ${secili.durum === d ? "bg-blue-700/40 border border-blue-600" : "hover:bg-gray-700"}`}>
                      <span>{i}</span>
                      <div>
                        <span className="font-semibold text-white">{l}</span>
                        <span className="text-gray-500 ml-1">— {desc}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Önerilen kaynaklar */}
                {eslesen && (
                  <div>
                    <p className="text-xs font-semibold text-gray-300 mb-1">🚒 Uygun Ekipler</p>
                    <p className="text-xs text-gray-500 mb-2">{eslesen.aciklama}</p>
                    <div className="space-y-2">
                      {eslesen.onerilen_kaynaklar.map(k => (
                        <div key={k.id} className="bg-gray-800 rounded-lg p-2.5 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white">{k.isim}</p>
                            <p className="text-xs text-gray-400 capitalize">{k.tip?.replace("_"," ")}{k.ekipman ? ` · ${k.ekipman}` : ""}</p>
                            {k.telefon
                              ? <p className="text-xs text-green-400">📞 {k.telefon} <span className="text-gray-500">← atayınca SMS gider</span></p>
                              : <p className="text-xs text-yellow-600">⚠️ Tel yok — SMS gönderilemez</p>}
                          </div>
                          <button onClick={() => kaynakaAta(k.id, k.telefon)} disabled={loading}
                            className="bg-green-800 hover:bg-green-700 disabled:bg-gray-700 text-xs px-3 py-1.5 rounded-lg flex-shrink-0 font-semibold transition">
                            ✅ Ata
                          </button>
                        </div>
                      ))}
                      {eslesen.onerilen_kaynaklar.length === 0 && (
                        <p className="text-xs text-gray-500 bg-gray-800 rounded-lg p-2">
                          ⚠️ Müsait kaynak bulunamadı.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Harita — masaüstünde görünür ─────────────────────────────────── */}
          <div className="hidden md:flex flex-1 relative">
            <MapContainer center={merkez} zoom={10}
              className="h-full w-full" style={{ background: "#1a1a2e" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />
              {mapCenter && <MapFlyTo center={mapCenter} />}
              {haritalik.map(ihbar => (
                <Marker key={ihbar.id} position={[ihbar.lat, ihbar.lng]}
                  icon={pinIcon(ihbar.oncelik_skoru, ihbar.durum)}
                  eventHandlers={{ click: () => ihbarSec(ihbar) }}>
                  <Popup>
                    <div className="text-xs min-w-[150px]">
                      <p className="font-bold mb-1">#{ihbar.id} — {ihbar.oncelik_skoru} puan</p>
                      <p className="text-gray-600 mb-1">{ihbar.adres}</p>
                      {ihbar.ozet && <p className="italic text-gray-500 mb-1">{ihbar.ozet}</p>}
                      <span className={`inline-block px-1.5 py-0.5 rounded text-white text-xs
                        ${ihbar.durum === "tamam" ? "bg-green-600" : ihbar.durum === "yolda" ? "bg-blue-600" : "bg-gray-600"}`}>
                        {ihbar.durum}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
            {/* Lejant */}
            <div className="absolute bottom-6 left-4 bg-gray-900/90 backdrop-blur rounded-lg p-3 text-xs space-y-1.5 z-[1000]">
              <p className="text-gray-400 font-semibold mb-1.5">Öncelik Seviyesi</p>
              {[["bg-red-500","Kritik (70+)"],["bg-orange-500","Orta (40-70)"],["bg-green-500","Düşük (<40)"],["bg-gray-500","Çözüldü"]].map(([c,l]) => (
                <div key={l} className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${c}`} /><span className="text-gray-300">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Auth gate ────────────────────────────────────────────────────────────────
export default function OperatorPanel() {
  const [girisYapildi, setGirisYapildi] = useState(
    () => sessionStorage.getItem("operator_giris") === "1"
  )
  return girisYapildi
    ? <PanelIci />
    : <OperatorGiris onGiris={() => setGirisYapildi(true)} />
}
