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
const MIN_FONT_PX = 14
const MAX_FONT_PX = 56

// d3-cloud's default fontSize accessor is Math.sqrt(value), which produces
// sub-pixel text for typical term-frequency counts (e.g. 1–30) and silently
// renders a blank cloud. We pass our own accessor that maps value into the
// MIN_FONT_PX..MAX_FONT_PX range based on the data's own min/max.
function makeFontSizeAccessor(words: WordDatum[]): (w: WordDatum) => number {
  if (words.length === 0) return () => MIN_FONT_PX
  const values = words.map((w) => w.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  return (w) => {
    if (max === min) return (MIN_FONT_PX + MAX_FONT_PX) / 2
    const t = (w.value - min) / (max - min) // 0..1
    return MIN_FONT_PX + Math.sqrt(t) * (MAX_FONT_PX - MIN_FONT_PX)
  }
}

export function WordCloud({ words, onSelect, onExporterReady }: Props) {
  const fontSize = makeFontSizeAccessor(words)
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
        fontSize={fontSize}
        onWordClick={(word: FinalWordData) => {
          onSelect?.(word.text)
        }}
      />
    </div>
  )
}
