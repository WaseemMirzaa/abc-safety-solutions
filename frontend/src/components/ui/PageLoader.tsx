import { motion, useReducedMotion } from 'framer-motion'
import { Spinner } from '@/components/ui/Spinner'
import { easeOut } from '@/lib/motionPresets'

type Props = {
  className?: string
  message?: string
  minHeight?: string
}

/** Centered section loader for full-width content areas. */
export function PageLoader({ className, message = 'Loading content', minHeight = 'min-h-[42vh]' }: Props) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduce ? undefined : { opacity: 0 }}
      transition={{ duration: 0.25, ease: easeOut }}
      className={`flex flex-col items-center justify-center px-4 py-16 ${minHeight} ${className ?? ''}`}
    >
      <Spinner size="lg" label={message} caption={message} />
    </motion.div>
  )
}
