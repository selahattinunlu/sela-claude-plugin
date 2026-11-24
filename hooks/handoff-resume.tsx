import { atom, read, update } from 'claude-code'
import type { EngineInterface, RenderInput } from 'claude-code'

import type { Handoff } from '../types'

const offer = atom({ plugin: 'sela', key: 'handoffs' } as const, null as Handoff[] | null)
const isListOpen = atom({ plugin: 'sela', key: 'isHandoffListOpen' } as const, false)
const isContextToasted = atom({ plugin: 'sela', key: 'isContextToasted' } as const, false)

const MAX_AGE_HOURS = 48
const MAX_SHOWN = 3
const CONTEXT_TOAST_PERCENT = 30
export const RESUME_COMMAND = 'sela-resume'

// All handoffs in .notes, newest first.
async function findHandoffs($: EngineInterface): Promise<Handoff[]> {
  const cwd = await $.session.cwd()
  const notes = `${cwd}/.notes`
  if (!(await $.fs.exists(notes))) return []

  const now = await $.clock.now()
  const found: Handoff[] = []
  for (const entry of await $.fs.list(notes)) {
    if (entry.kind !== 'dir') continue
    const file = `${notes}/${entry.name}/HANDOFF.md`
    if (!(await $.fs.exists(file))) continue
    const { mtimeMs } = await $.fs.stat(file)
    const hasPlan = await $.fs.exists(`${notes}/${entry.name}/PLAN.md`)
    found.push({ folder: entry.name, hasPlan, ageHours: (now - mtimeMs) / 3_600_000 })
  }
  return found.sort((a, b) => a.ageHours - b.ageHours)
}

function resumePrompt(handoff: Handoff) {
  const files = handoff.hasPlan
    ? `.notes/${handoff.folder}/PLAN.md and .notes/${handoff.folder}/HANDOFF.md`
    : `.notes/${handoff.folder}/HANDOFF.md`
  return `Read ${files}. Summarize the current state and what you plan to do from "Next step", then wait for my OK before you change anything.`
}

function ageText(hours: number) {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min ago`
  if (hours <= MAX_AGE_HOURS) return `${Math.round(hours)} h ago`
  return `${Math.round(hours / 24)} d ago`
}

export async function onSessionStart($: EngineInterface, source: string) {
  await update($, isContextToasted, () => false)
  const isFresh = source === 'startup' || source === 'clear'
  const found = isFresh ? await findHandoffs($).catch(() => []) : []
  await update($, isListOpen, () => false)
  await update($, offer, () => (found.length > 0 ? found : null))
}

// Claude Desktop starts the session only with the first message, so the
// offer from session start is closed at once. This command opens it again.
export async function showHandoffs($: EngineInterface) {
  const found = await findHandoffs($)
  await update($, isListOpen, () => false)
  await update($, offer, () => (found.length > 0 ? found : null))
  return {
    text:
      found.length > 0
        ? `Found ${found.length} handoff(s). Pick one above the prompt.`
        : 'No handoffs in .notes.',
  }
}

// The first prompt of the session closes the offer, whatever it was.
export async function closeOffer($: EngineInterface, command?: string) {
  if (command === RESUME_COMMAND) return
  if (await read($, offer)) await update($, offer, () => null)
}

export async function checkContext($: EngineInterface, percent: number) {
  if (percent >= CONTEXT_TOAST_PERCENT && !(await read($, isContextToasted))) {
    await update($, isContextToasted, () => true)
    $.ui.toast(`Context ${Math.round(percent)}% full · time to hand off (/sela:handoff)`)
  }
}

async function resume($: EngineInterface, handoff: Handoff) {
  await update($, offer, () => null)
  await $.prompt.submit({ text: resumePrompt(handoff) })
}

export async function handoffRow($: EngineInterface, e: RenderInput<'AbovePrompt'>) {
  const handoffs = await read($, offer)
  if (!handoffs) return null
  const { Box, Button, Text } = $.ui.resolve(e)
  const isOpen = await read($, isListOpen)
  const shown = isOpen ? handoffs : handoffs.slice(0, MAX_SHOWN)
  const hide = <Button key="hide" label="Hide" onPress={() => update($, offer, () => null)} />
  const showAll =
    shown.length < handoffs.length ? (
      <Button key="all" label={`All (${handoffs.length})`} onPress={() => update($, isListOpen, () => true)} />
    ) : null

  return (
    <Box key="handoff" flexDirection="column" rowGap="xs">
      <Box>
        <Text color="green">{isOpen ? "Handoffs (newest first): " : 'Continue: '}</Text>
        {showAll}
        {showAll ? <Text> </Text> : null}
        {hide}
      </Box>
      {shown.map(handoff => (
        <Box key={handoff.folder}>
          <Button key={`resume-${handoff.folder}`} label="Resume" onPress={() => resume($, handoff)} />
          <Text> .notes/{handoff.folder} </Text>
          <Text dimColor>({ageText(handoff.ageHours)})</Text>
        </Box>
      ))}
    </Box>
  )
}
