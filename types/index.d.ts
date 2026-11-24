export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Handoff = { folder: string; hasPlan: boolean; ageHours: number }

declare module 'claude-code' {
  interface PluginState {
    sela: {
      limits: Limit[]
      isDiscussOn: boolean
      handoffs: Handoff[] | null
      isHandoffListOpen: boolean
      isContextToasted: boolean
      isRecordOn: boolean
    }
  }
}
