import { getWallets as getSuiWallets } from '@wallet-standard/core'
import { TransactionBlock } from '@mysten/sui.js'

export default function addMessageListener (meson2, onHeight, closer) {
  const { window } = meson2
  const suiWallets = getSuiWallets().get()

  const onmessage = ({ origin, data }) => {
    if (data.isTronLink) {
      meson2.__postMessageToMesonTo(data)
    } else if (data.to === 'meson.to') {
      meson2.__triggerEvent(data.event, data.params)
    }

    if (origin !== meson2.host) {
      return
    }
    const { source, payload } = data
    if (source !== 'meson.to') {
      return
    }

    if (payload.event) {
      const evt = new Event('meson.to')
      evt.data = { type: payload.event, data: payload.data }
      window.dispatchEvent(evt)
      return
    }

    if (payload.jsonrpc !== '2.0') {
      return
    }

    let result
    switch (payload.method) {
      case 'get_global': {
        const value = window[payload.params]
        if (['string', 'number'].includes(typeof value)) {
          result = value
        } else if (typeof value === 'object') {
          result = cloneObject(value)
        } else {
          result = null
        }
        break
      }
      case 'set_height':
        onHeight?.(payload.params)
        result = true
        break
      case 'copy':
        window.navigator.clipboard.writeText(payload.params)
        result = true
        break
      case 'block_close':
        closer?.block(payload.params)
        result = true
        break
      case 'close':
        if (closer) {
          dispose()
          closer.block(false)
          closer.close()
        }
        result = true
        break
      case 'check_swap': {
        if (typeof meson2._onSwapAttempted !== 'function') {
          meson2.__returnResult(payload.id, true)
          return
        }
        const [swapData, feeData, allowance] = payload.params
        meson2._onSwapAttempted({ swapData, feeData, allowance })
          .then(result => {
            meson2.__returnResult(payload.id, result)
          })
          .catch(error => {
            meson2.__returnResult(payload.id, null, error)
          })
        return
      }
      case 'swap_completed':
        meson2._onCompleted?.(payload.params)
        result = true
        break
      default:
    }

    if (typeof result !== 'undefined') {
      meson2.__returnResult(payload.id, result)
      return
    }

    if (payload.method === 'trx_sign') {
      window.tronWeb?.trx.sign(...payload.params)
        .then(result => {
          meson2.__returnResult(payload.id, result)
        })
        .catch(error => {
          meson2.__returnResult(payload.id, null, error)
        })
      return
    } else if (payload.method === 'sui_get_wallets') {
      meson2.__returnResult(payload.id, suiWallets.map(w => cloneObject(Object.fromEntries(
        'accounts,chains,features,icon,name,version'.split(',').map(k => [k, w[k]])
      ))))
      return
    } else if (payload.method.startsWith('sui:')) {
      const name = payload.method.split(':')[1]
      const wallet = suiWallets.find(w => w.name === name)
      if (!wallet) {
        meson2.__returnResult(payload.id, null, new Error(`Sui wallet ${name} not registered`))
        return
      }
      const [feat, ...args] = payload.params
      const func = feat.split(':')[1]

      if (feat === 'sui:signAndExecuteTransactionBlock') {
        args[0].transactionBlock = TransactionBlock.from(args[0].transactionBlock)
      }
      wallet.features[feat][func](...args)
        .then(result => {
          if (feat === 'standard:connect') {
            result.accounts = result.accounts.map(a => cloneObject(Object.fromEntries(
              'address,chains,features,publicKey'.split(',').map(k => [k, a[k]])
            )))
          }
          meson2.__returnResult(payload.id, result)
        })
        .catch(error => meson2.__returnResult(payload.id, null, error))
      return
    }

    const rpcClient = payload.method.startsWith('tron_') ? window.tronLink : window.ethereum
    rpcClient.request({ method: payload.method, params: payload.params })
      .then(result => {
        if (payload.method === 'tron_requestAccounts') {
          result.defaultAddress = window.tronWeb.defaultAddress
        }
        meson2.__returnResult(payload.id, result)
      })
      .catch(error => {
        meson2.__returnResult(payload.id, null, error)
      })
  }

  const onAccountsChanged = accounts => {
    meson2.__triggerEvent('accountsChanged', accounts)
  }
  const onChainChanged = chainId => {
    meson2.__triggerEvent('chainChanged', chainId)
  }
  window.ethereum?.on('accountsChanged', onAccountsChanged)
  window.ethereum?.on('chainChanged', onChainChanged)

  const onclick = () => meson2.__triggerEvent('onclick-page')

  window.addEventListener('message', onmessage)
  window.addEventListener('click', onclick)
  const dispose = () => {
    window.removeEventListener('message', onmessage)
    window.removeEventListener('click', onclick)
    window.ethereum?.removeListener('accountsChanged', onAccountsChanged)
    window.ethereum?.removeListener('chainChanged', onChainChanged)
  }

  return { dispose }
}

function cloneObject (obj, level = 3) {
  if (!obj || !level) {
    return
  }
  if (['string', 'number'].includes(typeof obj)) {
    return obj
  } else if (Array.isArray(obj)) {
    return obj.map(item => cloneObject(item, level - 1))
  } else if (obj instanceof Uint8Array) {
    return [...obj].map(item => cloneObject(item, level - 1))
  }
  return Object.fromEntries(Object.keys(obj)
    .filter(key => !key.startsWith('_') && typeof obj[key] !== 'function')
    .map(key => [
      key,
      typeof obj[key] === 'object' ? cloneObject(obj[key], level - 1) : obj[key]
    ])
  )
}
