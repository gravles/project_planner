import { useState, useRef } from 'react'
import { useProjectPhotos, useUploadPhoto, useDeletePhoto } from '../../hooks/usePhotos'
import { cn } from '../../lib/utils'

const TABS = ['before', 'progress', 'after']
const LABELS = { before: 'Before', progress: 'Progress', after: 'After' }

function Lightbox({ photos, index: initialIndex, onClose }) {
  const [idx, setIdx] = useState(initialIndex)
  const photo = photos[idx]

  return (
    <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col" onClick={onClose}>
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
    </div>
  )
}

export default function PhotoGallery({ projectId }) {
  const { data: allPhotos = [] } = useProjectPhotos(projectId)
  const uploadPhoto = useUploadPhoto()
  const deletePhoto = useDeletePhoto()

  const [activeTab, setActiveTab] = useState('progress')
  const [lightbox, setLightbox] = useState(null) // { photos, index }
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
