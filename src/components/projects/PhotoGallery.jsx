import { useState, useRef } from 'react'
import { useProjectPhotos, useUploadPhoto, useDeletePhoto } from '../../hooks/usePhotos'
import { getRoomRecommendations, compareBeforeAfter } from '../../lib/anthropic'
import { cn } from '../../lib/utils'

const TABS = ['before', 'progress', 'after']
const LABELS = { before: 'Before', progress: 'Progress', after: 'After' }

function Lightbox({ photos, index: initialIndex, onClose }) {
  const [idx, setIdx] = useState(initialIndex)
  const touchStartX = useRef(null)
  const photo = photos[idx]

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return
    const delta = touchStartX.current - e.changedTouches[0].clientX
    if (delta > 50) setIdx(i => Math.min(photos.length - 1, i + 1))
    else if (delta < -50) setIdx(i => Math.max(0, i - 1))
    touchStartX.current = null
  }

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/95 flex flex-col"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex justify-between items-center px-5 py-4" onClick={e => e.stopPropagation()}>
        <span className="text-white/50 text-sm">{idx + 1} / {photos.length}</span>
        <button onClick={onClose} className="text-white/60 hover:text-white text-xl transition-colors">✕</button>
      </div>
      <div className="flex-1 flex items-center justify-center gap-4 px-4" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => setIdx(i => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="text-white/40 hover:text-white disabled:opacity-20 p-3 text-2xl transition-colors"
        >
          ←
        </button>
        <img
          src={photo.url}
          alt={photo.caption ?? 'Project photo'}
          className="max-h-[75vh] max-w-[80vw] object-contain rounded-xl shadow-2xl"
          draggable={false}
        />
        <button
          onClick={() => setIdx(i => Math.min(photos.length - 1, i + 1))}
          disabled={idx === photos.length - 1}
          className="text-white/40 hover:text-white disabled:opacity-20 p-3 text-2xl transition-colors"
        >
          →
        </button>
      </div>
      {photo.caption && (
        <p className="text-center text-white/60 text-sm pb-4" onClick={e => e.stopPropagation()}>
          {photo.caption}
        </p>
      )}
      {/* Swipe hint — only shown on first open when there are multiple photos */}
      {photos.length > 1 && (
        <p className="text-center text-white/20 text-xs pb-3 select-none">swipe to navigate</p>
      )}
    </div>
  )
}

