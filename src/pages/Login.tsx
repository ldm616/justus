import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const Login: React.FC = () => {
  const [email, setEmail] = useState(() => localStorage.getItem('rememberedEmail') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [rememberEmail, setRememberEmail] = useState(true);
  const navigate = useNavigate();

  const createProfile = async (userId: string, username: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .insert([{ 
          id: userId,
          username,
          avatar_url: null
        }]);
      
      if (error) throw error;
    } catch (err) {
      console.error('Error creating profile:', err);
    }
  };

  const checkInvitation = async (email: string, tempPassword: string) => {
    const { data: invitation } = await supabase
      .from('family_invitations')
      .select('*, families(name)')
      .eq('email', email.toLowerCase().trim())
      .eq('temp_password', tempPassword)
      .eq('used', false)
      .single();
      
    return invitation;
  };

  const joinFamilyFromInvitation = async (userId: string, invitation: any) => {
    // Mark invitation as used
    await supabase
      .from('family_invitations')
      .update({ used: true })
      .eq('id', invitation.id);

    // Add user to family
    await supabase
      .from('family_members')
      .insert({
        family_id: invitation.family_id,
        user_id: userId,
        role: 'member'
      });

    // Update profile with family_id and mark for password change
    await supabase
      .from('profiles')
      .update({ 
        family_id: invitation.family_id,
        needs_password_change: true 
      })
      .eq('id', userId);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({ 
        password: newPassword 
      });
      
      if (updateError) throw updateError;

      // Mark password as changed
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from('profiles')
          .update({ needs_password_change: false })
          .eq('id', session.user.id);
      }

      navigate('/');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Please enter both email and password');
      setLoading(false);
      return;
    }

    try {
      // Check if this is an invitation login
      const invitation = await checkInvitation(email, password);
      
      if (invitation && !isSignUp) {
        // This is an invitation - sign them up with the temp password
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });
        
        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            // User exists, try to sign in normally
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });
            
            if (signInError) {
              setError('Invalid credentials. If you already have an account, please use your password.');
              return;
            }
            
            // Check if they need to change password
            const { data: profile } = await supabase
              .from('profiles')
              .select('needs_password_change')
              .eq('id', signInData.user.id)
              .single();
            
            if (profile?.needs_password_change) {
              setIsChangingPassword(true);
              return;
            }
            
            navigate('/');
          } else {
            setError(signUpError.message);
          }
          return;
        }

        if (data.user) {
          // Create profile with invitation family
          await createProfile(data.user.id, email.split('@')[0].substring(0, 15));
          await joinFamilyFromInvitation(data.user.id, invitation);
          setIsChangingPassword(true);
          return;
        }
      } else if (isSignUp) {
        if (!username || username.length > 15) {
          setError('Please enter a username (max 15 characters)');
          setLoading(false);
          return;
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });
        
        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            setError('This email is already registered. Please log in instead.');
          } else {
            setError(signUpError.message);
          }
          return;
        }

        if (data.user) {
          await createProfile(data.user.id, username.trim());
        }
        
        // Save email if remember is checked
        if (rememberEmail) {
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        
        navigate('/');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            setError('Invalid email or password. Please try again.');
          } else {
            setError(signInError.message);
          }
          return;
        }
        
        // Save email if remember is checked
        if (rememberEmail) {
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        
        navigate('/');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (isChangingPassword) {
    return (
      <div className="min-h-screen flex items-start justify-center px-4 pt-[80px] md:pt-[60px]">
        <div className="max-w-sm w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-white mb-2">
              Change Your Password
            </h1>
            <p className="text-gray-400">
              Please set a new password for your account
            </p>
          </div>

          <div className="card overflow-hidden">
            <div className="p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-800/30 text-red-400 rounded-md text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="form-input"
                    placeholder="New password (min 6 chars)"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="form-input"
                    placeholder="Confirm new password"
                    required
                    minLength={6}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading && <RefreshCw className="w-5 h-5 animate-spin" />}
                  Set new password
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-start justify-center px-4 pt-[80px] md:pt-[60px]">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-white mb-2">
            JustUs
          </h1>
          <p className="text-gray-400">
            Share one photo a day with your family
          </p>
        </div>

        <div className="card overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                !isSignUp
                  ? 'text-white border-b-2 border-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                isSignUp
                  ? 'text-white border-b-2 border-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Sign up
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-800/30 text-red-400 rounded-md text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="Email"
                  required
                />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-white/50 bg-gray-800 text-white pr-10"
                  placeholder="Password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {isSignUp && (
                <div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="form-input"
                    placeholder="Username (max 15 chars)"
                    maxLength={15}
                    required
                  />
                </div>
              )}

              {!isSignUp && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="rememberEmail"
                    checked={rememberEmail}
                    onChange={(e) => setRememberEmail(e.target.checked)}
                    className="w-4 h-4 bg-gray-800 border-gray-600 rounded focus:ring-2 focus:ring-white/50 text-blue-600"
                  />
                  <label htmlFor="rememberEmail" className="ml-2 text-sm text-gray-300">
                    Remember email
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && <RefreshCw className="w-5 h-5 animate-spin" />}
                {isSignUp ? 'Sign up' : 'Log in'}
              </button>
            </form>

            {!isSignUp && (
              <div className="mt-4 text-center">
                <Link to="/reset-password" className="text-sm text-gray-400 hover:text-gray-200">
                  Forgot password?
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;