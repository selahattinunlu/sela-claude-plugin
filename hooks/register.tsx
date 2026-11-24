import type { Register } from 'claude-code'

import { discussBlocks, discussRow, DISCUSS_COMMAND, toggleDiscuss } from './discuss'
import {
  checkContext,
  closeOffer,
  handoffRow,
  onSessionStart,
  RESUME_COMMAND,
  showHandoffs,
} from './handoff-resume'
import { limitRow, saveLimits } from './limit-band'
import { recordOnStart, registerRecord } from './record'

export const register: Register = (on, options) => {
  // record mode: its own command and render hooks
  registerRecord(on, options)

  on('session.start', async ($, e, next) => {
    await saveLimits($, (await $.session.usage()).rateLimits)
    await $.command.register({
      name: DISCUSS_COMMAND,
      description: 'Turn discussion mode on/off: Claude reads and talks, does not change files',
    })
    await $.command.register({
      name: RESUME_COMMAND,
      description: 'Show the handoffs in .notes',
    })
    await recordOnStart($)
    return next(e)
  })

  // Fires on startup, /clear (/new), resume and compact.
  on('classic.SessionStart', async ($, e, next) => {
    await onSessionStart($, e.source)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.submit', async ($, e, next) => {
    await closeOffer($, e.command?.name)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) await saveLimits($, e.rateLimits)
    await checkContext($, e.context.percent ?? 0)
    return next(e)
  })

  on('command.run', { command: 'sela-discuss' }, async $ => toggleDiscuss($))

  on('command.run', { command: RESUME_COMMAND }, async $ => showHandoffs($))

  on('tool.check', async ($, e, next) => {
    const reason = await discussBlocks($, e.tool, e.input, e.isReadOnly === true)
    return reason ? { decision: 'deny', reason } : next(e)
  }).catch(() => ({ decision: 'deny', reason: 'sela: discuss guard failed.' }))

  // One band above the prompt: limits, discuss mode, handoff offer.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const rows = [await limitRow($, e), await discussRow($, e), await handoffRow($, e)].filter(
      row => row !== null,
    )
    if (rows.length === 0) return next(e)
    const { Box } = $.ui.resolve(e)
    return <Box flexDirection="column">{rows}</Box>
  })
}
