import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export function FloatingNewRunButton() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // Only show for admin users
  if (!user?.is_admin) return null

  return (
    <button
      onClick={() => navigate('/new-run')}
      className="fixed bottom-20 md:bottom-6 left-6 z-40 bg-theme hover:bg-theme-dark text-white font-semibold px-4 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 group animate-fade-in"
      style={{
        animation: 'fadeIn 0.3s ease-in-out'
      }}
    >
      <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
      <span className="hidden sm:inline">New Run</span>
    </button>
  )
}
