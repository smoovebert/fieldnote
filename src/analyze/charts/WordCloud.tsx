import { useEffect, useRef } from 'react'
import { WordCloud as IsoWordCloud } from '@isoterik/react-word-cloud'
import type { FinalWordData } from '@isoterik/react-word-cloud'
import { exportCanvasPng } from '../exportImage'

export type WordDatum = { text: string; value: number }

type Props = {
  words: WordDatum[]
  onSelect?: (word: string) => void
  /** Setter the parent uses to register the canvas-export override. */
  onExporterReady?: (exporter: () => Promise<Blob | null>) => void
}

const WIDTH = 800
const HEIGHT = 360

export function WordCloud({ words, onSelect, onExporterReady }: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!onExporterReady) return
    onExporterReady(async () => {
      const node = wrapperRef.current
      if (!node) return null
      const canvas = node.querySelector('canvas')
      if (canvas) return exportCanvasPng(canvas)
      return null
    })
  }, [onExporterReady])

  if (words.length === 0) {
    return <div className="chart-empty-state">No terms yet — adjust filters.</div>
  }

  return (
    <div
      ref={wrapperRef}
      style={{ width: '100%', height: HEIGHT }}
    >
      <IsoWordCloud
        words={words}
        width={WIDTH}
        height={HEIGHT}
        onWordClick={(word: FinalWordData) => {
          onSelect?.(word.text)
        }}
      />
    </div>
  )
}
