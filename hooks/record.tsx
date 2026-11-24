import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { redact, redactDeep } from './redact'

const isOn = atom({ plugin: 'sela', key: 'isRecordOn' } as const, false)

export async function recordOnStart($: EngineInterface) {
  await $.command.register({
    name: 'sela-record',
    description: 'Hide emails, money and private data on screen (for recording)',
    argumentHint: 'on|off',
  })
  $.ui.status((await read($, isOn)) ? '● REC (gizli mod)' : undefined)
}

export const registerRecord: Register = on => {
  on('command.run', { command: 'sela-record' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg !== 'on' && arg !== 'off') {
      const now = await read($, isOn)
      return { text: `Kullanım: /sela-record on|off (şu an: ${now ? 'on' : 'off'})` }
    }
    const value = arg === 'on'
    await update($, isOn, () => value)
    $.ui.status(value ? '● REC (gizli mod)' : undefined)

    return { text: value ? 'Kayıt modu açık: özel bilgiler gizleniyor.' : 'Kayıt modu kapalı.' }
  })

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) =>
    (await read($, isOn)) ? next({ ...e, props: { ...e.props, text: redact(e.props.text) } }) : next(e),
  )

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) =>
    (await read($, isOn)) ? next({ ...e, props: { ...e.props, text: redact(e.props.text) } }) : next(e),
  )

  on('ui.render', { component: 'CommandOutput' }, async ($, e, next) =>
    (await read($, isOn)) ? next({ ...e, props: { ...e.props, text: redact(e.props.text) } }) : next(e),
  )

  on('ui.render', { component: 'ToolUse' }, async ($, e, next) =>
    (await read($, isOn))
      ? next({
          ...e,
          props: {
            ...e.props,
            input: redactDeep(e.props.input),
            ...(e.props.output === undefined ? {} : { output: redactDeep(e.props.output) }),
          },
        })
      : next(e),
  )

  on('ui.render', { component: 'ToolResult' }, async ($, e, next) =>
    (await read($, isOn))
      ? next({ ...e, props: { ...e.props, output: redactDeep(e.props.output) } })
      : next(e),
  )
}
