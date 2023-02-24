import React from 'react'

import MesonTo from '../MesonTo'

export default function useMesonTo (window, host, onCompleted) {
  const [meson2, setMeson2] = React.useState()

  if (onCompleted && typeof onCompleted !== 'function') {
    throw new Error('onCompleted is not a valid function')
  }

  React.useEffect(() => {
    const meson2 = new MesonTo(window, { host })
    setMeson2(meson2)
    return () => {
      meson2.dispose()
      setMeson2()
    }
  }, [host])

  React.useEffect(() => {
    if (meson2) {
      meson2._onCompleted = onCompleted
    }
  }, [meson2, onCompleted])

  return meson2
}
