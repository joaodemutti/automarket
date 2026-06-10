'use client'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface Imagem {
  id: string
  conteudo: string
  criadoEm: string
}

interface Props {
  imagens: Imagem[]
}

export function Galeria({ imagens }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightbox, setLightbox] = useState(false)

  if (!imagens.length) {
    return (
      <div className="aspect-[4/3] bg-muted rounded-xl flex items-center justify-center text-muted-foreground">
        Sem imagens
      </div>
    )
  }

  const activeImage = imagens[activeIndex]
  const activeSrc = `data:image/jpeg;base64,${activeImage.conteudo}`
  const hasMultipleImages = imagens.length > 1

  function previousImage() {
    setActiveIndex((current) => (current === 0 ? imagens.length - 1 : current - 1))
  }

  function nextImage() {
    setActiveIndex((current) => (current === imagens.length - 1 ? 0 : current + 1))
  }

  return (
    <>
      <div className="space-y-3">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
          <button
            type="button"
            onClick={() => setLightbox(true)}
            className="block h-full w-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <img src={activeSrc} alt="Imagem do veiculo" className="h-full w-full object-cover" />
          </button>

          {hasMultipleImages && (
            <>
              <button
                type="button"
                onClick={previousImage}
                aria-label="Imagem anterior"
                className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground shadow hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={nextImage}
                aria-label="Proxima imagem"
                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground shadow hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
                {activeIndex + 1} / {imagens.length}
              </div>
            </>
          )}
        </div>

        {hasMultipleImages && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {imagens.map((img, index) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Mostrar imagem ${index + 1}`}
                className={`h-20 w-28 shrink-0 overflow-hidden rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary ${
                  index === activeIndex ? 'border-primary' : 'border-border'
                }`}
              >
                <img
                  src={`data:image/jpeg;base64,${img.conteudo}`}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            onClick={() => setLightbox(false)}
            aria-label="Fechar visualizacao"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-black hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={activeSrc}
            alt="Visualizacao"
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
