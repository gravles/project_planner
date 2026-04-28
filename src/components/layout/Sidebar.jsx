import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useUIStore } from '../../stores/uiStore'
import { useProperties } from '../../hooks/useProperties'
import { cn } from '../../lib/utils'

const NAV = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    label: 'Projects',
    to: '/',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    label: 'Vendors',
    to: '/vendors',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: 'Reports',
    to: '/reports',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
      </svg>
    ),
  },
  {
    label: 'Shopping List',
    to: '/shopping',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
]

export default function Sidebar({ open }) {
  const navigate = useNavigate()
  const { activeProperty, setActiveProperty, sidebarOpen, toggleSidebar } = useUIStore()

  function closeMobile() {
    // Only auto-close on the cover screen
    if (window.innerWidth < 640 && sidebarOpen) toggleSidebar()
  }
  const { data: properties = [] } = useProperties()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          key="sidebar"
          initial={{ x: -220, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -220, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed sm:relative inset-y-0 left-0 z-30 sm:z-auto w-[220px] shrink-0 bg-bg-surface border-r border-border flex flex-col overflow-hidden"
        >
          {/* Logo */}
          <div className="px-5 py-5 border-b border-border">
            <h1 className="font-display text-lg font-bold text-text-primary tracking-tight leading-none">
              Home <span className="text-accent">Projects</span>
            </h1>
            <p className="text-xs text-text-muted mt-0.5">Nathan · Ottawa</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-0.5">
            {NAV.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={closeMobile}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent/10 text-accent'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                  )
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}

            {/* Properties */}
            {properties.length > 0 && (
              <>
                <div className="mt-5 mb-2 px-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                    Properties
                  </p>
                </div>
                {properties.map(prop => (
                  <button
                    key={prop.id}
                    onClick={() => setActiveProperty(activeProperty === prop.name ? null : prop.name)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      activeProperty === prop.name
                        ? 'bg-bg-elevated text-text-primary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                    )}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: prop.color }}
                    />
                    {prop.name}
                  </button>
                ))}
              </>
            )}
          </nav>

          {/* Footer / sign out */}
          <div className="px-3 py-4 border-t border-border space-y-0.5">
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated',
                )
              }
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Settings
            </NavLink>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign out
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
