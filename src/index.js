class MesonTo {
  constructor (window) {
    this._ = {}
    Object.defineProperty(this._, 'window', {
      value: window,
      writable: false
    })
    this._popup = null
    this._promise = null
    this._callback = null
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
    if (this._callback) {
      throw new Error('meson2.onCompleted listener already registered')
    } else if (typeof callback !== 'function') {
      throw new Error('callback is not a valid function')
    }

    this._callback = msg => {
      if (msg.data && msg.data.source === 'meson.to') {
        callback(msg.data.data)
      }
    }

    this._.window.addEventListener('message', this._callback)
    return {
      dispose: () => {
        this._.window.removeEventListener('message', this._callback)
        this._callback = null
      }
    }
  }
}

module.exports = MesonTo
