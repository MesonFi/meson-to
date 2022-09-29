module.exports = function addMessageListener (window, target, targetOrigin, onClose) {
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

    if (data.close) {
      dispose()
      onClose()
    } else if (data.copy) {
      window.navigator.clipboard.writeText(data.copy)
    } else if (data.jsonrpc === '2.0') {
      if (data.method === 'get-origin') {
        target.postMessage({
          source: 'app',
          data: { jsonrpc: '2.0', id: data.id, result: window.origin }
        }, targetOrigin)
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
    }
  }

  window.addEventListener('message', listener)
  const dispose = () => window.removeEventListener('message', listener)

  return { dispose }
}