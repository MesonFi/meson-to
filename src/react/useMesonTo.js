import React from 'react'

import MesonTo from '../MesonTo'

export default function useMesonTo (window, host, callbacks = {}) {
  const [meson2, setMeson2] = React.useState()

  const { onCompleted, onSwapAttempted } = callbacks

  if (typeof onCompleted !== 'function') {
    throw new Error('callbacks.onCompleted is not a valid function')
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
      meson2._onSwapAttempted = onSwapAttempted
    }
  }, [meson2, onCompleted, onSwapAttempted])

  return meson2
}
