import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface UserProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  familyId: string | null;
}

interface UserContextType {
  profile: UserProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  profile: null,
  loading: true,
  refresh: async () => {},
});

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  

  useEffect(() => {
    fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, _session) => {
      // Any auth change → reload profile
      fetchProfile();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setProfile(null);
        return;
      }
      
      // Load profile directly from profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', session.user.id)
        .single();
      
      if (error) throw error;
      
      // Get family membership separately
      const { data: membership } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', session.user.id)
        .maybeSingle();
      
      setProfile({
        id: session.user.id,
        username: data?.username || null,
        avatar_url: data?.avatar_url || null,
        familyId: membership?.family_id || null
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };


  return (
    <UserContext.Provider value={{ profile, loading, refresh: fetchProfile }}>
      {loading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        children
      )}
    </UserContext.Provider>
  );
};