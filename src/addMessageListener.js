module.exports = function addMessageListener (window, target, targetOrigin, closer) {
  const listener = evt => {
    if (evt.data.target === 'metamask-inpage') {
      const { data } = evt.data.data
      if (['metamask_chainChanged', 'metamask_accountsChanged'].includes(data.method)) {
        target.postMessage({ source: 'app', data }, targetOrigin)
      }
      return
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
        tronWeb.trx.sign(...data.params)
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

      window.ethereum.request({ method: data.method, params: data.params })
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

    if (data.copy) {
      window.navigator.clipboard.writeText(data.copy)
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

  window.addEventListener('message', listener)
  const dispose = () => window.removeEventListener('message', listener)

  return { dispose }
}

function cloneObject(obj, level = 3) {
  if (!level) {
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
