import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom"
import IhbarForm from "./pages/IhbarForm"
import KaynakForm from "./pages/KaynakForm"
import OperatorPanel from "./pages/OperatorPanel"

function BottomNav() {
  const loc = useLocation()
  const links = [
    { to: "/", label: "İhbar", icon: "🆘", end: true },
    { to: "/kaynak", label: "Kaynak", icon: "👤", end: false },
    { to: "/panel", label: "Operatör", icon: "🗺️", end: false },
  ]
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex z-50 safe-bottom md:hidden">
      {links.map((l) => {
        const active = l.end ? loc.pathname === l.to : loc.pathname.startsWith(l.to)
        return (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={`flex-1 flex flex-col items-center py-3 gap-0.5 text-xs transition ${
              active ? "text-red-400" : "text-gray-500"
            }`}
          >
            <span className="text-xl">{l.icon}</span>
            <span>{l.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

function TopBar() {
  return (
    <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
      <span className="text-red-500 font-bold text-lg tracking-tight flex items-center gap-2">
        🆘 DisasterRoute
      </span>
      {/* Masaüstünde yatay nav */}
      <nav className="hidden md:flex items-center gap-6">
        {[
          { to: "/", label: "İhbar Gönder", end: true },
          { to: "/kaynak", label: "Kaynak Kaydı" },
          { to: "/panel", label: "Operatör Paneli" },
        ].map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `text-sm ${isActive ? "text-white font-semibold" : "text-gray-400 hover:text-white"}`
            }
          >
            {l.label}
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
        {/* Mobilde alt bar için padding */}
        <div className="pb-20 md:pb-0">
          <Routes>
            <Route path="/" element={<IhbarForm />} />
            <Route path="/kaynak" element={<KaynakForm />} />
            <Route path="/panel" element={<OperatorPanel />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}
