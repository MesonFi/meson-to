import React from 'react'
import classnames from 'classnames'
import PropTypes from 'prop-types'

import MesonTo from '../MesonTo'
import styles from './meson2.module.css'
import Spinner from './spinner.svg'

export default function MesonToButton ({ appId, to, isTestnet, type, onCompleted, className, children }) {
  const [meson2, setMeson2] = React.useState()
  const [pending, setPending] = React.useState(false)

  React.useEffect(() => {
    setMeson2(new MesonTo(window, isTestnet))
  }, [])

  const onClick = React.useCallback(() => {
    setPending(true)
    meson2?.open(appId, type, to)
      .then(() => setPending(false))
      .catch(err => {
        console.warn(err)
        setPending(false)
      })
  }, [meson2, appId, type, to])

  React.useEffect(() => {
    if (meson2) {
      const disposable = meson2.onCompleted(onCompleted)
      return () => disposable.dispose()
    }
  }, [meson2, onCompleted])

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
  to: PropTypes.objectOf({
    addr: PropTypes.string,
    chain: PropTypes.oneOf(['arb', 'aurora', 'avax', 'bnb', 'cfx', 'eth', 'ftm', 'movr', 'opt', 'polygon', 'tron']),
    tokens: PropTypes.arrayOf(PropTypes.string)
  }),
  isTestnet: PropTypes.bool,
  type: PropTypes.string,
  onCompleted: PropTypes.func.isRequired,
  className: PropTypes.string,
  children: PropTypes.node
}

MesonToButton.defaultProps = {
  appId: 'demo',
  isTestnet: false,
  onCompleted: () => {}
}
