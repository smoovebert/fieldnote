import { useEffect, useRef } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { exportCanvasPng } from '../exportImage'

export type NetworkNode = { id: string; label: string; weight: number }
export type NetworkLink = { source: string; target: string; weight: number }

type Props = {
  nodes: NetworkNode[]
  links: NetworkLink[]
  width: number
  height: number
  onSelect?: (codeId: string) => void
  onExporterReady?: (exporter: () => Promise<Blob | null>) => void
}

type LinkLike = { weight?: number }
type NodeLike = { id?: string | number }

export function NetworkGraph({ nodes, links, width, height, onSelect, onExporterReady }: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!onExporterReady) return
    onExporterReady(async () => {
      const node = wrapperRef.current
      if (!node) return null
      const canvas = node.querySelector('canvas')
      return canvas ? exportCanvasPng(canvas) : null
    })
  }, [onExporterReady])

  if (nodes.length < 2) {
    return <div className="chart-empty-state">Network needs &ge; 2 connected codes &mdash; adjust filters.</div>
  }

  return (
    <div
      ref={wrapperRef}
      style={{ width, height }}
    >
      <ForceGraph2D
        graphData={{ nodes, links }}
        width={width}
        height={height}
        nodeLabel="label"
        nodeRelSize={6}
        linkWidth={(l: unknown) => {
          const w = (l as LinkLike).weight ?? 1
          return Math.max(1, Math.log2(w + 1))
        }}
        onNodeClick={(n: unknown) => {
          const id = (n as NodeLike).id
          onSelect?.(String(id ?? ''))
        }}
        cooldownTicks={120}
      />
    </div>
  )
}
