import { atom, read, update } from 'claude-code'
import type { EngineInterface, RenderInput } from 'claude-code'

import type { Limit } from '../types'

const limits = atom({ plugin: 'sela', key: 'limits' } as const, [] as Limit[])

const THRESHOLDS = [50, 80]
const DAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']

const label = (kind: string) =>
  kind === 'five_hour' ? '5s' : kind === 'seven_day' ? 'hafta' : kind

const pad = (n: number) => String(n).padStart(2, '0')

const resetText = (kind: string, resetsAt?: string) => {
  if (!resetsAt) return ''
  const d = new Date(resetsAt)
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  return kind === 'five_hour' ? ` ↻${time}` : ` ↻${DAYS[d.getDay()]} ${time}`
}

// Desktop: raw 'yellow' is hard to read on a light background, so use the
// theme's 'warning' key, which follows the app's light/dark mode.
const color = (p: number, surface: string) =>
  p >= 80 ? 'red' : p >= 50 ? (surface === 'desktop' ? 'warning' : 'yellow') : undefined

export async function saveLimits($: EngineInterface, next: Limit[]) {
  if (next.length === 0) return
  await update($, limits, () => next)

  // Toast once per window and threshold, across all sessions.
  for (const l of next) {
    const key = `toasted:${l.kind}:${l.resetsAt ?? ''}`
    const done = Number((await $.store.get(key)) ?? 0)
    const hit = THRESHOLDS.filter(t => l.percentUsed >= t && t > done).pop()
    if (hit) {
      await $.store.set(key, hit)
      $.ui.toast(`${label(l.kind)} limitinin %${Math.round(l.percentUsed)}'i kullanıldı`)
    }
  }
}

export async function limitRow($: EngineInterface, e: RenderInput<'AbovePrompt'>) {
  const list = await read($, limits)
  if (list.length === 0) return null
  const { Box, Text } = $.ui.resolve(e)
  return (
    <Box key="limit">
      <Text dimColor>Limit </Text>
      {list.map((l, i) => (
        <Text
          key={l.kind}
          color={color(l.percentUsed, e.surface)}
          dimColor={!color(l.percentUsed, e.surface)}
        >
          {i > 0 ? ' · ' : ''}
          {label(l.kind)} %{Math.round(l.percentUsed)}
          {resetText(l.kind, l.resetsAt)}
        </Text>
      ))}
    </Box>
  )
}
