class MesonTo {
  constructor (window) {
    this._ = {}
    Object.defineProperty(this._, 'window', {
      value: window,
      writable: false
    })
    this._onWindowMsg = null
    this._popup = null
    this._promise = null
  }

  open (appId) {
    if (this._popup && !this._popup.closed) {
      this._popup.focus()
      return this._promise
    }

    this._promise = new Promise(resolve => {
      this._popup = window.open(`https://meson.to/${appId}`, 'Transfer to Fluidity', 'width=360,height=640')
      const h = setInterval(() => {
        if (this._popup && this._popup.closed) {
          clearInterval(h)
          this._popup = null
          resolve()
        }
      }, 500)
    })

    return this._promise
  }

  onCompleted (callback) {
    if (this._onWindowMsg) {
      throw new Error('meson2.onCompleted listener already registered')
    } else if (typeof callback !== 'function') {
      throw new Error('callback is not a valid function')
    }

    this._onWindowMsg = this._.window.onmessage
    this._.window.onmessage = msg => {
      if (msg.data && msg.data.source === 'meson.to') {
        callback(msg.data.data)
      } else {
        this._onWindowMsg && this._onWindowMsg(msg)
      }
    }
  }
}

module.exports = MesonTo
