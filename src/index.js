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
    const onClose = () => popup.close()
    const { dispose } = addMessageListener(this.window, popup, this.mesonToHost, onClose)

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

    this._promise = new Promise(resolve => {
      const doc = this.window.document
      const lgScreen = this.window.innerWidth > 440

      const modal = doc.createElement('div')
      modal.style = 'position:relative;z-index:99999;'
      
      const backdrop = doc.createElement('div')
      backdrop.style = 'position:fixed;inset:0;transition:background 0.4s;'

      const popup = doc.createElement('div')
      popup.style = 'z-index:20;position:fixed;inset:0;overflow-y:auto;display:flex;flex-direction:column;align-items:center;overflow:hidden;'
      if (lgScreen) {
        popup.style['justify-content'] = 'center'
      } else {
        popup.style['justify-content'] = 'end'
      }

      const container = doc.createElement('div')
      container.style='width:100%;max-width:440px;flex-shrink:0;background:#ecf5f0;overflow:hidden;box-shadow:0 0px 24px 0px rgb(0 0 0 / 40%)'
      if (lgScreen) {
        container.style['border-radius'] = '20px'
        container.style.opacity = '0'
        container.style.transition = 'opacity 0.25s'
      } else {
        container.style['border-radius'] = '20px 20px 0 0'
        container.style.transform = 'translateY(620px)'
        container.style.transition = 'transform 0.4s'
        container.innerHTML = `<div style='height:20px;display:flex;align-items:center;justify-content:center'><div style='background:black;height:4px;width:60px;border-radius:2px;overflow:hidden'></div></div>`
      }

      const iframe = doc.createElement('iframe')
      iframe.style = `width:100%;max-height:592px;height:calc(100vh - 120px);overflow:hidden;`
      iframe.src = `${this.mesonToHost}/${appId}`

      modal.appendChild(backdrop)
      modal.appendChild(popup)
      popup.appendChild(container)
      container.appendChild(iframe)

      const onClose = () => {
        backdrop.style.background = 'transparent'
        if (lgScreen) {
          container.style.opacity = '0'
        } else {
          container.style.transform = 'translateY(620px)'
        }
        setTimeout(() => {
          doc.body.removeChild(modal)
        }, 400)
        this._promise = null

        resolve()
      }

      modal.onclick = onClose
      doc.body.appendChild(modal)

      addMessageListener(this.window, iframe.contentWindow, this.mesonToHost, onClose)

      setTimeout(() => {
        backdrop.style.background = '#00000060'
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
