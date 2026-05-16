import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom"
import IhbarForm from "./pages/IhbarForm"
import KaynakForm from "./pages/KaynakForm"
import OperatorPanel from "./pages/OperatorPanel"
import InstallPrompt from "./components/InstallPrompt"
import OfflineBanner from "./components/OfflineBanner"

const NAV_LINKS = [
  { to: "/",       label: "İhbar",     icon: "🆘", end: true  },
  { to: "/kaynak", label: "Kaynak",    icon: "👤", end: false },
  { to: "/panel",  label: "Operatör",  icon: "🗺️", end: false },
]

function BottomNav() {
  const loc = useLocation()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur border-t border-gray-800 flex z-50 md:hidden"
         style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {NAV_LINKS.map((l) => {
        const active = l.end ? loc.pathname === l.to : loc.pathname.startsWith(l.to)
        return (
          <NavLink key={l.to} to={l.to} end={l.end}
            className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 text-xs transition-colors ${
              active ? "text-red-400" : "text-gray-500 hover:text-gray-300"
            }`}>
            <span className="text-2xl leading-none">{l.icon}</span>
            <span className="font-medium">{l.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

function TopBar() {
  return (
    <header className="bg-gray-900/95 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40"
            style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
      <div className="flex items-center gap-2">
        <span className="text-red-500 font-black text-lg tracking-tight">🆘 DisasterRoute</span>
        <span className="text-xs text-gray-600 hidden sm:block">Enkaz Koordinasyon</span>
      </div>
      {/* Masaüstü nav */}
      <nav className="hidden md:flex items-center gap-6">
        {NAV_LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end}
            className={({ isActive }) =>
              `text-sm ${isActive ? "text-white font-semibold" : "text-gray-400 hover:text-white"}`
            }>
            {l.icon} {l.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <TopBar />
        <OfflineBanner />
        <div className="pb-24 md:pb-0">
          <Routes>
            <Route path="/"       element={<IhbarForm />} />
            <Route path="/kaynak" element={<KaynakForm />} />
            <Route path="/panel"  element={<OperatorPanel />} />
          </Routes>
        </div>
        <BottomNav />
        <InstallPrompt />
      </div>
    </BrowserRouter>
  )
}
