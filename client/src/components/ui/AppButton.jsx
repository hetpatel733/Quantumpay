import React from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import clsx from 'clsx'

const variants = {
  primary: 'bg-gradient-to-r from-primary to-primary-700 text-white shadow-lg hover:shadow-2xl',
  secondary: 'bg-secondary-100 dark:bg-gray-700 text-text-primary dark:text-white hover:bg-secondary-200 dark:hover:bg-gray-600',
  outline: 'bg-transparent border-2 border-primary text-primary hover:bg-primary/10',
  outlineWhite: 'bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary',
  inverse: 'bg-white text-primary dark:text-primary-900 shadow-lg hover:shadow-2xl',
  chip: 'bg-secondary-100 dark:bg-gray-700 text-text-primary dark:text-white hover:bg-secondary-200 dark:hover:bg-gray-600',
  ghost: 'bg-transparent text-text-primary dark:text-white hover:bg-secondary-100/50 dark:hover:bg-gray-700/50',
  hero: 'relative isolate bg-gradient-to-r from-primary to-primary-700 text-white ring-2 ring-primary/30 dark:ring-teal-400/30 shadow-xl hover:shadow-2xl rounded-full'
}

const activeVariants = {
  chip: 'bg-gradient-to-r from-primary to-primary-700 text-white shadow-lg',
}

const sizes = {
  sm: 'px-3 py-2 text-sm rounded-lg',
  md: 'px-6 py-3 rounded-xl',
  lg: 'px-10 py-4 text-lg rounded-xl',
  xl: 'px-12 py-5 text-lg rounded-full'
}

function Base({ as: As = 'button', className, children, loading, fullWidth, ...rest }) {
  return (
    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className={clsx(fullWidth && 'w-full')}>
      <As {...rest} className={className}>
        {loading ? (
          <span className="flex items-center justify-center">
            <i className="bi bi-hourglass-split animate-spin mr-2"></i>
            Loading...
          </span>
        ) : (
          children
        )}
      </As>
    </motion.div>
  )
}

const AppButton = ({
  variant = 'primary',
  size = 'md',
  to,
  href,
  target,
  rel,
  className,
  active = false,
  loading = false,
  disabled = false,
  fullWidth = false,
  type = 'button',
  children,
  ...rest
}) => {
  const variantClasses = clsx(
    variants[variant],
    active && activeVariants[variant]
  )

  const baseClasses = clsx(
    'font-semibold transition-all duration-300 focus:outline-none inline-flex items-center justify-center gap-2',
    sizes[size],
    variantClasses,
    disabled && 'opacity-50 cursor-not-allowed',
    className
  )

  if (to) {
    return (
      <Base as={Link} to={to} className={baseClasses} fullWidth={fullWidth} {...rest}>
        {children}
      </Base>
    )
  }
  if (href) {
    return (
      <Base as={'a'} href={href} target={target} rel={rel} className={baseClasses} fullWidth={fullWidth} {...rest}>
        {children}
      </Base>
    )
  }
  return (
    <Base as={'button'} type={type} disabled={disabled || loading} className={baseClasses} loading={loading} fullWidth={fullWidth} {...rest}>
      {children}
    </Base>
  )
}

export default AppButton
