import React from 'react'
import classnames from 'classnames'

import MesonTo from '@mesonfi/to'

export default function App() {
  const [pending, setPending] = React.useState(false)
  const [received, setReceived] = React.useState('')

  const meson2 = React.useMemo(() => new MesonTo(window), [])

  React.useEffect(() => {
    meson2.onCompleted(data => {
      setReceived(`Received ${data.amount / 1e6} ${data.from.token} from ${data.fromAddress} of ${data.from.chain}.`)
    })
  }, [])

  const onClick = React.useCallback(() => {
    setPending(true)
    meson2.open('example').then(() => {
      setPending(false)
    })
  }, [])

  return (
    <div className='w-full h-full bg-indigo-50'>
      <header className='flex flex-row items-center w-full px-6 py-2'>
        <img className='h-8 mr-2' src='/icon192.png' />
        <div>
          <div className='text-lg'>Web3 Application</div>
          <div className='text-xs font-light text-gray'>
            An example to show deposit with meson
          </div>
        </div>
      </header>
      <div className='flex flex-col items-center'>
        <div className='bg-white mt-24 pt-12 pb-4 px-4 text-center sm:px-12'>
          <h2 className='tracking-tight text-gray-900'>
            <div className='font-bold text-2xl mb-2'>
              Ready to dive in?
            </div>
            <div className='block text-base'>
              Experience <b>Web 3.0</b> with stablecoins.
            </div>
          </h2>
          <div className='mt-8 flex justify-center'>
            <button
              className={classnames(
                'items-center justify-center rounded-md px-3 py-2 sm:px-4 sm:py-3',
                'font-medium text-white bg-indigo-600 hover:bg-indigo-700'
              )}
            >
              Get started
            </button>
            <button
              className={classnames(
                'ml-3',
                'items-center justify-center rounded-md px-3 py-2 sm:px-4 sm:py-3',
                'font-medium bg-emerald-100',
                pending ? 'opacity-60 text-emerald-800' : 'hover:bg-emerald-200 text-emerald-600'
              )}
              onClick={onClick}
              disabled={pending}
            >
              {pending ? 'Waiting for meson...' : 'Deposit with meson'}
            </button>
          </div>
          <div className='mt-2 sm:mt-6'>{received}</div>
        </div>
      </div>
    </div>
  )
}
