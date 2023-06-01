(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('@wallet-standard/core'), require('@mysten/sui.js')) :
  typeof define === 'function' && define.amd ? define(['@wallet-standard/core', '@mysten/sui.js'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.MesonTo = factory(global.core, global.sui_js));
})(this, (function (core, sui_js) { 'use strict';

  function addMessageListener (meson2, onHeight, closer) {
    const { window } = meson2;
    const suiWallets = core.getWallets().get();

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
            closer.block(false);
            closer.close();
          }
          result = true;
          break
        case 'check_swap': {
          if (typeof meson2._onSwapAttempted !== 'function') {
            meson2.__returnResult(payload.id, true);
            return
          }
          const [swapData, feeData, allowance] = payload.params;
          meson2._onSwapAttempted({ swapData, feeData, allowance })
            .then(result => {
              meson2.__returnResult(payload.id, result);
            })
            .catch(error => {
              meson2.__returnResult(payload.id, null, error);
            });
          return
        }
        case 'swap_completed':
          meson2._onCompleted?.(payload.params);
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

      const rpcClient = payload.method.startsWith('tron_') ? window.tronLink : window.ethereum;
      rpcClient.request({ method: payload.method, params: payload.params })
        .then(result => {
          if (payload.method === 'tron_requestAccounts') {
            result.defaultAddress = window.tronWeb.defaultAddress;
          }
          meson2.__returnResult(payload.id, result);
        })
        .catch(error => {
          meson2.__returnResult(payload.id, null, error);
        });
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

  function isMobile (window) {
    const platform = window.navigator.userAgentData?.platform || window.navigator.platform || 'unknown';
    return /(iPhone|iPad|iPod|Linux arm|Linux aar|Android)/.test(platform)
  }

  class MesonTo {
    constructor (window, opts = {}) {
      Object.defineProperty(this, 'window', {
        value: window,
        writable: false
      });
      if (!opts.host) {
        this.host = 'https://meson.to';
      } else if (opts.host === 'testnet') {
        this.host = 'https://testnet.meson.to';
      } else {
        this.host = opts.host;
      }
      this._onCompleted = opts.onCompleted || null;
      this._onSwapAttempted = opts.onSwapAttempted || null;
      this._promise = null;
      this._mesonToWindow = null;
    }

    async open (appIdOrTo, target) {
      if (!target) {
        target = isMobile(this.window) ? 'iframe' : 'popup';
      }

      let url;
      if (typeof appIdOrTo === 'string') {
        url = `${this.host}/${appIdOrTo}`;
      } else {
        const { id, addr, tokens, amount } = appIdOrTo;
        url = `${this.host}/${id}`;
        if (addr) {
          url += `/${addr}`;
        }
        if (tokens || amount) {
          url += `?token=${tokens?.join(',').toLowerCase() || ''}&amount=${Number(amount) || ''}`;
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

    _openPopup (url) {
      if (this._promise) {
        if (this._promise.focus) {
          this._promise.focus();
        }
        return this._promise
      }

      const popup = this.window.open(url, 'meson.to', 'width=375,height=640');
      this._mesonToWindow = popup;
      const { dispose } = addMessageListener(this);

      this._promise = new Promise(resolve => {
        const h = setInterval(() => {
          if (popup.closed) {
            dispose();
            clearInterval(h);
            this._promise = null;
            resolve();
          }
        }, 500);
      });
      this._promise.focus = () => popup.focus();

      return this._promise
    }

    _openIframe (url, parent = this.window.document.body, embedded = false) {
      if (this._promise) {
        return this._promise
      }

      const doc = this.window.document;
      const lgScreen = embedded || (this.window.innerWidth > 440);

      const modal = doc.createElement('div');
      modal.style = 'inset:0;z-index:99999;overflow:hidden;display:flex;flex-direction:column;';
      if (!embedded) {
        modal.style.position = 'fixed';
      }
      modal.style['justify-content'] = lgScreen ? 'center' : 'end';

      const backdrop = doc.createElement('div');
      backdrop.style = 'position:fixed;inset:0;transition:background 0.4s;';
      backdrop.ontouchmove = evt => evt.preventDefault();

      const container = doc.createElement('div');
      container.style = 'z-index:10;display:flex;flex-direction:column;align-items:center;';
      container.ontouchmove = evt => evt.preventDefault();

      if (lgScreen) {
        if (!embedded) {
          container.style.padding = '24px 0';
        }
        container.style['max-height'] = '100%';
        container.style['overflow-y'] = 'auto';
      } else {
        container.style['padding-top'] = '20px';
        container.style.transform = 'translateY(900px)';
        container.style.transition = 'transform 0.4s';
        container.onclick = evt => evt.stopPropagation();
      }

      const content = doc.createElement('div');
      content.style = 'position:relative;width:100%;max-width:440px;flex-shrink:0;';
      if (!embedded) {
        content.style.background = '#ecf5f0';
        content.style.overflow = 'hidden';
        content.style['box-shadow'] = '0 0px 24px 0px rgb(0 0 0 / 40%)';
      }

      let barWrapper;
      if (lgScreen) {
        content.style['border-radius'] = '20px';
        content.style.opacity = '0';
        content.style.transition = 'opacity 0.25s';
        if (!embedded) {
          const close = doc.createElement('div');
          close.style = 'position:absolute;top:12px;right:16px;height:24px;font-size:28px;line-height:24px;cursor:pointer;color:#0004;';
          close.onmouseover = () => { close.style.color = '#000a'; };
          close.onmouseout = () => { close.style.color = '#0004'; };
          close.innerHTML = '×';
          content.appendChild(close);
        }
      } else {
        content.style['border-radius'] = '20px 20px 0 0';
        content.style['padding-bottom'] = '200px';
        barWrapper = doc.createElement('div');
        barWrapper.style = 'z-index:100;position:absolute;top:10px;left:calc(50% - 50px);cursor:pointer;';
        barWrapper.style.transform = 'translateZ(10px)';
        const bar = doc.createElement('div');
        bar.style = 'background:#000;height:4px;width:60px;border-radius:2px;margin:20px;overflow:hidden;';
        container.appendChild(barWrapper);
        barWrapper.appendChild(bar);
      }

      const loading = doc.createElement('div');
      loading.style = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;';
      loading.innerHTML = 'Loading...';
      if (!lgScreen && !embedded) {
        loading.style.height = '592px';
      }

      const iframe = doc.createElement('iframe');
      iframe.style = 'z-index:50;width:100%;max-height:592px;overflow:hidden;border:none;transition:max-height 0.2s;';
      if (embedded) {
        iframe.style['max-height'] = '216px';
      }
      iframe.src = url;
      if (lgScreen) {
        iframe.style.height = 'calc(100vh - 48px)';
        if (!embedded) {
          iframe.style['margin-top'] = '-8px';
        }
      } else {
        if (!embedded) {
          iframe.style.height = 'calc(100vh - 80px)';
        }
      }

      iframe.onload = () => {
        content.removeChild(loading);
        iframe.onload = undefined;
        if (!lgScreen) {
          setTimeout(() => {
            iframe.style.transform = '';
          }, 100);
        }
      };

      let pause = true;
      setTimeout(() => { pause = false; }, 3000);
      const onHeight = height => {
        if (pause && height < 592) {
          return
        }
        iframe.style['max-height'] = height + 'px';
      };

      if (!embedded) {
        modal.appendChild(backdrop);
      }
      modal.appendChild(container);
      container.appendChild(content);
      content.appendChild(loading);
      content.appendChild(iframe);

      const self = this;
      this._promise = new Promise(resolve => {
        if (barWrapper) {
          let delta = 0;
          barWrapper.ontouchstart = evt => {
            evt.preventDefault();
            const initY = evt.touches[0].clientY;
            container.style.transition = 'none';

            const mask = doc.createElement('div');
            mask.style = 'position:absolute;inset:0;z-index:100;';
            mask.onclick = evt => evt.stopPropagation();
            barWrapper.ontouchend = evt => {
              if (delta < 100) {
                container.style.transition = 'transform 0.4s';
                container.style.transform = 'translateY(200px)';
              } else {
                container.style.transition = 'transform 0.2s';
                container.style['transition-timing-function'] = 'linear';
                closer.close();
                setTimeout(() => {
                  container.style['transition-timing-function'] = 'ease';
                  container.style.transition = 'transform 0.4s';
                }, 200);
              }
              evt.preventDefault();
              modal.removeChild(mask);
              barWrapper.ontouchmove = null;
              barWrapper.ontouchend = null;
            };
            barWrapper.ontouchmove = evt => {
              evt.preventDefault();
              delta = evt.touches[0].clientY - initY;
              if (delta < -100) {
                delta = -100;
              }
              container.style.transform = `translateY(${200 + delta}px)`;
            };
            modal.appendChild(mask);
          };
        }

        const closer = {
          blocked: false,
          block (blocked = true) {
            this.blocked = blocked;
          },
          close () {
            if (this.blocked) {
              self.__triggerEvent('close-blocked');
              container.style.transform = 'translateY(200px)';
              return
            }
            if (lgScreen) {
              content.style.opacity = '0';
            } else {
              container.style.transform = 'translateY(900px)';
            }
            backdrop.style.background = 'transparent';
            setTimeout(() => {
              parent.removeChild(modal);
            }, 400);
            self._promise = null;

            dispose();
            resolve();
          }
        };

        parent.appendChild(modal);
        if (!embedded) {
          modal.onclick = () => closer.close();
        }

        this._mesonToWindow = iframe.contentWindow;
        const { dispose } = addMessageListener(this, onHeight, closer);

        setTimeout(() => {
          backdrop.style.background = '#000b';
          if (lgScreen) {
            content.style.opacity = '1';
          } else {
            container.style.transform = 'translateY(200px)';
          }
        }, 0);
      });

      return this._promise
    }

    dispose () {
      // TODO
    }
  }

  return MesonTo;

}));