function AiRecommendations({ project, photos }) {
  const [recs, setRecs] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function analyze() {
    setLoading(true)
    setError(null)
    try {
      const result = await getRoomRecommendations(project, photos)
      setRecs(result)
    } catch (e) {
      setError('Could not get recommendations. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-bg-elevated p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">AI Room Analysis</p>
        <button
          onClick={analyze}
          disabled={loading}
          className="text-xs text-accent hover:text-amber-300 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
              </svg>
              Analyzing…
            </>
          ) : recs ? 'Re-analyze' : 'Analyze photos'}
        </button>
      </div>

      {!recs && !loading && !error && (
        <p className="text-xs text-text-muted">
          Claude will look at your photos + full project context and suggest what to add or do next.
        </p>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {recs && (
        <ul className="space-y-2 mt-2">
          {recs.map((rec, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-text-secondary">
              <span className="text-accent shrink-0 mt-0.5">→</span>
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function BeforeAfterCompare({ project, beforePhotos, afterPhotos }) {
  const [beforeIdx, setBeforeIdx] = useState(0)
  const [afterIdx, setAfterIdx] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function compare() {
    setLoading(true)
    setError(null)
    try {
      const res = await compareBeforeAfter(project, beforePhotos[beforeIdx], afterPhotos[afterIdx])
      setResult(res)
    } catch {
      setError('Could not compare photos. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-bg-elevated p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Before / After Compare</p>
        <button
          onClick={compare}
          disabled={loading}
          className="text-xs text-accent hover:text-amber-300 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
              </svg>
              Comparing…
            </>
          ) : result ? 'Re-compare' : 'Compare'}
        </button>
      </div>

      {/* Photo selectors when there are multiple in either category */}
      <div className="flex gap-3 mb-3">
        <div className="flex-1">
          <p className="text-[10px] text-text-muted mb-1.5">Before</p>
          <div className="flex gap-1.5 flex-wrap">
            {beforePhotos.map((p, i) => (
              <img
                key={p.id}
                src={p.url}
                alt=""
                onClick={() => setBeforeIdx(i)}
                className={cn('w-12 h-12 object-cover rounded cursor-pointer transition-all', beforeIdx === i ? 'ring-2 ring-accent' : 'opacity-50 hover:opacity-80')}
              />
            ))}
          </div>
        </div>
        <div className="flex-1">
          <p className="text-[10px] text-text-muted mb-1.5">After</p>
          <div className="flex gap-1.5 flex-wrap">
            {afterPhotos.map((p, i) => (
              <img
                key={p.id}
                src={p.url}
                alt=""
                onClick={() => setAfterIdx(i)}
                className={cn('w-12 h-12 object-cover rounded cursor-pointer transition-all', afterIdx === i ? 'ring-2 ring-accent' : 'opacity-50 hover:opacity-80')}
              />
            ))}
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {!result && !loading && !error && (
        <p className="text-xs text-text-muted">Select one photo from each side then hit Compare.</p>
      )}

      {result && (
        <div className="space-y-3 mt-1">
          <p className="text-sm text-text-secondary leading-relaxed">{result.summary}</p>
          {result.completed?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-green-500 uppercase tracking-wider mb-1">Completed</p>
              <ul className="space-y-1">
                {result.completed.map((c, i) => (
                  <li key={i} className="flex gap-2 text-xs text-text-secondary">
                    <span className="text-green-500 shrink-0">✓</span>{c}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.outstanding?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider mb-1">Still Outstanding</p>
              <ul className="space-y-1">
                {result.outstanding.map((o, i) => (
                  <li key={i} className="flex gap-2 text-xs text-text-secondary">
                    <span className="text-amber-500 shrink-0">→</span>{o}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function PhotoGallery({ projectId, project }) {
  const { data: allPhotos = [] } = useProjectPhotos(projectId)
  const uploadPhoto = useUploadPhoto()
  const deletePhoto = useDeletePhoto()

  const [activeTab, setActiveTab] = useState('progress')
  const [lightbox, setLightbox] = useState(null)
  const fileInputRef = useRef(null)

  const tabPhotos = allPhotos.filter(p => p.photo_type === activeTab)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    uploadPhoto.mutate({ projectId, file, photoType: activeTab })
    e.target.value = ''
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-0.5 mb-3">
        {TABS.map(tab => {
          const count = allPhotos.filter(p => p.photo_type === tab).length
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'text-xs px-3 py-1 rounded-lg font-medium transition-colors',
                activeTab === tab
                  ? 'bg-bg-elevated text-text-primary'
                  : 'text-text-muted hover:text-text-secondary',
              )}
            >
              {LABELS[tab]}{count > 0 && <span className="ml-1 text-text-muted">({count})</span>}
            </button>
          )
        })}
        <div className="flex-1" />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadPhoto.isPending}
          className="text-xs text-accent hover:text-amber-300 transition-colors disabled:opacity-50"
        >
          {uploadPhoto.isPending ? 'Uploading…' : '+ Add photo'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {/* Grid */}
      {tabPhotos.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border border-dashed border-border rounded-xl p-6 text-center text-text-muted text-sm cursor-pointer hover:border-border-hover transition-colors"
        >
          No {LABELS[activeTab].toLowerCase()} photos yet — click to upload
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {tabPhotos.map((photo, i) => (
            <div key={photo.id} className="relative group aspect-square">
              <img
                src={photo.url}
                alt={photo.caption ?? ''}
                onClick={() => setLightbox({ photos: tabPhotos, index: i })}
                className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              />
              <button
                onClick={() => deletePhoto.mutate({ id: photo.id, storagePath: photo.storage_path, projectId })}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-black/60 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center hover:bg-danger transition-all"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* AI Recommendations — only shown when there are photos and project context is available */}
      {allPhotos.length > 0 && project && (
        <AiRecommendations project={project} photos={allPhotos} />
      )}

      {/* Before/After Compare — only shown when both types exist */}
      {(() => {
        const beforePhotos = allPhotos.filter(p => p.photo_type === 'before')
        const afterPhotos = allPhotos.filter(p => p.photo_type === 'after')
        return beforePhotos.length > 0 && afterPhotos.length > 0 && project ? (
          <BeforeAfterCompare
            project={project}
            beforePhotos={beforePhotos}
            afterPhotos={afterPhotos}
          />
        ) : null
      })()}

      {lightbox && (
        <Lightbox
          photos={lightbox.photos}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  )
}
