interface LoadingSpinnerProps {
  size?: number
  className?: string
}

export function LoadingSpinner({ size = 48, className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`inline-block ${className}`}>
      <img 
        src="/logo.png" 
        alt="Loading..." 
        className="animate-spin"
        style={{ width: size, height: size }}
      />
    </div>
  )
}
