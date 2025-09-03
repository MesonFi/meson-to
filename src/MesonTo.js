import addMessageListener from './addMessageListener'
import isMobile from './isMobile'

import './styles.scss'

const template = `
<div class='m2__wrapper m2__in-transition'>
  <div class='m2__container'>
    <div class='m2__popup'>
      <div class='m2__loading'></div>
      <iframe class='m2__iframe'></iframe>
      <div class='m2__close'>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="15" stroke="white" stroke-width="2"/>
          <path d="M22.6666 22.6665L9.3333 9.33318" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M22.6666 9.3335L9.3333 22.6668" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
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
      this.host = 'https://v2.meson.to'
    } else if (opts.host === 'testnet') {
      this.host = 'https://beta2.meson.fi'
    } else {
      this.host = opts.host
    }
    this._onCompleted = opts.onCompleted || null
    this._promise = null
    this._mesonToWindow = null
  }

  async open (options) {
    const { to, from, recipient, amount, tokens, provider } = options;

    let url = `${this.host}/${to}`
    if (recipient) {
      url += `/${recipient}`
    }
    const queryList = []
    if (Array.isArray(from) && from.length > 0) {
      queryList.push(`from=${from.join(',')}`)
    }
    if (tokens) {
      queryList.push(`token=${tokens?.join(',').toLowerCase() || ''}`)
    }
    if (amount) {
      queryList.push(`amount=${Number(amount) || ''}`)
    }
    if (provider) {
      window.__m2_ethereum = provider
    }
    if (queryList.length) {
      url += `?${queryList.join('&')}`
    }
    return this._openIframe(url)
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

  _openIframe (url, target = this.window.document.body, embedded = false) {
    if (this._promise) {
      return this._promise
    }

    const m2Wrapper = new DOMParser().parseFromString(template, 'text/html').body.firstElementChild

    this.window.targetDom = target
    this.window.m2Wrapper = m2Wrapper

    if (embedded) {
      m2Wrapper.classList.add('m2__embedded')
    }

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
    if (embedded) {
      iframe.style.height = '100%'
    }

    let pause = true
    setTimeout(() => { pause = false }, 3000)
    const onHeight = height => {
      if (embedded) {
        return
      } else if (pause && height < 560) {
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
            container.style.transform = `translateY(${delta}px)`
          }
          bar.ontouchend = evt => {
            evt.preventDefault()
            if (delta < 100) {
              container.removeAttribute('style')
            } else {
              self.closer.close()
            }
            bar.ontouchmove = null
            bar.ontouchend = null
          }
        }
      }

      self.closer = {
        blocked: false,
        block (blocked = true) {
          this.blocked = blocked
        },
        close (force) {
          container.removeAttribute('style')
          if (!force && this.blocked) {
            self.__triggerEvent('close-blocked')
            return
          }

          m2Wrapper.classList.add('m2__in-transition')
          setTimeout(() => {
            target.removeChild(m2Wrapper)
          }, 400)
          self._promise = null

          dispose()
          resolve()
        }
      }

      target.appendChild(m2Wrapper)
      m2Wrapper.addEventListener('click', () => this.closer.close())
      m2Wrapper.querySelector('.m2__close').addEventListener('click', () => this.closer.close())

      this._mesonToWindow = iframe.contentWindow
      const { dispose } = addMessageListener(this, onHeight, this.closer)

      setTimeout(() => {
        m2Wrapper.classList.remove('m2__in-transition')
      }, 50)
    })

    return this._promise
  }

  dispose () {
    if (this.closer) {
      this.closer.close()
    } else if (this._dispose) {
      this._dispose()
    }
  }
}
