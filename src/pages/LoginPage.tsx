import { Layout } from '../components/Layout'

export function LoginPage() {
  const handleDiscordLogin = () => {
    window.location.href = '/.netlify/functions/auth'
  }

  return (
    <Layout>
      <div className="min-h-screen relative overflow-hidden bg-black">
        {/* Animated Background */}
        <div className="absolute inset-0">
          {/* Gradient Orbs */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-400/10 rounded-full blur-3xl animate-spin-slow"></div>
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(251,191,36,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(251,191,36,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_80%)]"></div>
          
          {/* Floating Particles */}
          <div className="absolute inset-0">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-amber-400/40 rounded-full animate-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${5 + Math.random() * 10}s`
                }}
              ></div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8 sm:py-12">
          <div className="w-full max-w-md sm:max-w-lg">
            {/* Logo Section */}
            <div className="text-center mb-8 sm:mb-12 animate-fade-in-down">
              {/* Title */}
              <div className="mb-6 sm:mb-8">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-2 sm:mb-3 bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                  The Regulators
                </h1>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-amber-500/90 tracking-wider">
                  RGR
                </h2>
              </div>

              {/* Logo Badge */}
              <div className="relative inline-block mb-6 sm:mb-8 group">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full blur-2xl opacity-50 group-hover:opacity-75 transition-opacity duration-500 animate-pulse-slow"></div>
                
                {/* Logo Container */}
                <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-yellow-600 to-amber-700 rounded-full animate-spin-slow"></div>
                  <div className="absolute inset-1 bg-black rounded-full flex items-center justify-center">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 bg-gradient-to-br from-amber-300 to-yellow-600 rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform duration-500">
                      <svg className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 text-black" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L3.5 7v10l8.5 5 8.5-5V7L12 2zm0 2.18L18.32 7.5 12 11.32 5.68 7.5 12 4.18zM5 9.5l6.5 3.82v7.5L5 17V9.5zm8.5 11.32v-7.5L20 9.5V17l-6.5 3.82z"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-amber-100/70 text-base sm:text-lg md:text-xl font-light tracking-wide">
                Arena Run
              </p>
            </div>

            {/* Login Card */}
            <div className="relative group animate-fade-in-up">
              {/* Card Glow */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
              
              {/* Card Content */}
              <div className="relative bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl rounded-2xl p-6 sm:p-8 md:p-10 border border-amber-500/20 shadow-2xl">
                <div className="text-center mb-6 sm:mb-8">
                  <h3 className="text-xl sm:text-2xl font-bold text-amber-400 mb-2">
                    Sign in with Discord
                  </h3>
                  <p className="text-gray-400 text-sm sm:text-base">
                    to access exclusive content
                  </p>
                </div>

                {/* Discord Login Button */}
                <button
                  onClick={handleDiscordLogin}
                  className="group/btn w-full relative overflow-hidden bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-bold py-4 sm:py-5 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(251,191,36,0.5)] active:scale-[0.98]"
                >
                  {/* Button Shine Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000"></div>
                  
                  <div className="relative flex items-center justify-center gap-3">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    <span className="text-base sm:text-lg">Sign in with Discord</span>
                  </div>
                </button>

                {/* Divider */}
                <div className="relative my-6 sm:my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-amber-500/20"></div>
                  </div>
                </div>

                {/* Info Text */}
                <div className="text-center space-y-2 sm:space-y-3">
                  <p className="text-gray-400 text-xs sm:text-sm">
                    Contact admin to get access permission
                  </p>
                  <p className="text-amber-500/60 text-xs">
                    Developed by <span className="text-amber-400 font-semibold">Dakheel</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Note */}
            <div className="mt-6 sm:mt-8 text-center animate-fade-in">
              <p className="text-gray-500 text-xs sm:text-sm">
                By signing in, you agree to our Terms of Service
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}