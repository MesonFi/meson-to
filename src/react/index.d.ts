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

export interface UseMesonToCallbacks {
  onCompleted: (data?: any) => void
}

export declare function useMesonTo(
  window: Window | null, 
  host?: string, 
  callbacks?: UseMesonToCallbacks
): MesonTo | undefined

export interface MesonToButtonProps {
  options: {
    to: string;
    from?: ('chain' | 'cex')[]
    recipient?: string
    amount?: number
    tokens?: string[]
    provider?: {
      request: (params: { method: string, params?: any[] }) => Promise<any>
    }
  }
  onCompleted: (data?: any) => void
  className?: string
  children?: React.ReactNode
  __host?: string
}

export declare const MesonToButton: React.FC<MesonToButtonProps>
