'use client'
import { useState } from 'react'

interface Imagem {
  id: string
  conteudo: string
  criadoEm: string
}

interface Props {
  imagens: Imagem[]
}

export function Galeria({ imagens }: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null)

  if (!imagens.length) {
    return (
      <div className="aspect-video bg-muted rounded-xl flex items-center justify-center text-muted-foreground">
        Sem imagens
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {imagens.map((img) => (
          <button
            key={img.id}
            onClick={() => setLightbox(img.conteudo)}
            className="aspect-video overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <img
              src={`data:image/jpeg;base64,${img.conteudo}`}
              alt="Imagem do veículo"
              className="w-full h-full object-cover hover:scale-105 transition-transform"
            />
          </button>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightbox(null)}
        >
          <img
            src={`data:image/jpeg;base64,${lightbox}`}
            alt="Visualização"
            className="max-w-[90vw] max-h-[90vh] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
