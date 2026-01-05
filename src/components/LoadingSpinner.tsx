interface LoadingSpinnerProps {
  size?: number
  className?: string
}

export function LoadingSpinner({ size = 48, className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Animated Logo */}
      <div className="relative">
        <img 
          src="/logo.png" 
          alt="Loading..." 
          className="animate-bounce"
          style={{ width: size, height: size }}
        />
        <div 
          className="absolute inset-0 animate-ping opacity-20"
          style={{ 
            backgroundImage: 'url(/logo.png)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center'
          }}
        />
      </div>
      
      {/* Progress Bar - same width as logo */}
      <div 
        className="h-1 bg-gray-700 rounded-full overflow-hidden relative"
        style={{ width: size }}
      >
        <div 
          className="absolute inset-0 h-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500"
          style={{ 
            animation: 'progressSlide 1.5s ease-in-out infinite',
            width: '50%'
          }}
        />
      </div>
    </div>
  )
}
