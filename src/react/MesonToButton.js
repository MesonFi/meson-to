import React from 'react'
import classnames from 'classnames'
import PropTypes from 'prop-types'

import { SUPPORTED_CHAINS } from './constants'
import useMesonTo from './useMesonTo'
import styles from './meson2.module.css'
import Spinner from './spinner.svg'

export default function MesonToButton ({ appId, to, host, target, onCompleted, onSwapAttempted, className, children }) {
  const [pending, setPending] = React.useState(false)
  const ref = React.useRef()

  const meson2 = useMesonTo(window, host, { onCompleted, onSwapAttempted })

  const onClick = React.useCallback((_target = target) => {
    setPending(true)
    meson2?.open(to || appId, _target)
      .then(() => setPending(false))
      .catch(err => {
        console.warn(err)
        setPending(false)
      })
  }, [meson2, appId, target, to])

  React.useEffect(() => {
    if (target === 'parent' && meson2 && ref.current) {
      const parent = ref.current.parentElement
      onClick(parent)
    }
  }, [meson2, target])

  let btnChildren
  if (typeof children === 'string') {
    btnChildren = children
  } else if (children) {
    btnChildren = React.cloneElement(children, { pending })
  } else {
    btnChildren = pending ? 'Waiting for meson' : 'Deposit with meson'
  }

  if (target === 'parent') {
    return (
      <div ref={ref} className={className}>
        {pending && <Spinner className={styles['button-spinner']} />}
        {btnChildren}
      </div>
    )
  }

  return (
    <button
      onClick={() => onClick()}
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
  target: PropTypes.oneOfType([
    PropTypes.oneOf(['iframe', 'popup', 'parent']),
    PropTypes.instanceOf(Element)
  ]),
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
