import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, LogOut, X, Pencil, Check, Mail, Lock } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';

interface EditUsernameModalProps {
  currentUsername: string;
  onSave: (newUsername: string) => void;
  onClose: () => void;
}

const EditUsernameModal: React.FC<EditUsernameModalProps> = ({ currentUsername, onSave, onClose }) => {
  const [username, setUsername] = useState(currentUsername || '');
  
  return (
    <div className="modal-backdrop flex items-center justify-center p-4">
      <div className="modal-content max-w-sm w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Edit Username</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            maxLength={15}
            className="form-input"
            autoFocus
          />
          
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(username.trim())}
              disabled={!username.trim()}
              className="btn-primary disabled:bg-blue-400 flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChangeEmailModal: React.FC<{ currentEmail: string; onClose: () => void; onSuccess: () => void }> = ({ currentEmail, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update email');
    } finally {
      setLoading(false);
    }
  };

  const canSave = email && confirmEmail && email === confirmEmail && email !== currentEmail;

  return (
    <div className="modal-backdrop flex items-center justify-center p-4">
      <div className="modal-content max-w-sm w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Change Email</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Current: {currentEmail}</div>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Enter new email"
            className="form-input"
            autoFocus
          />
          <input
            type="email"
            value={confirmEmail}
            onChange={e => setConfirmEmail(e.target.value)}
            placeholder="Confirm new email"
            className="form-input"
          />
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !canSave}
              className="btn-primary disabled:bg-blue-400 flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChangePasswordModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => onClose(), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const canSave = password && confirmPassword && password === confirmPassword && password.length >= 6;

  return (
    <div className="modal-backdrop flex items-center justify-center p-4">
      <div className="modal-content max-w-sm w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Change Password</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter new password (min 6 chars)"
            className="form-input"
            autoFocus
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="form-input"
          />
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">Password updated successfully!</div>}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !canSave}
              className="btn-primary disabled:bg-blue-400 flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function Profile() {
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEditUsername, setShowEditUsername] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentEmail, setCurrentEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { profile, updateProfile } = useUser();

  const handleClose = useCallback(() => {
    navigate('/');
  }, [navigate]);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }

      setCurrentEmail(session.user.email || '');

      if (profile) {
        setUsername(profile.username || '');
        setAvatarUrl(profile.avatarUrl);
      }
      setLoading(false);
    };

    loadProfile();
  }, [navigate, profile]);

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);

    if (file.size > 2 * 1024 * 1024) {
      setError('Image size must be less than 2MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('File must be an image');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { cacheControl: '31536000', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      await updateProfile({
        avatarUrl: publicUrl
      });

      setAvatarUrl(publicUrl);
      setSuccessMessage('Avatar updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error updating avatar:', error);
      setError('Failed to update avatar. Please try again.');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8 pt-[80px] md:pt-[60px]">
        <div className="card p-6 relative">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-300"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col items-center">
            {error && (
              <div className="mb-4 p-3 rounded bg-red-900/50 text-red-400 w-full">
                {error}
              </div>
            )}
            
            {successMessage && (
              <div className="mb-4 p-3 rounded bg-green-900/50 text-green-400 w-full">
                {successMessage}
              </div>
            )}

            <div className="space-y-6 w-full">
              <div className="flex flex-col items-center">
                <label className="relative group cursor-pointer">
                  <div className="w-32 h-32 avatar-placeholder mb-4 relative shadow-md overflow-hidden">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={username || 'User'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera className="w-12 h-12 text-gray-400" />
                    )}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />
                </label>

                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-xl font-semibold text-white">
                    {username || 'Set Username'}
                  </h2>
                  <button
                    onClick={() => setShowEditUsername(true)}
                    className="p-1 hover:bg-gray-800 rounded-full"
                  >
                    <Pencil className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                <div className="text-sm text-gray-400 mb-6">
                  {currentEmail}
                </div>
              </div>

              <div className="flex flex-col space-y-3 max-w-xs mx-auto w-full">
                <button
                  className="w-full inline-flex justify-center items-center btn-secondary"
                  onClick={() => setShowChangeEmail(true)}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Change Email
                </button>
                
                <button
                  className="w-full inline-flex justify-center items-center btn-secondary"
                  onClick={() => setShowChangePassword(true)}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Change Password
                </button>
                
                <button
                  onClick={handleSignOut}
                  className="w-full inline-flex justify-center items-center btn-danger"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {showEditUsername && (
        <EditUsernameModal
          currentUsername={username}
          onSave={async (newUsername) => {
            try {
              await updateProfile({ username: newUsername });
              setUsername(newUsername);
              setSuccessMessage('Username updated successfully!');
              setTimeout(() => setSuccessMessage(null), 3000);
            } catch (err) {
              setError('Failed to update username');
            }
            setShowEditUsername(false);
          }}
          onClose={() => setShowEditUsername(false)}
        />
      )}

      {showChangeEmail && (
        <ChangeEmailModal 
          currentEmail={currentEmail} 
          onClose={() => setShowChangeEmail(false)} 
          onSuccess={() => {
            setSuccessMessage('Email update request sent! Check your inbox.');
            setTimeout(() => setSuccessMessage(null), 5000);
          }}
        />
      )}
      
      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
}

export default Profile;