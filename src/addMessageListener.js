export default function addMessageListener (window, target, targetOrigin, onHeight, closer) {
  const onmessage = evt => {
    if (evt.data.target === 'metamask-inpage') {
      const { data } = evt.data.data
      if (['metamask_chainChanged', 'metamask_accountsChanged'].includes(data.method)) {
        target.postMessage({ source: 'app', data }, targetOrigin)
      }
      return
    } else if (evt.data.isTronLink) {
      target.postMessage({ source: 'app', data: evt.data }, targetOrigin)
    } else if (evt.data.to === 'meson2') {
      target.postMessage({ source: 'app', data: evt.data }, targetOrigin)
    }

    if (evt.origin !== targetOrigin) {
      return
    }
    const { source, data } = evt.data
    if (source !== 'meson.to') {
      return
    }

    if (data.jsonrpc === '2.0') {
      if (data.method === 'get_global') {
        const value = window[data.params[0]]
        let result
        if (['string', 'number'].includes(typeof value)) {
          result = value
        } else if (typeof value === 'object') {
          result = cloneObject(value)
        }
        target.postMessage({
          source: 'app',
          data: { jsonrpc: '2.0', id: data.id, result }
        }, targetOrigin)
        return
      } else if (data.method === 'trx_sign') {
        window.tronWeb?.trx.sign(...data.params)
          .then(result => {
            target.postMessage({
              source: 'app',
              data: { jsonrpc: '2.0', id: data.id, result }
            }, targetOrigin)
          })
          .catch(error => {
            target.postMessage({
              source: 'app',
              data: { jsonrpc: '2.0', id: data.id, error }
            }, targetOrigin)
          })
        return
      }

      const rpcClient = data.method.startsWith('tron_') ? window.tronLink : window.ethereum
      rpcClient.request({ method: data.method, params: data.params })
        .then(result => {
          if (data.method === 'tron_requestAccounts') {
            result.defaultAddress = window.tronWeb.defaultAddress
          }
          target.postMessage({
            source: 'app',
            data: { jsonrpc: '2.0', id: data.id, result }
          }, targetOrigin)
        })
        .catch(error => {
          target.postMessage({
            source: 'app',
            data: { jsonrpc: '2.0', id: data.id, error }
          }, targetOrigin)
        })
      return
    }

    if (data.initiator === 'meson2') {
      const evt = new Event('meson2')
      evt.data = { type: data.type, data: data.data }
      window.dispatchEvent(evt)
      return
    }

    if (data.copy) {
      window.navigator.clipboard.writeText(data.copy)
    } else if (data.height && onHeight) {
      onHeight(data.height)
    } else if (closer) {
      if (data.close) {
        dispose()
        closer.block(false)
        closer.close()
      } else if (typeof data.blockClose === 'boolean') {
        closer.block(data.blockClose)
      }
    }
  }

  const onclick = () => {
    target.postMessage({
      source: 'app',
      data: { event: 'onclick-page' }
    }, targetOrigin)
  }

  window.addEventListener('message', onmessage)
  window.addEventListener('click', onclick)
  const dispose = () => {
    window.removeEventListener('message', onmessage)
    window.removeEventListener('click', onclick)
  }

  return { dispose }
}

function cloneObject (obj, level = 3) {
  if (!obj || !level) {
    return
  }
  return Object.fromEntries(Object.keys(obj)
    .filter(key => !key.startsWith('_') && typeof obj[key] !== 'function')
    .map(key => [
      key,
      typeof obj[key] === 'object' ? cloneObject(obj[key], level - 1) : obj[key]
    ])
  )
}
