import { supabase } from './supabase'

export interface Profile {
  id: string
  username: string
  avatar_url?: string
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
  }
}