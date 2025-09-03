import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Mail, Lock, Plus, Trash2, X, Check, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';

interface FamilyMember {
  id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface FamilyInvitation {
  id: string;
  email: string;
  temp_password: string;
  used: boolean;
  created_at: string;
}

interface Family {
  id: string;
  name: string;
  created_by: string;
}

export default function Family() {
  const [family, setFamily] = useState<Family | null>(null);
  const [familyName, setFamilyName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [invitations, setInvitations] = useState<FamilyInvitation[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteTempPassword, setInviteTempPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const { profile } = useUser();
  const { showToast } = useToast();

  useEffect(() => {
    loadFamilyData();
  }, [profile]);

  const loadFamilyData = async () => {
    if (!profile) {
      navigate('/login');
      return;
    }

    try {
      // Check if user has a family
      if (profile.familyId) {
        // Load family details
        const { data: familyData, error: familyError } = await supabase
          .from('families')
          .select('*')
          .eq('id', profile.familyId)
          .single();

        if (familyError) throw familyError;

        setFamily(familyData);
        setFamilyName(familyData.name);

        // Load family members
        const { data: membersData, error: membersError } = await supabase
          .from('family_members')
          .select(`
            *,
            profiles:user_id (
              username,
              avatar_url
            )
          `)
          .eq('family_id', profile.familyId);

        if (membersError) throw membersError;
        setMembers(membersData || []);

        // Check if current user is admin
        const currentUserMember = membersData?.find(m => m.user_id === profile.id);
        setIsAdmin(currentUserMember?.role === 'admin');

        // Load invitations if admin
        if (currentUserMember?.role === 'admin') {
          const { data: invitesData, error: invitesError } = await supabase
            .from('family_invitations')
            .select('*')
            .eq('family_id', profile.familyId)
            .eq('used', false)
            .order('created_at', { ascending: false });

          if (invitesError) throw invitesError;
          setInvitations(invitesData || []);
        }
      }
    } catch (err) {
      console.error('Error loading family data:', err);
    } finally {
      setLoading(false);
    }
  };

  const createFamily = async () => {
    if (!familyName.trim()) {
      showToast('Please enter a family name');
      return;
    }

    try {
      setLoading(true);

      // Create family
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .insert({
          name: familyName.trim(),
          created_by: profile?.id
        })
        .select()
        .single();

      if (familyError) throw familyError;

      // Update user's profile with family_id
      await supabase
        .from('profiles')
        .update({ family_id: familyData.id })
        .eq('id', profile?.id);

      setFamily(familyData);
      setIsAdmin(true);
      showToast('Family created successfully!');
      
      // Reload to get updated data
      await loadFamilyData();
    } catch (err: any) {
      console.error('Error creating family:', err);
      showToast(err.message || 'Failed to create family');
    } finally {
      setLoading(false);
    }
  };

  const updateFamilyName = async () => {
    if (!familyName.trim() || !family) {
      showToast('Please enter a family name');
      return;
    }

    try {
      const { error } = await supabase
        .from('families')
        .update({ name: familyName.trim() })
        .eq('id', family.id);

      if (error) throw error;

      setFamily({ ...family, name: familyName.trim() });
      setIsEditingName(false);
      showToast('Family name updated');
    } catch (err: any) {
      console.error('Error updating family name:', err);
      showToast(err.message || 'Failed to update family name');
    }
  };

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setInviteTempPassword(password);
  };

  const sendInvitation = async () => {
    if (!inviteEmail || !inviteTempPassword) {
      showToast('Please enter email and temporary password');
      return;
    }

    if (members.length >= 11) { // 10 members + admin
      showToast('Maximum 10 family members allowed');
      return;
    }

    try {
      // Create invitation record
      const { data: invitation, error: inviteError } = await supabase
        .from('family_invitations')
        .insert({
          family_id: family?.id,
          email: inviteEmail.toLowerCase().trim(),
          temp_password: inviteTempPassword,
          invited_by: profile?.id
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Here you would normally send an email
      // For now, we'll just show the invite details
      showToast(`Invitation created for ${inviteEmail}`);
      
      setInvitations([invitation, ...invitations]);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteTempPassword('');
    } catch (err: any) {
      console.error('Error sending invitation:', err);
      showToast(err.message || 'Failed to send invitation');
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      // Remove from family_members
      const { error: removeError } = await supabase
        .from('family_members')
        .delete()
        .eq('user_id', memberId)
        .eq('family_id', family?.id);

      if (removeError) throw removeError;

      // Update user's profile
      await supabase
        .from('profiles')
        .update({ family_id: null })
        .eq('id', memberId);

      setMembers(members.filter(m => m.user_id !== memberId));
      showToast('Member removed');
    } catch (err: any) {
      console.error('Error removing member:', err);
      showToast(err.message || 'Failed to remove member');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!family) {
    return (
      <div className="min-h-screen pt-[80px] md:pt-[60px] px-4">
        <div className="max-w-md mx-auto mt-8">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-8 h-8 text-white" />
              <h1 className="text-2xl font-bold">Create Your Family</h1>
            </div>
            
            <p className="text-gray-400 mb-6">
              Create a family to share photos with your loved ones. You'll be able to invite up to 10 family members.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Family Name
                </label>
                <input
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="e.g., The Smith Family"
                  className="form-input"
                  maxLength={100}
                />
              </div>

              <button
                onClick={createFamily}
                disabled={loading || !familyName.trim()}
                className="w-full btn-primary"
              >
                Create Family
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-[80px] md:pt-[60px] px-4 pb-8">
      <div className="max-w-2xl mx-auto">
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-white" />
              <div>
                {isEditingName && isAdmin ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={familyName}
                      onChange={(e) => setFamilyName(e.target.value)}
                      className="form-input"
                      maxLength={100}
                      autoFocus
                    />
                    <button
                      onClick={updateFamilyName}
                      className="p-2 hover:bg-gray-800 rounded"
                    >
                      <Check className="w-5 h-5 text-green-500" />
                    </button>
                    <button
                      onClick={() => {
                        setFamilyName(family.name);
                        setIsEditingName(false);
                      }}
                      className="p-2 hover:bg-gray-800 rounded"
                    >
                      <X className="w-5 h-5 text-red-500" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">{family.name}</h1>
                    {isAdmin && (
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="p-1 hover:bg-gray-800 rounded"
                      >
                        <Edit2 className="w-4 h-4 text-gray-500" />
                      </button>
                    )}
                  </div>
                )}
                <p className="text-sm text-gray-400">
                  {members.length} member{members.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            {isAdmin && members.length < 11 && (
              <button
                onClick={() => {
                  generateTempPassword();
                  setShowInviteModal(true);
                }}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Invite
              </button>
            )}
          </div>

          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {member.profiles?.avatar_url ? (
                    <img
                      src={member.profiles.avatar_url}
                      alt={member.profiles?.username || 'Member'}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                      <Users className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">
                      {member.profiles?.username || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-400">
                      {member.role === 'admin' ? 'Admin' : 'Member'}
                    </p>
                  </div>
                </div>

                {isAdmin && member.user_id !== profile?.id && (
                  <button
                    onClick={() => removeMember(member.user_id)}
                    className="p-2 hover:bg-gray-700 rounded text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {isAdmin && invitations.length > 0 && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">Pending Invitations</h2>
            <div className="space-y-3">
              {invitations.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{invite.email}</p>
                    <p className="text-sm text-gray-400">
                      Password: {invite.temp_password}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="modal-backdrop flex items-center justify-center p-4">
          <div className="modal-content max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Invite Family Member</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="family@example.com"
                    className="form-input pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Temporary Password
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={inviteTempPassword}
                      onChange={(e) => setInviteTempPassword(e.target.value)}
                      placeholder="Enter temporary password"
                      className="form-input pl-10"
                    />
                  </div>
                  <button
                    onClick={generateTempPassword}
                    className="btn-secondary"
                  >
                    Generate
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  The invited member will need to change this on first login
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={sendInvitation}
                  disabled={!inviteEmail || !inviteTempPassword}
                  className="btn-primary"
                >
                  Send Invitation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}