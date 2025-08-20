import React from 'react'
import classnames from 'classnames'
import useMesonTo from './useMesonTo'
import styles from './meson2.module.css'
import Spinner from './spinner.svg'
import PropTypes from 'prop-types'

export default function MesonToButton ({
  options = {
    to: 'demo'
  },
  __host,
  onCompleted = () => {},
  className,
  children
}) {
  const [pending, setPending] = React.useState(false)
  const meson2 = useMesonTo(typeof window !== 'undefined' ? window : null, __host, { onCompleted })

  const onClick = React.useCallback(() => {
    setPending(true)
    meson2?.open(options)
      .then(() => setPending(false))
      .catch(err => {
        console.warn(err)
        setPending(false)
      })
  }, [meson2, options])

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
  options: PropTypes.shape({
    to: PropTypes.string,
    recipient: PropTypes.string,
    chain: PropTypes.arrayOf(PropTypes.string),
    tokens: PropTypes.arrayOf(PropTypes.string),
    amount: PropTypes.number,
    provider: PropTypes.any
  }),
  __host: PropTypes.string,
  onCompleted: PropTypes.func.isRequired,
  className: PropTypes.string,
  children: PropTypes.node
}
