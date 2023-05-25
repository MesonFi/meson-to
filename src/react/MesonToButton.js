import React from 'react'
import classnames from 'classnames'
import PropTypes from 'prop-types'

import { SUPPORTED_CHAINS } from './constants'
import useMesonTo from './useMesonTo'
import styles from './meson2.module.css'
import Spinner from './spinner.svg'

export default function MesonToButton ({ appId, to, host, type, onCompleted, onSwapAttempted, className, children }) {
  const [pending, setPending] = React.useState(false)

  const meson2 = useMesonTo(window, host, { onCompleted, onSwapAttempted })

  const onClick = React.useCallback(() => {
    setPending(true)
    meson2?.open(to || appId, type)
      .then(() => setPending(false))
      .catch(err => {
        console.warn(err)
        setPending(false)
      })
  }, [meson2, appId, type, to])

  let btnChildren
  if (typeof children === 'string') {
    btnChildren = children
  } else if (children) {
    btnChildren = React.cloneElement(children, { pending })
  } else {
    btnChildren = pending ? 'Waiting for meson' : 'Deposit with meson'
  }

  return (
    <button
      onClick={onClick}
      className={classnames(
        styles.button,
        pending && styles['button-pending'],
        className
      )}
    >
      {pending && <Spinner className={styles['button-spinner']} />}
      {btnChildren}
    </button>
  )
}

MesonToButton.propTypes = {
  appId: PropTypes.string.isRequired,
  to: PropTypes.shape({
    id: PropTypes.string,
    addr: PropTypes.string,
    chain: PropTypes.oneOf(SUPPORTED_CHAINS),
    tokens: PropTypes.arrayOf(PropTypes.string),
    amount: PropTypes.number
  }),
  host: PropTypes.string,
  type: PropTypes.string,
  onCompleted: PropTypes.func.isRequired,
  onSwapAttempted: PropTypes.func,
  className: PropTypes.string,
  children: PropTypes.node
}

MesonToButton.defaultProps = {
  appId: 'demo',
  isTestnet: false,
  onCompleted: () => {}
}
