import { useUIStore } from '../../stores/uiStore'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppShell({ children, onNewProject, onAIAdd }) {
  const { sidebarOpen } = useUIStore()

  return (
    <div className="flex h-screen bg-bg-base overflow-hidden">
      <Sidebar open={sidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onNewProject={onNewProject} onAIAdd={onAIAdd} />

        <main className="flex-1 overflow-hidden flex flex-col">
          {children}
        </main>
      </div>
    </div>
  )
}
