import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom"
import IhbarForm from "./pages/IhbarForm"
import KaynakForm from "./pages/KaynakForm"
import OperatorPanel from "./pages/OperatorPanel"
import OfflineBanner from "./components/OfflineBanner"

const NAV = [
  { to: "/",       label: "İhbar Gönder", icon: "🆘", end: true  },
  { to: "/kaynak", label: "Görevli Kayıt", icon: "👤", end: false },
  { to: "/panel",  label: "Operatör",      icon: "🛡️", end: false, restricted: true },
]

function BottomNav() {
  const { pathname } = useLocation()
  return (
    <nav
      className="fixed bottom-0 inset-x-0 bg-gray-900 border-t border-gray-800 flex md:hidden z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {NAV.map(({ to, label, icon, end, restricted }) => {
        const active = end ? pathname === to : pathname.startsWith(to)
        return (
          <NavLink key={to} to={to} end={end}
            className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 text-xs font-medium transition-colors
              ${active
                ? restricted ? "text-amber-400" : "text-red-400"
                : restricted ? "text-amber-700 hover:text-amber-500" : "text-gray-500 hover:text-gray-300"
              }`}>
            <span className="text-lg leading-none">{icon}</span>
            <span className="text-[11px]">{label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40 flex-shrink-0">
          <div className="w-full px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded-md">SOS</span>
              <span className="font-bold text-white text-base">DisasterRoute</span>
              <span className="text-gray-500 text-xs hidden sm:block">Enkaz Koordinasyon Sistemi</span>
            </div>
            {/* Masaüstü nav */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV.map(({ to, label, icon, end, restricted }) => (
                <NavLink key={to} to={to} end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition
                    ${restricted
                      ? isActive
                        ? "bg-amber-900/50 text-amber-300 border border-amber-700"
                        : "text-amber-700 hover:text-amber-400 border border-transparent"
                      : isActive
                        ? "bg-gray-800 text-white"
                        : "text-gray-400 hover:text-white"
                    }`}>
                  <span>{icon}</span>
                  <span>{label}</span>
                  {restricted && (
                    <span className="text-[10px] bg-amber-900/60 text-amber-500 px-1 rounded">YETKİLİ</span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        </header>

        <OfflineBanner />

        {/* ── Content ────────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0 bg-gray-950">
          <Routes>
            <Route path="/"       element={<IhbarForm />} />
            <Route path="/kaynak" element={<KaynakForm />} />
            <Route path="/panel"  element={<OperatorPanel />} />
          </Routes>
        </main>

        <BottomNav />
      </div>
    </BrowserRouter>
  )
}
