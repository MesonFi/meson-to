import React from 'react'

import MesonTo from '../MesonTo'

export default function useMesonTo (window, host, callbacks = {}) {
  const [meson2, setMeson2] = React.useState()

  const { onCompleted } = callbacks

  if (onCompleted && typeof onCompleted !== 'function') {
    throw new Error('callbacks.onCompleted is not a valid function')
  }

  React.useEffect(() => {
    // Check if running in browser environment
    if (typeof window === 'undefined') {
      return
    }
    const meson2 = new MesonTo(window, { host })
    setMeson2(meson2)
    return () => {
      meson2.dispose()
      setMeson2()
    }
  }, [window, host])

  React.useEffect(() => {
    if (meson2) {
      meson2._onCompleted = onCompleted
    }
  }, [meson2, onCompleted])

  return meson2
}
