import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Accessibility plumbing for modals: while open, Tab cycles inside the
// container; on open, focus moves in (unless something inside — e.g. an
// autoFocus input — already has it); on close, focus returns to whatever
// opened the modal. Attach the returned ref to the modal panel.
export function useModalA11y(open) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const container = containerRef.current
    const previouslyFocused = document.activeElement

    if (container && !container.contains(document.activeElement)) {
      container.querySelector(FOCUSABLE)?.focus()
    }

    function onKeyDown(e) {
      if (e.key !== 'Tab' || !containerRef.current) return
      const nodes = [...containerRef.current.querySelectorAll(FOCUSABLE)]
        .filter(el => el.checkVisibility?.() ?? true)
      if (!nodes.length) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [open])

  return containerRef
}
