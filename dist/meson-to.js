(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('@wallet-standard/core'), require('@mysten/sui.js')) :
  typeof define === 'function' && define.amd ? define(['@wallet-standard/core', '@mysten/sui.js'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.MesonTo = factory(global.core, global.sui_js));
})(this, (function (core, sui_js) { 'use strict';

  function addMessageListener (meson2, onHeight, closer) {
    const { window } = meson2;
    const suiWallets = core.getWallets().get();
    const evmWallets = getEvmWallets(window);

    const onmessage = ({ origin, data }) => {
      if (data.isTronLink) {
        meson2.__postMessageToMesonTo(data);
      } else if (data.to === 'meson.to') {
        meson2.__triggerEvent(data.event, data.params);
      }

      if (origin !== meson2.host) {
        return
      }
      const { source, payload } = data;
      if (source !== 'meson.to') {
        return
      }

      if (payload.event) {
        const evt = new Event('meson.to');
        evt.data = { type: payload.event, data: payload.data };
        window.dispatchEvent(evt);
        return
      }

      if (payload.jsonrpc !== '2.0') {
        return
      }

      const { rdns } = payload.extra || {};
      let result;
      switch (payload.method) {
        case 'get_global': {
          const value = window[payload.params];
          if (['string', 'number'].includes(typeof value)) {
            result = value;
          } else if (typeof value === 'object') {
            result = cloneObject(value);
          } else {
            result = null;
          }
          break
        }
        case 'set_height':
          onHeight?.(payload.params);
          result = true;
          break
        case 'copy':
          window.navigator.clipboard.writeText(payload.params);
          result = true;
          break
        case 'block_close':
          closer?.block(payload.params);
          result = true;
          break
        case 'close':
          if (closer) {
            dispose();
            closer.close(true);
          }
          result = true;
          break
        case 'swap_completed':
          meson2._onCompleted?.(payload.params);
          result = true;
          break
        case 'redirect_to':
          if (closer) {
            dispose();
            closer.close(true);
          }
          window.location.href = payload.params?.redirectUrl;
          result = true;
          break
      }

      if (typeof result !== 'undefined') {
        meson2.__returnResult(payload.id, result);
        return
      }

      if (payload.method === 'trx_sign') {
        window.tronWeb?.trx.sign(...payload.params)
          .then(result => {
            meson2.__returnResult(payload.id, result);
          })
          .catch(error => {
            meson2.__returnResult(payload.id, null, error);
          });
        return
      } else if (payload.method === 'sui_get_wallets') {
        meson2.__returnResult(payload.id, suiWallets.map(w => cloneObject(Object.fromEntries(
          'accounts,chains,features,icon,name,version'.split(',').map(k => [k, w[k]])
        ))));
        return
      } else if (payload.method.startsWith('sui:')) {
        const name = payload.method.split(':')[1];
        const wallet = suiWallets.find(w => w.name === name);
        if (!wallet) {
          meson2.__returnResult(payload.id, null, new Error(`Sui wallet ${name} not registered`));
          return
        }
        const [feat, ...args] = payload.params;
        const func = feat.split(':')[1];

        if (feat === 'sui:signAndExecuteTransactionBlock') {
          args[0].transactionBlock = sui_js.TransactionBlock.from(args[0].transactionBlock);
        }
        wallet.features[feat][func](...args)
          .then(result => {
            if (feat === 'standard:connect') {
              result.accounts = result.accounts.map(a => cloneObject(Object.fromEntries(
                'address,chains,features,publicKey'.split(',').map(k => [k, a[k]])
              )));
            }
            meson2.__returnResult(payload.id, result);
          })
          .catch(error => meson2.__returnResult(payload.id, null, error));
        return
      }

      let rpcClient;
      if (payload.method.startsWith('tron_')) {
        rpcClient = window.tronLink;
      } else if (payload.method.startsWith('m2_')) {
        rpcClient = window.__m2_ethereum;
      } else {
        rpcClient = evmWallets.find(w => w.info.rdns === rdns)?.provider;
        if (!rpcClient) {
          rpcClient = window.ethereum;
        }
      }

      if (rpcClient) {
        rpcClient.request({ method: payload.method.replace(/^m2_/, ''), params: payload.params })
          .then(result => {
            if (payload.method === 'tron_requestAccounts') {
              result.defaultAddress = window.tronWeb.defaultAddress;
            }
            meson2.__returnResult(payload.id, result);
          })
          .catch(error => {
            meson2.__returnResult(payload.id, null, error);
          });
      }
    };

    const onAccountsChanged = accounts => {
      meson2.__triggerEvent('accountsChanged', accounts);
    };
    const onChainChanged = chainId => {
      meson2.__triggerEvent('chainChanged', chainId);
    };
    window.ethereum?.on('accountsChanged', onAccountsChanged);
    window.ethereum?.on('chainChanged', onChainChanged);

    const onclick = () => meson2.__triggerEvent('onclick-page');

    window.addEventListener('message', onmessage);
    window.addEventListener('click', onclick);
    const dispose = () => {
      window.removeEventListener('message', onmessage);
      window.removeEventListener('click', onclick);
      window.ethereum?.removeListener('accountsChanged', onAccountsChanged);
      window.ethereum?.removeListener('chainChanged', onChainChanged);
    };

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

  const getEvmWallets = (window) => {
    const evmWallets = [];
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('eip6963:announceProvider', event => {
        evmWallets.push(event.detail);
      });
      window.dispatchEvent(new Event('eip6963:requestProvider'));
    }
    return evmWallets
  };

  function styleInject(css, ref) {
    if ( ref === void 0 ) ref = {};
    var insertAt = ref.insertAt;

    if (!css || typeof document === 'undefined') { return; }

    var head = document.head || document.getElementsByTagName('head')[0];
    var style = document.createElement('style');
    style.type = 'text/css';

    if (insertAt === 'top') {
      if (head.firstChild) {
        head.insertBefore(style, head.firstChild);
      } else {
        head.appendChild(style);
      }
    } else {
      head.appendChild(style);
    }

    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(document.createTextNode(css));
    }
  }

  var css_248z = ".m2__wrapper {\n  position: fixed;\n  inset: 0;\n  z-index: 99999;\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  overflow: hidden;\n  background-color: rgba(0, 0, 0, 0.7333333333);\n  transition: background-color 0.4s;\n}\n.m2__wrapper.m2__in-transition {\n  background-color: transparent;\n}\n.m2__wrapper.m2__embedded {\n  position: relative;\n  width: 100%;\n  height: 100%;\n  background-color: transparent;\n}\n@media (max-width: 479px) {\n  .m2__wrapper {\n    justify-content: end;\n  }\n}\n\n.m2__container {\n  position: relative;\n  z-index: 10;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n}\n.m2__embedded > .m2__container {\n  height: 100%;\n}\n@media (min-width: 480px) {\n  :not(.m2__embedded) > .m2__container {\n    max-height: 100%;\n    padding: 24px 0;\n  }\n}\n@media (max-width: 479px) {\n  :not(.m2__embedded) > .m2__container {\n    padding-top: 20px;\n    transition: transform 0.4s;\n  }\n}\n@media (max-width: 479px) {\n  :not(.m2__embedded) > .m2__in-transition > .m2__container {\n    transform: translateY(900px);\n  }\n}\n.m2__container > .m2__popup {\n  position: relative;\n  width: 100%;\n  flex-shrink: 0;\n  opacity: 1;\n  transition: opacity 0.25s;\n}\n@media (min-width: 480px) {\n  .m2__in-transition > .m2__container > .m2__popup {\n    opacity: 0;\n  }\n}\n.m2__embedded > .m2__container > .m2__popup {\n  height: 100%;\n}\n:not(.m2__embedded) > .m2__container > .m2__popup {\n  max-width: 480px;\n  background: #ecf5f0;\n  box-shadow: 0 0px 24px 0px rgba(0, 0, 0, 0.4);\n}\n@media (min-width: 480px) {\n  .m2__container > .m2__popup {\n    border-radius: 20px;\n  }\n}\n@media (max-width: 479px) {\n  .m2__container > .m2__popup {\n    border-radius: 20px 20px 0 0;\n  }\n}\n.m2__container > .m2__popup > .m2__loading {\n  position: absolute;\n  inset: 0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n.m2__container > .m2__popup > .m2__loading::after {\n  content: \"Loading...\";\n}\n@media (max-width: 479px) {\n  :not(.m2__embedded) > .m2__container > .m2__popup > .m2__loading {\n    height: 560px;\n  }\n}\n.m2__container > .m2__popup > .m2__iframe {\n  z-index: 50;\n  width: 100%;\n  overflow: hidden;\n  border: none;\n  transition: max-height 0.2s;\n}\n@media (min-width: 480px) {\n  .m2__container > .m2__popup > .m2__iframe {\n    border-radius: 20px;\n  }\n}\n@media (max-width: 479px) {\n  .m2__container > .m2__popup > .m2__iframe {\n    border-radius: 20px 20px 0 0;\n  }\n}\n@media (min-width: 480px) {\n  :not(.m2__embedded) > .m2__container > .m2__popup > .m2__iframe {\n    max-height: 560px;\n    height: calc(100vh - 48px);\n  }\n}\n@media (max-width: 479px) {\n  :not(.m2__embedded) > .m2__container > .m2__popup > .m2__iframe {\n    max-height: 560px;\n    height: calc(100vh - 80px);\n  }\n}\n.m2__container > .m2__popup > .m2__close {\n  position: absolute;\n  top: -48px;\n  right: 0;\n  cursor: pointer;\n}\n@media (max-width: 479px) {\n  .m2__container > .m2__popup > .m2__close {\n    display: none;\n  }\n}\n@media (max-width: 479px) {\n  :not(.m2__embedded) > .m2__container > .m2__bar {\n    z-index: 100;\n    position: absolute;\n    top: 10px;\n    left: calc(50% - 50px);\n    cursor: pointer;\n    transform: translateZ(10px);\n    padding: 20px;\n  }\n  :not(.m2__embedded) > .m2__container > .m2__bar::after {\n    content: \"\";\n    display: block;\n    background: #000;\n    height: 4px;\n    width: 60px;\n    border-radius: 2px;\n    overflow: hidden;\n  }\n}";
  styleInject(css_248z);

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
`;

  class MesonTo {
    constructor (window, opts = {}) {
      Object.defineProperty(this, 'window', {
        value: window,
        writable: false
      });
      if (!opts.host) {
        this.host = 'https://m2.meson.fi';
      } else if (opts.host === 'testnet') {
        this.host = 'https://testnet.meson.to';
      } else {
        this.host = opts.host;
      }
      this._onCompleted = opts.onCompleted || null;
      this._promise = null;
      this._mesonToWindow = null;
    }

    async open (options) {
      const { to, from, recipient, amount, tokens, provider } = options;

      let url = `${this.host}/${to}`;
      if (recipient) {
        url += `/${recipient}`;
      }
      const queryList = [];
      if (Array.isArray(from) && from.length > 0) {
        queryList.push(`from=${from.join(',')}`);
      }
      if (tokens) {
        queryList.push(`token=${tokens?.join(',').toLowerCase() || ''}`);
      }
      if (amount) {
        queryList.push(`amount=${Number(amount) || ''}`);
      }
      if (provider) {
        window.__m2_ethereum = provider;
      }
      if (queryList.length) {
        url += `?${queryList.join('&')}`;
      }
      return this._openIframe(url)
    }

    __postMessageToMesonTo (payload) {
      this._mesonToWindow?.postMessage({ source: 'app-with-meson.to', payload }, this.host);
    }

    __returnResult (id, result, error) {
      if (error) {
        this.__postMessageToMesonTo({ jsonrpc: '2.0', id, error });
      } else {
        this.__postMessageToMesonTo({ jsonrpc: '2.0', id, result });
      }
    }

    __triggerEvent (event, params) {
      this.__postMessageToMesonTo({ event, params });
    }

    _openIframe (url, target = this.window.document.body, embedded = false) {
      if (this._promise) {
        return this._promise
      }

      const m2Wrapper = new DOMParser().parseFromString(template, 'text/html').body.firstElementChild;

      this.window.targetDom = target;
      this.window.m2Wrapper = m2Wrapper;

      if (embedded) {
        m2Wrapper.classList.add('m2__embedded');
      }

      const container = m2Wrapper.querySelector('.m2__container');

      const preventDefault = evt => evt.preventDefault();
      const stopEvent = evt => evt.stopPropagation();

      m2Wrapper.addEventListener('touchmove', preventDefault);
      container.addEventListener('click', preventDefault);
      container.addEventListener('touchmove', preventDefault);
      m2Wrapper.querySelector('.m2__popup').addEventListener('click', stopEvent);

      const iframe = m2Wrapper.querySelector('.m2__iframe');
      iframe.src = url;
      iframe.onload = () => {
        const loading = m2Wrapper.querySelector('.m2__loading');
        loading.parentElement.removeChild(loading);
        iframe.onload = undefined;
      };
      if (embedded) {
        iframe.style.height = '100%';
      }

      let pause = true;
      setTimeout(() => { pause = false; }, 3000);
      const onHeight = height => {
        if (embedded) {
          return
        } else if (pause && height < 560) {
          return
        }
        iframe.style['max-height'] = height + 'px';
      };

      const self = this;
      this._promise = new Promise(resolve => {
        const bar = m2Wrapper.querySelector('.m2__bar');
        if (bar) {
          let delta = 0;
          bar.ontouchstart = evt => {
            console.log('touch start');
            evt.preventDefault();
            const initY = evt.touches[0].clientY;
            container.style.transition = 'none';

            bar.ontouchmove = evt => {
              console.log('touch move');
              evt.preventDefault();
              delta = evt.touches[0].clientY - initY;
              if (delta < -100) {
                delta = -100;
              }
              container.style.transform = `translateY(${delta}px)`;
            };
            bar.ontouchend = evt => {
              evt.preventDefault();
              if (delta < 100) {
                container.removeAttribute('style');
              } else {
                self.closer.close();
              }
              bar.ontouchmove = null;
              bar.ontouchend = null;
            };
          };
        }

        self.closer = {
          blocked: false,
          block (blocked = true) {
            this.blocked = blocked;
          },
          close (force) {
            container.removeAttribute('style');
            if (!force && this.blocked) {
              self.__triggerEvent('close-blocked');
              return
            }

            m2Wrapper.classList.add('m2__in-transition');
            setTimeout(() => {
              target.removeChild(m2Wrapper);
            }, 400);
            self._promise = null;

            dispose();
            resolve();
          }
        };

        target.appendChild(m2Wrapper);
        m2Wrapper.addEventListener('click', () => this.closer.close());
        m2Wrapper.querySelector('.m2__close').addEventListener('click', () => this.closer.close());

        this._mesonToWindow = iframe.contentWindow;
        const { dispose } = addMessageListener(this, onHeight, this.closer);

        setTimeout(() => {
          m2Wrapper.classList.remove('m2__in-transition');
        }, 50);
      });

      return this._promise
    }

    dispose () {
      if (this.closer) {
        this.closer.close();
      } else if (this._dispose) {
        this._dispose();
      }
    }
  }

  return MesonTo;

}));
