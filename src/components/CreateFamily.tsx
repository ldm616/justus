import { useState } from 'react'
import { Users } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface CreateFamilyProps {
  onFamilyCreated: () => void
}

export default function CreateFamily({ onFamilyCreated }: CreateFamilyProps) {
  const [familyName, setFamilyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Not authenticated')
      }

      // Create the family
      const { data: family, error: familyError } = await supabase
        .from('families')
        .insert({
          name: familyName.trim(),
          created_by: user.id
        })
        .select()
        .single()

      if (familyError) {
        if (familyError.message?.includes('duplicate') || familyError.message?.includes('violates')) {
          throw new Error('You already have a family')
        }
        throw familyError
      }

      onFamilyCreated()
    } catch (err: any) {
      setError(err.message || 'Failed to create family')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="card p-8">
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center mb-2">Create Your Family</h2>
        <p className="text-gray-400 text-center mb-6">
          Start sharing moments with your loved ones
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-900/50 border border-red-500 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              Family Name
            </label>
            <input
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              className="input w-full"
              placeholder="The Smith Family"
              required
              minLength={2}
              maxLength={50}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Family'}
          </button>
        </form>
      </div>
    </div>
  )
}