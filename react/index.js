import React from 'react'
import classnames from 'classnames'
import PropTypes from 'prop-types';

import MesonTo from '@mesonfi/to'

import styles from './styles.module.css'
import { ReactComponent as Spinner } from './spinner.svg'

export function MesonToButton ({ appId, onCompleted }) {
  const [pending, setPending] = React.useState(false)

  const meson2 = React.useMemo(() => new MesonTo(window), [])

  const onClick = React.useCallback(() => {
    setPending(true)
    meson2.open(appId).then(() => {
      setPending(false)
    })
  }, [meson2, appId])

  React.useEffect(() => {
    const disposable = meson2.onCompleted(onCompleted)
    return () => disposable.dispose()
  }, [meson2, onCompleted])

  const children = []
  if (pending) {
    children.push(React.createElement(Spinner, {
      key: 'spinner',
      className: styles['meson-to-button-spinner']
    }))
  }
  const btnText = pending ? 'Waiting for meson' : 'Deposit with meson'
  children.push(btnText)

  return React.createElement('button', {
    onClick,
    className: classnames(styles['meson-to-button'], pending && styles['meson-to-button-pending'])
  }, children)
}

MesonToButton.propTypes = {
  appId: PropTypes.string.isRequired,
  onCompleted: PropTypes.func
}

MesonToButton.defaultProps = {
  appId: 'example',
  onCompleted: () => {}
}