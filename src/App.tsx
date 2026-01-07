import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import { ThemeProvider } from './context/ThemeContext'
import { LanguageProvider } from './context/LanguageContext'
import { AuthGuard } from './components/AuthGuard'
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
import { UploadSuccessPage } from './pages/UploadSuccessPage'
import { UploadProgressPage } from './pages/UploadProgressPage'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/videos" element={<HomePage />} />
      <Route path="/watch/:id" element={<WatchPage />} />
      <Route path="/new-run" element={<NewRunPage />} />
      <Route path="/uploading" element={<UploadProgressPage />} />
      <Route path="/upload-success" element={<UploadSuccessPage />} />
      <Route path="/edit-video/:id" element={<EditVideoPage />} />
      
      {/* Admin routes */}
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
    <BrowserRouter basename="/app">
      <AuthProvider>
        <SettingsProvider>
          <LanguageProvider>
            <ThemeProvider>
              <AuthGuard>
                <AppRoutes />
              </AuthGuard>
            </ThemeProvider>
          </LanguageProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
