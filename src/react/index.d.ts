import * as React from 'react'
import MesonTo from '@mesonfi/to'

export const SUPPORTED_CHAINS: readonly [
  'aptos',
  'arb', 
  'aurora',
  'avax',
  'beam',
  'bnb',
  'cfx',
  'cronos',
  'eth',
  'ftm',
  'movr',
  'opt',
  'polygon',
  'tron'
]

export type SupportedChain = typeof SUPPORTED_CHAINS[number]

export type MesonToTarget = 'iframe' | 'popup' | 'parent'

export interface MesonToConfig {
  id?: string
  addr?: string
  chain?: SupportedChain
  tokens?: string[]
  amount?: number
  provider?: {
    request: (params: { method: string, params?: any[] }) => Promise<any>
  }
}

export interface UseMesonToCallbacks {
  onCompleted: (data?: any) => void
  onSwapAttempted?: (data?: any) => void
}

export declare function useMesonTo(
  window: Window | null, 
  host?: string, 
  callbacks?: UseMesonToCallbacks
): MesonTo | undefined

export interface MesonToButtonProps {
  appId: string
  to?: MesonToConfig
  host?: string
  target?: MesonToTarget
  onCompleted: (data?: any) => void
  onSwapAttempted?: (data?: any) => void
  className?: string
  children?: React.ReactNode
}

export declare const MesonToButton: React.FC<MesonToButtonProps>

export interface MesonToEmbeddedProps {
  appId: string
  to?: MesonToConfig
  host?: string
  provider?: {
    request: (params: { method: string, params?: any[] }) => Promise<any>
  }
  onCompleted: (data?: any) => void
  onSwapAttempted?: (data?: any) => void
  SuccessInfo?: React.ComponentType<{
    data: any
    onNewTransfer: () => void
  }>
}

export declare const MesonToEmbedded: React.ComponentType<MesonToEmbeddedProps>