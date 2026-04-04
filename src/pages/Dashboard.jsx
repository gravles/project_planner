import AppShell from '../components/layout/AppShell'

export default function Dashboard() {
  return (
    <AppShell
      onNewProject={() => {}}
      onAIAdd={() => {}}
    >
      <div className="flex items-center justify-center h-full text-text-muted text-sm">
        Dashboard — coming soon
      </div>
    </AppShell>
  )
}
