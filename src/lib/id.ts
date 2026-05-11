function slugId(value: string, fallback = 'item') {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || fallback
}

function randomIdPart() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return Math.random().toString(36).slice(2, 12)
}

export function createId(prefix: string, readableSeed?: string) {
  const readable = readableSeed ? `${slugId(readableSeed)}-` : ''
  return `${slugId(prefix)}-${readable}${randomIdPart()}`
}
