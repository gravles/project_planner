import { useTags } from '../../hooks/useAdmin'
import { cn } from '../../lib/utils'

/**
 * Multi-select tag picker.
 * Props:
 *   selectedTagIds  string[]
 *   onChange        (ids: string[]) => void
 *   compact         bool  — smaller pills, for use on cards / filter bar
 */
export default function TagPicker({ selectedTagIds = [], onChange, compact = false }) {
  const { data: tags = [] } = useTags()
  if (tags.length === 0) return null

  function toggle(id) {
    onChange(
      selectedTagIds.includes(id)
        ? selectedTagIds.filter(x => x !== id)
        : [...selectedTagIds, id]
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map(tag => {
        const sel = selectedTagIds.includes(tag.id)
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggle(tag.id)}
            className={cn(
              'rounded-full border font-medium transition-all',
              compact ? 'text-[10px] px-1.5 py-px' : 'text-xs px-2.5 py-0.5',
              sel ? 'border-transparent' : 'bg-transparent border-border text-text-muted hover:border-border-hover',
            )}
            style={sel ? { backgroundColor: `${tag.color}22`, borderColor: tag.color, color: tag.color } : {}}
          >
            {tag.name}
          </button>
        )
      })}
    </div>
  )
}
