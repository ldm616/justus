import { supabase } from './supabase'

export interface Profile {
  id: string
  username: string
  avatar_url?: string
}

export interface Family {
  id: string
  name: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface FamilyMember {
  id: string
  family_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
}

export const auth = {
  async signup(email: string, password: string, username: string) {
    // Sign up the user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username
        }
      }
    })
    
    if (signUpError) throw signUpError
    if (!authData.user) throw new Error('No user returned from signup')
    
    return authData
  },
  
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    return data
  },
  
  async logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },
  
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    return data
  },
  
  async updateProfile(userId: string, updates: { username?: string; avatar_url?: string }) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },
  
  async uploadAvatar(userId: string, file: File) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${crypto.randomUUID()}.${fileExt}`
    const filePath = `${userId}/${fileName}`
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file)
    
    if (uploadError) throw uploadError
    
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)
    
    // Update profile with new avatar URL
    await auth.updateProfile(userId, { avatar_url: urlData.publicUrl })
    
    return urlData.publicUrl
  },

  async getUserFamily(userId: string) {
    // Check if user has a family they created or are a member of
    const { data, error } = await supabase
      .from('family_members')
      .select(`
        family_id,
        role,
        families (
          id,
          name,
          created_by,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .single()
    
    if (error) {
      // User doesn't have a family yet
      if (error.code === 'PGRST116') return null
      throw error
    }
    
    return data
  },

  async getFamilyMembers(familyId: string) {
    const { data, error } = await supabase
      .from('family_members')
      .select(`
        *,
        profiles (
          id,
          username,
          avatar_url
        )
      `)
      .eq('family_id', familyId)
      .order('role', { ascending: false }) // Admins first
      .order('joined_at', { ascending: true })
    
    if (error) throw error
    return data
  }
}