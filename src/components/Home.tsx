import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import { User } from 'lucide-react'

export default function Home() {
  const { user, profile } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="bg-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold">JustUs</h1>
            
            <Link 
              to="/profile" 
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={profile.username}
                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-600"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center border-2 border-gray-600">
                  <User size={20} />
                </div>
              )}
              <span className="font-medium">{profile?.username || 'Profile'}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card p-8">
          <div className="flex items-center gap-6 mb-6">
            {profile?.avatar_url && (
              <img 
                src={profile.avatar_url} 
                alt={profile.username}
                className="w-24 h-24 rounded-full object-cover"
              />
            )}
            <div>
              <h2 className="text-3xl font-bold">Welcome, {profile?.username || 'User'}!</h2>
              <p className="text-gray-400">You're successfully logged in.</p>
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-400">Email:</span> {user?.email}</p>
            <p><span className="text-gray-400">Username:</span> {profile?.username}</p>
            <p><span className="text-gray-400">User ID:</span> {user?.id}</p>
          </div>
        </div>
      </main>
    </div>
  )
}