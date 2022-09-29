const addMessageListener = require('./addMessageListener')
const isMobile = require('./isMobile')

class MesonTo {
  constructor (window, isTestnet = false) {
    Object.defineProperty(this, 'window', {
      value: window,
      writable: false
    })
    this.mesonToHost = isTestnet ? 'https://testnet.meson.to' : 'https://meson.to'
    this._promise = null
  }

  async open (appId, type) {
    if (!type) {
      type = isMobile(this.window) ? 'iframe' : 'popup'
    }
    if (type === 'iframe') {
      return this._openIframe(appId)
    } else if (type === 'popup') {
      return this._openPopup(appId)
    } else {
      throw new Error(`Unknown open type: ${type}`)
    }
  }

  _openPopup (appId) {
    if (this._promise) {
      if (this._promise.focus) {
        this._promise.focus()
      }
      return this._promise
    }

    const popup = this.window.open(`${this.mesonToHost}/${appId}`, 'meson.to', 'width=360,height=640')
    const { dispose } = addMessageListener(this.window, popup, this.mesonToHost)

    this._promise = new Promise(resolve => {
      const h = setInterval(() => {
        if (popup.closed) {
          dispose()
          clearInterval(h)
          this._promise = null
          resolve()
        }
      }, 500)
    })
    this._promise.focus = () => popup.focus()

    return this._promise
  }

  _openIframe (appId) {
    if (this._promise) {
      return this._promise
    }

    const doc = this.window.document
    const lgScreen = this.window.innerWidth > 440

    const modal = doc.createElement('div')
    modal.style = 'position:fixed;inset:0;z-index:99999;overflow:hidden;display:flex;flex-direction:column;'
    modal.style['justify-content'] = lgScreen ? 'center' : 'end'

    const backdrop = doc.createElement('div')
    backdrop.style = 'position:fixed;inset:0;transition:background 0.4s;'

    const popup = doc.createElement('div')
    popup.style = 'z-index:20;max-height:100%;display:flex;flex-direction:column;align-items:center;'
    if (lgScreen) {
      popup.style.padding = '24px 0'
      popup.style['overflow-y'] = 'auto'
    }

    const container = doc.createElement('div')
    container.style='position:relative;width:100%;max-width:440px;flex-shrink:0;background:#ecf5f0;overflow:hidden;box-shadow:0 0px 24px 0px rgb(0 0 0 / 40%)'
    if (lgScreen) {
      container.style['border-radius'] = '20px'
      container.style.opacity = '0'
      container.style.transition = 'opacity 0.25s'
      const close = doc.createElement('div')
      close.style = 'position:absolute;top:12px;right:16px;height:24px;font-size:28px;line-height:24px;cursor:pointer;color:#0004;'
      close.onmouseover = () => { close.style.color = '#000a' }
      close.onmouseout = () => { close.style.color = '#0004' }
      close.innerHTML = '×'
      container.appendChild(close)
    } else {
      container.style['border-radius'] = '20px 20px 0 0'
      container.style.transform = 'translateY(600px)'
      container.style.transition = 'transform 0.4s'
      container.innerHTML = `<div style='position:absolute;top:8px;left:0;width:100%;display:flex;flex-direction:column;align-items:center'><div style='background:#444;height:4px;width:60px;border-radius:2px;overflow:hidden;'></div></div>`
    }

    const iframe = doc.createElement('iframe')
    iframe.style = `width:100%;max-height:600px;overflow:hidden;`
    iframe.src = `${this.mesonToHost}/${appId}`
    if (lgScreen) {
      iframe.style.height = 'calc(100vh - 48px)'
      iframe.style['min-height'] = '520px'
      iframe.style['margin-top'] = '-8px'
    } else {
      iframe.style.height = 'calc(100vh - 80px)'
    }

    modal.appendChild(backdrop)
    modal.appendChild(popup)
    popup.appendChild(container)
    container.appendChild(iframe)

    const self = this
    this._promise = new Promise(resolve => {
      const closer = {
        blocked: false,
        block(blocked = true) {
          this.blocked = blocked
        },
        close() {
          if (this.blocked) {
            iframe.contentWindow.postMessage({ source: 'app', data: { closeBlocked: true } }, self.mesonToHost)
            return
          }
          backdrop.style.background = 'transparent'
          if (lgScreen) {
            container.style.opacity = '0'
          } else {
            container.style.transform = 'translateY(600px)'
          }
          setTimeout(() => {
            doc.body.removeChild(modal)
          }, 400)
          self._promise = null

          resolve()
        }
      }

      doc.body.appendChild(modal)
      modal.onclick = () => {
        dispose()
        closer.close()
      }

      const { dispose } = addMessageListener(this.window, iframe.contentWindow, this.mesonToHost, closer)

      setTimeout(() => {
        backdrop.style.background = '#0006'
        if (lgScreen) {
          container.style.opacity = '1'
        } else {
          container.style.transform = 'translateY(0)'
        }
      }, 0)
    })

    return this._promise
  }

  onCompleted (callback) {
    if (this._callback) {
      throw new Error('meson2.onCompleted listener already registered')
    } else if (typeof callback !== 'function') {
      throw new Error('callback is not a valid function')
    }

    this._callback = ({ data }) => {
      if (data.source === 'meson.to' && data.data && data.data.swapId) {
        callback(data.data)
      }
    }

    this.window.addEventListener('message', this._callback)
    return {
      dispose: () => {
        this.window.removeEventListener('message', this._callback)
        this._callback = null
      }
    }
  }
}

module.exports = MesonTo
