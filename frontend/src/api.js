import axios from "axios"

// HTTP base URL
const BASE = import.meta.env.VITE_API_URL ||
  (window.location.port === "5173" ? "http://127.0.0.1:8000" : "")

// WebSocket URL — VITE_API_URL varsa ondan türet, yoksa localhost:8000
export const WS_URL = (() => {
  const apiUrl = import.meta.env.VITE_API_URL
  if (apiUrl) {
    // https://... → wss://..., http://... → ws://...
    return apiUrl.replace(/^https/, "wss").replace(/^http/, "ws") + "/ws"
  }
  return "ws://localhost:8000/ws"
})()

export const api = axios.create({ baseURL: BASE })

export const getIhbarlar = (durum) =>
  api.get("/ihbarlar", { params: durum ? { durum } : {} }).then((r) => r.data)

export const postIhbar = (formData) =>
  api.post("/ihbar", formData, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data)

export const updateIhbarDurum = (id, durum) =>
  api.put(`/ihbar/${id}`, { durum }).then((r) => r.data)

export const getEslestir = (ihbarId) =>
  api.get(`/ihbar/${ihbarId}/eslesir`).then((r) => r.data)

export const atamaYap = (ihbarId, kaynakId, notlar) =>
  api.post(`/ihbar/${ihbarId}/ata`, { kaynak_id: kaynakId, notlar }).then((r) => r.data)

export const getKaynaklar = (musait) =>
  api.get("/kaynaklar", { params: musait !== undefined ? { musait } : {} }).then((r) => r.data)

export const postKaynak = (body) =>
  api.post("/kaynak", body).then((r) => r.data)

export const updateKaynakMusait = (id, musait) =>
  api.put(`/kaynak/${id}/musaitlik`, null, { params: { musait } }).then((r) => r.data)
