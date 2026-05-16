import { useState, useEffect } from "react"

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(null)
  const [visible, setVisible] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Zaten standalone modda çalışıyorsa gösterme
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true)
      return
    }

    const handler = (e) => {
      e.preventDefault()
      setPrompt(e)
      setVisible(true)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const install = async () => {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === "accepted") setInstalled(true)
    setVisible(false)
  }

  if (!visible || installed) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-80 bg-gray-800 border border-red-700 rounded-2xl p-4 shadow-2xl z-50 animate-slide-up">
      <div className="flex items-start gap-3">
        <img src="/icon-192.png" alt="icon" className="w-12 h-12 rounded-xl flex-shrink-0" />
        <div className="flex-1">
          <p className="font-bold text-sm text-white">DisasterRoute'u Kur</p>
          <p className="text-xs text-gray-400 mt-0.5">Ana ekrana ekle — internetsiz çalışır</p>
        </div>
        <button onClick={() => setVisible(false)} className="text-gray-600 hover:text-white text-lg leading-none">×</button>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => setVisible(false)}
          className="flex-1 py-2 rounded-xl text-xs text-gray-400 bg-gray-700 hover:bg-gray-600 transition"
        >
          Şimdi değil
        </button>
        <button
          onClick={install}
          className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition"
        >
          📲 Yükle
        </button>
      </div>
    </div>
  )
}
