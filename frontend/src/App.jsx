import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom"
import IhbarForm from "./pages/IhbarForm"
import KaynakForm from "./pages/KaynakForm"
import OperatorPanel from "./pages/OperatorPanel"

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-6">
          <span className="text-red-500 font-bold text-lg tracking-tight">
            🆘 DisasterRoute
          </span>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `text-sm ${isActive ? "text-white font-semibold" : "text-gray-400 hover:text-white"}`
            }
          >
            İhbar Gönder
          </NavLink>
          <NavLink
            to="/kaynak"
            className={({ isActive }) =>
              `text-sm ${isActive ? "text-white font-semibold" : "text-gray-400 hover:text-white"}`
            }
          >
            Kaynak Kaydı
          </NavLink>
          <NavLink
            to="/panel"
            className={({ isActive }) =>
              `text-sm ${isActive ? "text-white font-semibold" : "text-gray-400 hover:text-white"}`
            }
          >
            Operatör Paneli
          </NavLink>
        </nav>

        <Routes>
          <Route path="/" element={<IhbarForm />} />
          <Route path="/kaynak" element={<KaynakForm />} />
          <Route path="/panel" element={<OperatorPanel />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
