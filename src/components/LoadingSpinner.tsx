interface LoadingSpinnerProps {
  size?: number
  className?: string
}

export function LoadingSpinner({ size = 48, className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
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
      
      {/* Progress Bar */}
      <div className="w-32 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 animate-pulse" 
             style={{ 
               animation: 'shimmer 1.5s ease-in-out infinite',
               backgroundSize: '200% 100%'
             }}
        />
      </div>
    </div>
  )
}
