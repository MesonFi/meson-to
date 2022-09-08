import React from 'react'

import { MesonToButton } from '@mesonfi/to/react'

export default function App(props) {
  const [received, setReceived] = React.useState('')

  const onCompleted = React.useCallback(data => {
    setReceived(`Received ${data.amount / 1e6} ${data.from.token} from ${data.fromAddress} of ${data.from.chain}.`)
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
          <MesonToButton appId='example' onCompleted={onCompleted} className='mt-8'>
            <ButtonText />
          </MesonToButton>
          <div className='mt-2 sm:mt-6'>{received}</div>
        </div>
      </div>
    </div>
  )
}

function ButtonText ({ pending }) {
  return pending ? 'Waiting for meson' : 'Deposit with meson'
}
