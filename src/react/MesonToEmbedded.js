import React from 'react'
import PropTypes from 'prop-types'

import { SUPPORTED_CHAINS } from './constants'
import useMesonTo from './useMesonTo'
import styles from './meson2.module.css'

export default function MesonToEmbedded ({ appId, to, host, onCompleted, SuccessInfo }) {
  const ref = React.useRef()
  const [shouldOpen, setShouldOpen] = React.useState(true)
  const [data, setData] = React.useState()

  const _onCompleted = React.useCallback(data => {
    setShouldOpen(false)
    setData(data)
    onCompleted(data)
  }, [onCompleted])

  const meson2 = useMesonTo(window, host, _onCompleted)

  React.useEffect(() => {
    if (!ref.current || !shouldOpen) {
      return
    }

    meson2.open(to ? { ...to, appId } : appId, ref.current)
      .then(() => {})
      .catch(err => {
        console.warn(err)
      })
  }, [ref.current, shouldOpen, appId, to])

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
    appId: PropTypes.string,
    addr: PropTypes.string,
    chain: PropTypes.oneOf(SUPPORTED_CHAINS),
    tokens: PropTypes.arrayOf(PropTypes.string)
  }),
  host: PropTypes.string,
  onCompleted: PropTypes.func.isRequired,
  SuccessInfo: PropTypes.elementType
}

MesonToEmbedded.defaultProps = {
  appId: 'demo',
  isTestnet: false,
  onCompleted: () => {}
}
