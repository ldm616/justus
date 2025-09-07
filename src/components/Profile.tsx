import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, LogOut, Save, ArrowLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { auth } from '../lib/auth'

export default function Profile() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [username, setUsername] = useState(profile?.username || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image must be less than 2MB')
        return
      }
      
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      let newAvatarUrl = profile?.avatar_url

      // Upload new avatar if selected
      if (avatarFile && user) {
        newAvatarUrl = await auth.uploadAvatar(user.id, avatarFile)
      }

      // Update profile
      if (user) {
        await auth.updateProfile(user.id, {
          username: username.trim(),
          avatar_url: newAvatarUrl
        })
        setSuccess('Profile updated successfully!')
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Home
            </button>
            
            <h1 className="text-xl font-bold">Profile Settings</h1>
            
            <button
              onClick={handleLogout}
              className="btn-secondary flex items-center gap-2"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="card p-8">
          <h2 className="text-2xl font-bold mb-6">Edit Profile</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-900/50 border border-red-500 text-red-400 rounded-lg">
                {error}
              </div>
            )}
            
            {success && (
              <div className="p-3 bg-green-900/50 border border-green-500 text-green-400 rounded-lg">
                {success}
              </div>
            )}

            {/* Avatar Upload */}
            <div className="flex flex-col items-center">
              <label className="relative cursor-pointer group">
                <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden border-4 border-gray-600">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-12 h-12 text-gray-400" />
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                    <Camera className="w-10 h-10 text-white" />
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
              <p className="text-sm text-gray-400 mt-3">Click to change profile photo</p>
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                className="input w-full bg-gray-800 cursor-not-allowed opacity-75"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input w-full"
                required
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9_]+"
                title="Username can only contain letters, numbers, and underscores"
              />
            </div>

            {/* Account Info */}
            <div className="pt-4 border-t border-gray-700">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Account Information</h3>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-500">User ID:</span> <span className="font-mono text-xs">{user?.id}</span></p>
                <p><span className="text-gray-500">Account created:</span> {user?.created_at && new Date(user.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}