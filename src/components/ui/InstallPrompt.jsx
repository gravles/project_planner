import { useState, useEffect } from 'react'

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(null)
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('pwa-install-dismissed') === '1'
  )

  useEffect(() => {
    function handleBeforeInstall(e) {
      e.preventDefault()
      setPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  if (!prompt || dismissed) return null

  function handleInstall() {
    prompt.prompt()
    prompt.userChoice.then(() => setPrompt(null))
  }

  function handleDismiss() {
    localStorage.setItem('pwa-install-dismissed', '1')
    setDismissed(true)
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-6 md:w-80">
      <div className="bg-bg-surface border border-border rounded-xl p-4 shadow-xl flex items-start gap-3">
        <div className="text-2xl shrink-0">🏠</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary">Add to Home Screen</p>
          <p className="text-xs text-text-muted mt-0.5">
            Install Home Projects for quick access from your device.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="bg-accent hover:bg-amber-400 text-bg-base text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors"
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="text-text-muted hover:text-text-secondary text-xs rounded-lg px-3 py-1.5 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
