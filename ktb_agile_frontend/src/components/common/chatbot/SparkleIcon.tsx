type SparkleIconProps = {
  className?: string
}

export default function SparkleIcon({ className }: SparkleIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M10 2.5c.7 4.9 3.1 7.3 8 8-4.9.7-7.3 3.1-8 8-.7-4.9-3.1-7.3-8-8 4.9-.7 7.3-3.1 8-8Z" />
    </svg>
  )
}
