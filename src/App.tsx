import { useEffect } from "react"
import { Outlet } from "react-router-dom"
import { initDB } from "./lib/db"

export default function App() {
  useEffect(() => {
    initDB().catch(console.error)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-bg text-text-primary">
      {/* TimerBar will be mounted here in Phase 2 */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
