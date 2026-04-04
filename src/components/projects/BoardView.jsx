import { useState } from 'react'
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
    <div className="flex flex-col w-[272px] shrink-0">
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
    <DndContext
      sensors={sensors}
      onDragStart={({ active }) => setActiveId(active.id)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-4 h-full overflow-x-auto overflow-y-auto px-6 pt-5 pb-6 scrollbar-thin">
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
  )
}
