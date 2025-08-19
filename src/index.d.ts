export interface MesonToOpenOptions {
  id: string
  addr?: string
  tokens?: string[]
  amount?: number
  provider?: {
    request: (params: { method: string, params?: any[] }) => Promise<any>
  }
  [key: string]: any
}

export interface MesonToOptions {
  host?: string | 'testnet'
  onCompleted?: (data?: any) => void
  onSwapAttempted?: (data?: any) => void
}

export type MesonToTarget = 'iframe' | 'popup' | Element

export default class MesonTo {
  readonly window: Window
  host: string
  
  constructor(window: Window, opts?: MesonToOptions)
  
  open(appIdOrTo: string | MesonToOpenOptions, target?: MesonToTarget): Promise<void>
  
  dispose(): void
  
  __postMessageToMesonTo(payload: any): void
  __returnResult(id: string, result?: any, error?: any): void
  __triggerEvent(event: string, params?: any): void
  
  private _onCompleted: ((data?: any) => void) | null
  private _onSwapAttempted: ((data?: any) => void) | null
  private _promise: Promise<void> | null
  private _mesonToWindow: Window | null
  private _dispose?: () => void
  
  closer?: {
    blocked: boolean
    block(blocked?: boolean): void
    close(force?: boolean): void
  }
}