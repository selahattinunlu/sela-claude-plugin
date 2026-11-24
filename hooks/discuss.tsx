import { atom, read, update } from 'claude-code'
import type { EngineInterface, RenderInput } from 'claude-code'

const isOn = atom({ plugin: 'sela', key: 'isDiscussOn' } as const, false)

export const DISCUSS_COMMAND = 'sela-discuss'
const WRITE_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit', 'Bash'])
// The /sela:comment flow runs this script; it changes no project file.
const ALLOWED_BASH = /^python3 -I \S*\/tools\/comment\/comment\.py\s*$/

const REASON =
  'Discussion mode is on: do not change files or run commands that write. ' +
  'Talk the idea through instead. The user turns it off with /sela-discuss.'

export async function toggleDiscuss($: EngineInterface) {
  const now = !(await read($, isOn))
  await update($, isOn, () => now)
  return now
    ? {
        text: 'Discussion mode on. Claude will not change files.',
        context: [`${REASON} Until it is turned off, only discuss, read and answer.`],
      }
    : {
        text: 'Discussion mode off.',
        context: ['Discussion mode is off. You may change files again when the user asks.'],
      }
}

// Returns a deny reason when discussion mode blocks this call, else null.
export async function discussBlocks(
  $: EngineInterface,
  tool: string,
  input: unknown,
  isReadOnly: boolean,
) {
  if (!(await read($, isOn)) || isReadOnly) return null
  if (!WRITE_TOOLS.has(tool) && !tool.startsWith('mcp__')) return null
  const command = String((input as { command?: unknown } | undefined)?.command ?? '').trim()
  if (tool === 'Bash' && ALLOWED_BASH.test(command)) return null
  return REASON
}

export async function discussRow($: EngineInterface, e: RenderInput<'AbovePrompt'>) {
  if (!(await read($, isOn))) return null
  const { Box, Text } = $.ui.resolve(e)
  return (
    <Box key="discuss">
      <Text color="cyan">Discussion mode on · file changes off · /sela-discuss to turn off</Text>
    </Box>
  )
}
