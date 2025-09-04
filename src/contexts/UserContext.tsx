import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface UserProfile {
  id: string;
  username: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  familyId: string | null;
  needsPasswordChange: boolean;
}

interface UserContextType {
  profile: UserProfile | null;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  profile: null,
  updateProfile: async () => {},
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
    let isMounted = true;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Fetch profile on any auth change including sign in
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
      isMounted = false;
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      // Try using the backend API first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session');
      }

      const response = await fetch('/.netlify/functions/profiles', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // Fallback to direct Supabase query if API fails
        let { data, error } = await supabase
          .from('profiles')
          .select('username, avatar_url, is_admin, family_id, needs_password_change')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (data) {
          setProfile({
            id: userId,
            username: data.username,
            avatarUrl: data.avatar_url,
            isAdmin: data.is_admin || false,
            familyId: data.family_id || null,
            needsPasswordChange: data.needs_password_change || false
          });
        }
      } else {
        const data = await response.json();
        if (data) {
          setProfile({
            id: userId,
            username: data.username,
            avatarUrl: data.avatar_url,
            isAdmin: data.is_admin || false,
            familyId: data.family_id || null,
            needsPasswordChange: data.needs_password_change || false
          });
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Try direct Supabase as final fallback
      try {
        let { data, error: fallbackError } = await supabase
          .from('profiles')
          .select('username, avatar_url, is_admin, family_id, needs_password_change')
          .eq('id', userId)
          .maybeSingle();

        if (!fallbackError && data) {
          setProfile({
            id: userId,
            username: data.username,
            avatarUrl: data.avatar_url,
            isAdmin: data.is_admin || false,
            familyId: data.family_id || null,
            needsPasswordChange: data.needs_password_change || false
          });
        } else {
          setProfile(null);
        }
      } catch (fallbackErr) {
        console.error('Fallback profile fetch also failed:', fallbackErr);
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('No session');

      let { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle();

      const dbUpdates: any = {
        updated_at: new Date().toISOString()
      };

      // Only include fields that exist in the database
      if (updates.username !== undefined) dbUpdates.username = updates.username;
      if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
      if (updates.familyId !== undefined) dbUpdates.family_id = updates.familyId;
      if (updates.needsPasswordChange !== undefined) dbUpdates.needs_password_change = updates.needsPasswordChange;

      if (!existingProfile) {
        const { error: createError } = await supabase
          .from('profiles')
          .insert([{
            id: session.user.id,
            ...dbUpdates
          }]);

        if (createError) throw createError;
      } else {
        const { error } = await supabase
          .from('profiles')
          .update(dbUpdates)
          .eq('id', session.user.id);

        if (error) throw error;
      }

      setProfile(prev => prev ? { ...prev, ...updates } : null);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  return (
    <UserContext.Provider value={{ profile, updateProfile }}>
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