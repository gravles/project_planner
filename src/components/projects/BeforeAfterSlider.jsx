import { useState, useRef, useCallback } from 'react'

// Draggable before/after comparison: the after photo sits underneath and the
// before photo is clipped at the divider. Pointer-drag or arrow keys move it.
export default function BeforeAfterSlider({ beforeUrl, afterUrl }) {
  const [pos, setPos] = useState(50) // % from the left
  const containerRef = useRef(null)
  const dragging = useRef(false)

  const updateFromClientX = useCallback(clientX => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setPos(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)))
  }, [])

  function onPointerDown(e) {
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    updateFromClientX(e.clientX)
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); setPos(p => Math.max(0, p - 5)) }
    if (e.key === 'ArrowRight') { e.preventDefault(); setPos(p => Math.min(100, p + 5)) }
  }

  return (
    <div
      ref={containerRef}
      role="slider"
      aria-label="Before and after comparison"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pos)}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={e => { if (dragging.current) updateFromClientX(e.clientX) }}
      onPointerUp={() => { dragging.current = false }}
      onKeyDown={onKeyDown}
      className="relative w-full aspect-[4/3] rounded-xl overflow-hidden select-none cursor-ew-resize touch-none bg-bg-base focus:outline-none focus:ring-1 focus:ring-accent"
    >
      <img
        src={afterUrl}
        alt="After"
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      <img
        src={beforeUrl}
        alt="Before"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

      {/* Divider + grip */}
      <div className="absolute inset-y-0 w-0.5 bg-white/90 shadow-lg" style={{ left: `${pos}%` }}>
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white shadow-lg flex items-center justify-center text-bg-base text-[10px] font-bold">
          ⇔
        </div>
      </div>

      {/* Corner labels */}
      <span className="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wide bg-black/60 text-white px-1.5 py-0.5 rounded pointer-events-none">
        Before
      </span>
      <span className="absolute top-2 right-2 text-[10px] font-semibold uppercase tracking-wide bg-black/60 text-white px-1.5 py-0.5 rounded pointer-events-none">
        After
      </span>
    </div>
  )
}
