import React from 'react'

import MesonTo from '../MesonTo'

export default function useMesonTo (window, host, onCompleted) {
  const [meson2, setMeson2] = React.useState()

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
      const disposable = meson2.onCompleted(onCompleted)
      return () => disposable.dispose()
    }
  }, [meson2, onCompleted])

  return meson2
}
