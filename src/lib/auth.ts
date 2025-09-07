import { supabase } from './supabase'

export interface Profile {
  id: string
  username: string
  avatar_url?: string
}

export const auth = {
  async signup(email: string, password: string, username: string, avatarFile?: File) {
    let avatarUrl = null
    
    // Upload avatar if provided
    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${crypto.randomUUID()}.${fileExt}`
      const filePath = `${crypto.randomUUID()}/${fileName}`
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile)
      
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath)
        avatarUrl = urlData.publicUrl
      }
    }
    
    // Sign up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          avatar_url: avatarUrl
        }
      }
    })
    
    if (error) throw error
    return data
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
  }
}