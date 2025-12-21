import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import { ThemeProvider } from './context/ThemeContext'
import { LanguageProvider } from './context/LanguageContext'
import { HomePage } from './pages/HomePage'
import { WatchPage } from './pages/WatchPage'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { MembersPage } from './pages/admin/MembersPage'
import { MemberProfilePage } from './pages/admin/MemberProfilePage'
import { VideosPage } from './pages/admin/VideosPage'
import { SessionsPage } from './pages/admin/SessionsPage'
import { SettingsPage } from './pages/admin/SettingsPage'
import LoginLogsPage from './pages/admin/LoginLogsPage'
import { NewRunPage } from './pages/NewRunPage'
import { EditVideoPage } from './pages/EditVideoPage'

function AppRoutes() {
  // Public access - no authentication checks needed
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/videos" element={<HomePage />} />
      <Route path="/watch/:id" element={<WatchPage />} />
      <Route path="/new-run" element={<NewRunPage />} />
      <Route path="/edit-video/:id" element={<EditVideoPage />} />
      
      {/* Admin routes - also publicly accessible */}
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/members" element={<MembersPage />} />
      <Route path="/admin/members/:discordId" element={<MemberProfilePage />} />
      <Route path="/admin/videos" element={<VideosPage />} />
      <Route path="/admin/sessions" element={<SessionsPage />} />
      <Route path="/admin/settings" element={<SettingsPage />} />
      <Route path="/admin/login-logs" element={<LoginLogsPage />} />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <LanguageProvider>
            <ThemeProvider>
              <AppRoutes />
            </ThemeProvider>
          </LanguageProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
