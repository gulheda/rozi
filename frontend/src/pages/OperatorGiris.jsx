import { useState } from "react"

const SIFRE = "AFET2026"

export default function OperatorGiris({ onGiris }) {
  const [sifre, setSifre]   = useState("")
  const [hata, setHata]     = useState(false)
  const [goster, setGoster] = useState(false)

  const giris = (e) => {
    e.preventDefault()
    if (sifre === SIFRE) {
      sessionStorage.setItem("operator_giris", "1")
      onGiris()
    } else {
      setHata(true)
      setSifre("")
      setTimeout(() => setHata(false), 2000)
    }
  }

  return (
    <div className="w-full min-h-full flex items-center justify-center px-4 py-10 bg-gray-950">
      <div className="w-full max-w-sm space-y-4">

        {/* Kart */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-700 rounded-2xl mb-4">
              <span className="text-3xl">🛡️</span>
            </div>
            <h1 className="text-xl font-bold text-white">Koordinasyon Merkezi</h1>
            <p className="text-gray-500 text-sm mt-1">Yetkili personel girişi</p>
          </div>

          <form onSubmit={giris} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Erişim Kodu</label>
              <div className="relative">
                <input
                  type={goster ? "text" : "password"}
                  placeholder="••••••••"
                  value={sifre}
                  onChange={e => setSifre(e.target.value)}
                  className={`w-full bg-gray-800 border rounded-xl px-4 py-3 text-sm focus:outline-none pr-16 transition
                    ${hata ? "border-red-500 animate-pulse" : "border-gray-700 focus:border-amber-500"}`}
                  autoFocus
                />
                <button type="button" onClick={() => setGoster(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs px-1">
                  {goster ? "Gizle" : "Göster"}
                </button>
              </div>
              {hata && <p className="text-red-400 text-xs mt-1.5">❌ Hatalı erişim kodu</p>}
            </div>

            <button type="submit"
              className="w-full bg-amber-700 hover:bg-amber-600 py-3 rounded-xl font-bold text-sm transition">
              🔓 Giriş Yap
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-800 space-y-2">
            <p className="text-xs text-gray-600 text-center">
              Bu panel yalnızca <strong className="text-gray-500">yetkili koordinasyon merkezi personeline</strong> açıktır.
            </p>
          </div>
        </div>

        {/* Kim girebilir? */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-400">Bu panele kimler girebilir?</p>
          <div className="space-y-1.5 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>AFAD koordinasyon merkezi personeli</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Kızılay / afet koordinatörleri</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Yetkili komuta merkezi görevlileri</span>
            </div>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-800">
              <span className="text-red-500">✗</span>
              <span className="text-gray-600">Vatandaşlar ve gönüllüler bu panele giremez</span>
            </div>
          </div>
        </div>

        {/* Vatandaş yönlendirme */}
        <div className="text-center">
          <p className="text-xs text-gray-600">
            Enkaz ihbarı mı?{" "}
            <a href="/" className="text-red-400 hover:text-red-300 underline">İhbar formuna git →</a>
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Gönüllü olmak mı istiyorsunuz?{" "}
            <a href="/kaynak" className="text-green-400 hover:text-green-300 underline">Görevli kaydına git →</a>
          </p>
        </div>
      </div>
    </div>
  )
}
