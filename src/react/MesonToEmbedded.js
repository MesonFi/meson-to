import React from 'react'
import PropTypes from 'prop-types'

import { SUPPORTED_CHAINS } from './constants'
import useMesonTo from './useMesonTo'
import styles from './meson2.module.css'

export default function MesonToEmbedded ({ appId, to, host, onCompleted: _onCompleted, onSwapAttempted, SuccessInfo }) {
  const ref = React.useRef()
  const [shouldOpen, setShouldOpen] = React.useState(true)
  const [data, setData] = React.useState()

  const onCompleted = React.useCallback(data => {
    setShouldOpen(false)
    setData(data)
    _onCompleted(data)
  }, [_onCompleted])

  const meson2 = useMesonTo(window, host, { onCompleted, onSwapAttempted })

  React.useEffect(() => {
    if (!ref.current || !meson2 || !shouldOpen) {
      return
    }

    meson2.open(to || appId, ref.current)
      .then(() => {})
      .catch(err => {
        console.warn(err)
      })
  }, [ref.current, meson2, shouldOpen, appId, to])

  const successInfo = React.useMemo(() => {
    if (!data) {
      return null
    }

    const onNewTransfer = () => {
      setData()
      setShouldOpen(true)
    }

    if (SuccessInfo) {
      return <SuccessInfo data={data} onNewTransfer={onNewTransfer} />
    } else {
      return (
        <div>
          {JSON.stringify(data)}
          <button onClick={onNewTransfer}>new transfer</button>
        </div>
      )
    }
  }, [data, SuccessInfo])

  return (
    <div className={styles['meson2-container']}>
      <div key='meson2' ref={ref} className={styles['meson2-wrapper']} />
      {successInfo && <div className={styles['meson2-absolute-full']}>{successInfo}</div>}
    </div>
  )
}

MesonToEmbedded.propTypes = {
  appId: PropTypes.string.isRequired,
  to: PropTypes.shape({
    id: PropTypes.string,
    addr: PropTypes.string,
    chain: PropTypes.oneOf(SUPPORTED_CHAINS),
    tokens: PropTypes.arrayOf(PropTypes.string),
    amount: PropTypes.number
  }),
  host: PropTypes.string,
  onCompleted: PropTypes.func.isRequired,
  onSwapAttempted: PropTypes.func,
  SuccessInfo: PropTypes.elementType
}

MesonToEmbedded.defaultProps = {
  appId: 'demo',
  isTestnet: false,
  onCompleted: () => {}
}
