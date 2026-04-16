import { useState, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import { STATUS_OPTIONS, STATUS_COLORS, cn } from '../../lib/utils'
import ProjectCard from './ProjectCard'

function DroppableColumn({ status, children, count, totalEstimate }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <div className="flex flex-col flex-1 min-w-[260px] max-w-[480px]">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_COLORS[status])}>
            {status}
          </span>
          <span className="text-xs text-text-muted">{count}</span>
        </div>
        {totalEstimate > 0 && (
          <span className="text-[11px] text-text-muted">${totalEstimate.toLocaleString()}</span>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 flex flex-col gap-2 p-2 rounded-xl min-h-[80px] transition-colors',
          isOver ? 'bg-accent/5 ring-1 ring-accent/30' : 'bg-bg-base/30',
        )}
      >
        {children}
      </div>
    </div>
  )
}

const STATUS_NEXT = {
  'Backlog': 'In Progress',
  'In Progress': 'Done',
  'Blocked': 'In Progress',
  'Done': null,
}
const STATUS_PREV = {
  'In Progress': 'Backlog',
  'Done': 'In Progress',
  'Blocked': 'Backlog',
  'Backlog': null,
}

function SwipeableCard({ project, onOpen, onUpdateStatus }) {
  const touchStartX = useRef(null)
  const [swipeDelta, setSwipeDelta] = useState(0)

  const nextStatus = STATUS_NEXT[project.status]
  const prevStatus = STATUS_PREV[project.status]
  const THRESHOLD = 72

  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
    setSwipeDelta(0)
  }

  function onTouchMove(e) {
    if (touchStartX.current === null) return
    const delta = e.touches[0].clientX - touchStartX.current
    setSwipeDelta(Math.max(-THRESHOLD, Math.min(THRESHOLD, delta)))
  }

  function onTouchEnd() {
    if (swipeDelta >= THRESHOLD && nextStatus) {
      onUpdateStatus(project.id, nextStatus)
    } else if (swipeDelta <= -THRESHOLD && prevStatus) {
      onUpdateStatus(project.id, prevStatus)
    }
    touchStartX.current = null
    setSwipeDelta(0)
  }

  const showRight = swipeDelta > 20 && nextStatus
  const showLeft = swipeDelta < -20 && prevStatus

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Right hint (advance status) */}
      {showRight && (
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-0">
          <span className="text-[11px] font-semibold text-success">→ {nextStatus}</span>
        </div>
      )}
      {/* Left hint (revert status) */}
      {showLeft && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none z-0">
          <span className="text-[11px] font-semibold text-text-muted">← {prevStatus}</span>
        </div>
      )}
      <div
        style={{ transform: `translateX(${swipeDelta}px)`, transition: swipeDelta === 0 ? 'transform 0.2s ease' : 'none' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <ProjectCard project={project} onOpen={onOpen} />
      </div>
    </div>
  )
}

function DraggableCard({ project, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: project.id,
    data: { status: project.status },
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, position: 'relative', zIndex: 50 }
    : undefined

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <ProjectCard project={project} onOpen={onOpen} isDragging={isDragging} />
    </div>
  )
}

export default function BoardView({ projects, onOpen, onUpdateStatus }) {
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const byStatus = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = projects.filter(p => p.status === s)
    return acc
  }, {})

  const activeProject = activeId ? projects.find(p => p.id === activeId) : null

  function handleDragEnd({ active, over }) {
    setActiveId(null)
    if (!over) return
    const newStatus = over.id
    const project = projects.find(p => p.id === active.id)
    if (project && project.status !== newStatus && STATUS_OPTIONS.includes(newStatus)) {
      onUpdateStatus(active.id, newStatus)
    }
  }

  return (
    <>
      {/* ── Mobile: grouped card list (no drag) ── */}
      <div className="sm:hidden flex-1 overflow-y-auto px-4 pt-4 pb-6 space-y-6 scrollbar-thin">
        {STATUS_OPTIONS.map(status => {
          const cols = byStatus[status]
          if (cols.length === 0) return null
          const totalEstimate = cols.reduce((s, p) => s + Number(p.estimate_cad ?? 0), 0)
          return (
            <div key={status}>
              <div className="flex items-center justify-between mb-2.5 px-1">
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_COLORS[status])}>
                    {status}
                  </span>
                  <span className="text-xs text-text-muted">{cols.length}</span>
                </div>
                {totalEstimate > 0 && (
                  <span className="text-[11px] text-text-muted">${totalEstimate.toLocaleString()}</span>
                )}
              </div>
              <div className="space-y-2">
                {cols.map(project => (
                  <SwipeableCard
                    key={project.id}
                    project={project}
                    onOpen={() => onOpen(project.id)}
                    onUpdateStatus={onUpdateStatus}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Desktop: drag-and-drop board ── */}
      <DndContext
        sensors={sensors}
        onDragStart={({ active }) => setActiveId(active.id)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="hidden sm:flex gap-4 h-full overflow-x-auto overflow-y-auto px-6 pt-5 pb-6 scrollbar-thin">
          {STATUS_OPTIONS.map(status => {
            const cols = byStatus[status]
            const totalEstimate = cols.reduce((s, p) => s + Number(p.estimate_cad ?? 0), 0)
            return (
              <DroppableColumn key={status} status={status} count={cols.length} totalEstimate={totalEstimate}>
                {cols.map(project => (
                  <DraggableCard
                    key={project.id}
                    project={project}
                    onOpen={() => onOpen(project.id)}
                  />
                ))}
              </DroppableColumn>
            )
          })}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeProject && (
            <div className="rotate-1 opacity-95 shadow-2xl w-[272px]">
              <ProjectCard project={activeProject} onOpen={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </>
  )
}
