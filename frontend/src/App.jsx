import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom"
import IhbarForm from "./pages/IhbarForm"
import KaynakForm from "./pages/KaynakForm"
import OperatorPanel from "./pages/OperatorPanel"
import InstallPrompt from "./components/InstallPrompt"
import OfflineBanner from "./components/OfflineBanner"

const NAV = [
  { to: "/",       label: "İhbar",    icon: "🆘", end: true  },
  { to: "/kaynak", label: "Kaynak",   icon: "👤", end: false },
  { to: "/panel",  label: "Operatör", icon: "🗺️", end: false },
]

function BottomNav() {
  const { pathname } = useLocation()
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-gray-900 border-t border-gray-800 flex md:hidden z-50"
         style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {NAV.map(({ to, label, icon, end }) => {
        const active = end ? pathname === to : pathname.startsWith(to)
        return (
          <NavLink key={to} to={to} end={end}
            className={`flex-1 flex flex-col items-center py-3 gap-0.5 text-xs font-medium transition-colors
              ${active ? "text-red-400" : "text-gray-500"}`}>
            <span className="text-xl leading-none">{icon}</span>
            <span>{label}</span>
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
        {/* Header */}
        <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded">SOS</span>
            <span className="font-bold text-white">DisasterRoute</span>
            <span className="text-gray-600 text-xs hidden sm:block">Enkaz Koordinasyon</span>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(({ to, label, icon, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition
                  ${isActive ? "bg-gray-800 text-white font-medium" : "text-gray-400 hover:text-white"}`}>
                {icon} {label}
              </NavLink>
            ))}
          </nav>
        </header>

        <OfflineBanner />

        {/* Content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <Routes>
            <Route path="/"       element={<IhbarForm />} />
            <Route path="/kaynak" element={<KaynakForm />} />
            <Route path="/panel"  element={<OperatorPanel />} />
          </Routes>
        </main>

        <BottomNav />
        <InstallPrompt />
      </div>
    </BrowserRouter>
  )
}
