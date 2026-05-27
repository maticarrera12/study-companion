import { useEffect } from "react"
import { Outlet } from "react-router-dom"
import { initDB } from "./lib/db"

export default function App() {
  useEffect(() => {
    initDB().catch(console.error)
  }, [])

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "#0a0e1a", color: "#f0ece4" }}>
      {/* TimerBar will be mounted here in Phase 2 */}
      <main style={{ flex: 1, overflow: "auto" }}>
        <Outlet />
      </main>
    </div>
  )
}
