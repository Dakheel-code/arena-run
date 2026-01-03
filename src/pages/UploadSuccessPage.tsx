import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { CheckCircle, Home } from 'lucide-react'

export function UploadSuccessPage() {
  const navigate = useNavigate()

  return (
    <Layout>
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          {/* Success Icon */}
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center animate-fade-in">
              <CheckCircle size={48} className="text-green-500" />
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-3xl font-bold text-white mb-4 animate-fade-in-up">
            Upload Successful!
          </h1>
          
          <p className="text-lg text-gray-300 mb-2 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Your video has been uploaded successfully.
          </p>
          
          <p className="text-base text-gray-400 mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            It is now under review by the administration team and will be published shortly.
          </p>

          {/* Return Home Button */}
          <button
            onClick={() => navigate('/')}
            className="btn-discord px-8 py-3 text-lg flex items-center gap-3 mx-auto animate-fade-in-up"
            style={{ animationDelay: '0.3s' }}
          >
            <Home size={20} />
            Return to Home
          </button>
        </div>
      </div>
    </Layout>
  )
}
