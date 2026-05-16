import { useState, useEffect } from "react"

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener("online", on)
    window.addEventListener("offline", off)
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off) }
  }, [])

  if (!offline) return null

  return (
    <div className="bg-orange-900 border-b border-orange-700 px-4 py-2 text-xs text-orange-200 flex items-center gap-2 text-center justify-center">
      <span className="animate-pulse">📵</span>
      Çevrimdışı mod — SMS kodu oluşturabilirsiniz, ihbar internet gelince gönderilir
    </div>
  )
}
