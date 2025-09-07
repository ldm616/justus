import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import { User, Users, Plus, Settings } from 'lucide-react'
import { auth } from '../lib/auth'
import CreateFamily from './CreateFamily'

export default function Home() {
  const { user, profile } = useAuth()
  const [family, setFamily] = useState<any>(null)
  const [familyMembers, setFamilyMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadFamilyData()
    }
  }, [user])

  const loadFamilyData = async () => {
    if (!user) return
    
    try {
      const familyData = await auth.getUserFamily(user.id)
      
      if (familyData?.families) {
        setFamily(familyData.families)
        
        // Load family members
        const members = await auth.getFamilyMembers(familyData.families.id)
        setFamilyMembers(members || [])
      }
    } catch (error) {
      console.error('Error loading family:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFamilyCreated = () => {
    loadFamilyData()
  }

  return (
    <div className="min-h-screen">
      <header className="bg-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold">JustUs</h1>
            
            <Link 
              to="/profile" 
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              title={profile?.username || 'Profile'}
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
              <span className="font-medium">{profile?.username}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-400">Loading...</div>
          </div>
        ) : !family ? (
          <CreateFamily onFamilyCreated={handleFamilyCreated} />
        ) : (
          <div className="space-y-6">
            {/* Family Header */}
            <div className="card p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <Users className="w-8 h-8 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold">{family.name}</h2>
                    <p className="text-gray-400">
                      {familyMembers.length} {familyMembers.length === 1 ? 'member' : 'members'}
                    </p>
                  </div>
                </div>
                
                {family.created_by === user?.id && (
                  <button className="btn-secondary flex items-center gap-2">
                    <Settings size={18} />
                    Manage
                  </button>
                )}
              </div>
            </div>

            {/* Family Members */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Family Members</h3>
                {family.created_by === user?.id && (
                  <button className="btn-primary flex items-center gap-2">
                    <Plus size={18} />
                    Invite Member
                  </button>
                )}
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {familyMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                    {member.profiles?.avatar_url ? (
                      <img 
                        src={member.profiles.avatar_url}
                        alt={member.profiles.username}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                        <User size={20} />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{member.profiles?.username}</div>
                      {member.role === 'admin' && (
                        <span className="text-xs text-blue-400">Admin</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Photos Section (placeholder) */}
            <div className="card p-6">
              <h3 className="text-xl font-semibold mb-4">Recent Photos</h3>
              <div className="text-center py-12 text-gray-400">
                <p>No photos yet</p>
                <p className="text-sm mt-2">Start sharing your family moments!</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}