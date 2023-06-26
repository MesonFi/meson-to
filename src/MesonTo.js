import addMessageListener from './addMessageListener'
import isMobile from './isMobile'

import './styles.scss'

const template = `
<div class='m2__wrapper m2__in-transition'>
  <div class='m2__container'>
    <div class='m2__popup'>
      <div class='m2__loading'></div>
      <iframe class='m2__iframe'></iframe>
      <div class='m2__close'>×</div>
    </div>
    <div class='m2__bar'></div>
  </div>
</div>
`

export default class MesonTo {
  constructor (window, opts = {}) {
    Object.defineProperty(this, 'window', {
      value: window,
      writable: false
    })
    if (!opts.host) {
      this.host = 'https://meson.to'
    } else if (opts.host === 'testnet') {
      this.host = 'https://testnet.meson.to'
    } else {
      this.host = opts.host
    }
    this._onCompleted = opts.onCompleted || null
    this._onSwapAttempted = opts.onSwapAttempted || null
    this._promise = null
    this._mesonToWindow = null
  }

  async open (appIdOrTo, target) {
    if (!target) {
      target = isMobile(this.window) ? 'iframe' : 'popup'
    }

    let url
    if (typeof appIdOrTo === 'string') {
      url = `${this.host}/${appIdOrTo}`
    } else {
      const { id, addr, tokens, amount, ...rest } = appIdOrTo
      url = `${this.host}/${id}`
      if (addr) {
        url += `/${addr}`
      }
      if (tokens || amount) {
        url += `?token=${tokens?.join(',').toLowerCase() || ''}&amount=${Number(amount) || ''}`
      } else if (rest) {
        url += `?${Object.entries(rest).map(([k, v]) => `${k}=${v}`).join('&')}`
      }
    }

    if (target === 'iframe') {
      return this._openIframe(url)
    } else if (target === 'popup') {
      return this._openPopup(url)
    } else if (target) {
      return this._openIframe(url, target, true)
    } else {
      throw new Error(`Unknown open target: ${target}`)
    }
  }

  __postMessageToMesonTo (payload) {
    this._mesonToWindow?.postMessage({ source: 'app-with-meson.to', payload }, this.host)
  }

  __returnResult (id, result, error) {
    if (error) {
      this.__postMessageToMesonTo({ jsonrpc: '2.0', id, error })
    } else {
      this.__postMessageToMesonTo({ jsonrpc: '2.0', id, result })
    }
  }

  __triggerEvent (event, params) {
    this.__postMessageToMesonTo({ event, params })
  }

  _openPopup (url) {
    if (this._promise) {
      if (this._promise.focus) {
        this._promise.focus()
      }
      return this._promise
    }

    const popup = this.window.open(url, 'meson.to', 'width=375,height=640')
    this._mesonToWindow = popup
    const { dispose } = addMessageListener(this)

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

  _openIframe (url, parent = this.window.document.body, embedded = false) {
    if (this._promise) {
      return this._promise
    }

    const m2Wrapper = new DOMParser().parseFromString(template, 'text/html').body.firstElementChild
    const container = m2Wrapper.querySelector('.m2__container')

    const preventDefault = evt => evt.preventDefault()
    const stopEvent = evt => evt.stopPropagation()

    m2Wrapper.addEventListener('touchmove', preventDefault)
    container.addEventListener('click', preventDefault)
    container.addEventListener('touchmove', preventDefault)
    m2Wrapper.querySelector('.m2__popup').addEventListener('click', stopEvent)

    const iframe = m2Wrapper.querySelector('.m2__iframe')
    iframe.src = url
    iframe.onload = () => {
      const loading = m2Wrapper.querySelector('.m2__loading')
      loading.parentElement.removeChild(loading)
      iframe.onload = undefined
    }

    let pause = true
    setTimeout(() => { pause = false }, 3000)
    const onHeight = height => {
      if (pause && height < 592) {
        return
      }
      iframe.style['max-height'] = height + 'px'
    }

    const self = this
    this._promise = new Promise(resolve => {
      const bar = m2Wrapper.querySelector('.m2__bar')
      if (bar) {
        let delta = 0
        bar.ontouchstart = evt => {
          console.log('touch start')
          evt.preventDefault()
          const initY = evt.touches[0].clientY
          container.style.transition = 'none'

          bar.ontouchmove = evt => {
            console.log('touch move')
            evt.preventDefault()
            delta = evt.touches[0].clientY - initY
            if (delta < -100) {
              delta = -100
            }
            container.style.transform = `translateY(${200 + delta}px)`
          }
          bar.ontouchend = evt => {
            evt.preventDefault()
            if (delta < 100) {
              container.removeAttribute('style')
            } else {
              closer.close()
            }
            bar.ontouchmove = null
            bar.ontouchend = null
          }
        }
      }

      const closer = {
        blocked: false,
        block (blocked = true) {
          this.blocked = blocked
        },
        close () {
          container.removeAttribute('style')
          if (this.blocked) {
            self.__triggerEvent('close-blocked')
            return
          }

          m2Wrapper.classList.add('m2__in-transition')
          setTimeout(() => {
            parent.removeChild(m2Wrapper)
          }, 400)
          self._promise = null

          dispose()
          resolve()
        }
      }

      parent.appendChild(m2Wrapper)
      m2Wrapper.addEventListener('click', () => closer.close())
      m2Wrapper.querySelector('.m2__close').addEventListener('click', () => closer.close())

      this._mesonToWindow = iframe.contentWindow
      const { dispose } = addMessageListener(this, onHeight, closer)

      setTimeout(() => {
        m2Wrapper.classList.remove('m2__in-transition')
      }, 50)
    })

    return this._promise
  }

  dispose () {
    // TODO
  }
}
