import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Mail, Plus, Trash2, X, Check, Edit2, Copy, Ban, UserCheck, Info } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';

interface FamilyMember {
  id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  is_suspended?: boolean;
  suspended_at?: string;
  suspended_by?: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface FamilyInvitation {
  id: string;
  email: string;
  invite_token?: string;
  used: boolean;
  created_at: string;
  accepted_at?: string;
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
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const navigate = useNavigate();
  const { profile, refresh } = useUser();
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
      // First check the database for user's family via family_members or profiles
      const { data: profileData } = await supabase
        .from('profiles')
        .select('family_id')
        .eq('id', profile.id)
        .single();

      const familyId = profileData?.family_id || profile.familyId;

      if (familyId) {
        // Load family details
        const { data: familyData, error: familyError } = await supabase
          .from('families')
          .select('*')
          .eq('id', familyId)
          .single();

        if (familyError) throw familyError;

        setFamily(familyData);
        setFamilyName(familyData.name);

        // Load family members
        const { data: membersData, error: membersError } = await supabase
          .from('family_members')
          .select('*')
          .eq('family_id', familyId);

        if (membersError) throw membersError;

        // Load profiles for each member
        const memberProfiles = await Promise.all(
          (membersData || []).map(async (member) => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', member.user_id)
              .single();
            
            return {
              ...member,
              profiles: profileData
            };
          })
        );

        setMembers(memberProfiles);

        // Check if current user is admin
        let currentUserMember = memberProfiles?.find(m => m.user_id === profile.id);
        
        // If creator is not in members, add them as admin
        if (!currentUserMember && familyData.created_by === profile.id) {
          console.log('Creator not found in members, adding as admin...');
          const { data: newMember, error: addError } = await supabase
            .from('family_members')
            .insert({
              family_id: familyId,
              user_id: profile.id,
              role: 'admin'
            })
            .select('*')
            .single();
            
          if (!addError && newMember) {
            // Get profile for new member
            const { data: profileData } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', profile.id)
              .single();
            
            const memberWithProfile = {
              ...newMember,
              profiles: profileData
            };
            
            setMembers([...memberProfiles, memberWithProfile]);
            currentUserMember = memberWithProfile;
          }
        }
        
        setIsAdmin(currentUserMember?.role === 'admin' || familyData.created_by === profile.id);

        // Load invitations if admin (show all, not just pending)
        if (currentUserMember?.role === 'admin' || familyData.created_by === profile.id) {
          const { data: invitesData, error: invitesError } = await supabase
            .from('family_invitations')
            .select('*')
            .eq('family_id', familyId)
            .order('created_at', { ascending: false });

          if (invitesError) throw invitesError;
          setInvitations(invitesData || []);
        }

        // Refresh profile context if it doesn't have familyId
        if (!profile.familyId && familyId) {
          await refresh();
        }
      } else {
        // Also check if user is already in a family via family_members
        const { data: memberData } = await supabase
          .from('family_members')
          .select('family_id')
          .eq('user_id', profile.id)
          .single();

        if (memberData?.family_id) {
          // Update profile and reload
          await supabase
            .from('profiles')
            .update({ family_id: memberData.family_id })
            .eq('id', profile.id);
          
          await refresh();
          // Reload with the family_id
          await loadFamilyData();
          return;
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

      // Create family via Netlify function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch('/.netlify/functions/families', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: familyName.trim() })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create family');
      }

      const familyData = await response.json();

      // Refresh the profile in context
      await refresh();

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

  const sendInvitation = async () => {
    if (!inviteEmail) {
      showToast('Please enter an email address');
      return;
    }

    if (members.length >= 11) { // 10 members + admin
      showToast('Maximum 10 family members allowed');
      return;
    }

    try {
      // Create invitation record with auto-generated token
      const { data: invitation, error: inviteError } = await supabase
        .from('family_invitations')
        .insert({
          family_id: family?.id,
          email: inviteEmail.toLowerCase().trim(),
          invited_by: profile?.id
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Auto-open the "How it works" section instead of showing a toast
      setShowHowItWorks(true);
      
      setInvitations([invitation, ...invitations]);
      setShowInviteModal(false);
      setInviteEmail('');
      
      // Reset copied state after 3 seconds
      setTimeout(() => setCopiedLink(null), 3000);
    } catch (err: any) {
      console.error('Error sending invitation:', err);
      showToast(err.message || 'Failed to send invitation');
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm('Are you sure?')) return;

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

  const toggleSuspendMember = async (memberId: string, currentlySuspended: boolean) => {
    const action = currentlySuspended ? 'unsuspend' : 'suspend';
    if (!confirm(`Are you sure you want to ${action} this member?`)) return;

    try {
      const { error } = await supabase.rpc('suspend_family_member', {
        p_member_id: memberId,
        p_family_id: family?.id,
        p_suspend: !currentlySuspended
      });

      if (error) throw error;

      // Update local state
      setMembers(members.map(m => 
        m.user_id === memberId 
          ? { ...m, is_suspended: !currentlySuspended }
          : m
      ));
      
      showToast(`Member ${currentlySuspended ? 'unsuspended' : 'suspended'}`);
    } catch (err: any) {
      console.error(`Error ${action}ing member:`, err);
      showToast(err.message || `Failed to ${action} member`);
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
              <h1 className="text-2xl font-bold">Create your family</h1>
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
                Create family
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
                onClick={() => setShowInviteModal(true)}
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
                    <p className="font-medium flex items-center gap-2">
                      {member.profiles?.username || 'Unknown'}
                      {member.is_suspended && (
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                          Suspended
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-400">
                      {member.role === 'admin' ? 'Admin' : 'Member'}
                    </p>
                  </div>
                </div>

                {isAdmin && member.user_id !== profile?.id && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleSuspendMember(member.user_id, member.is_suspended || false)}
                      className={`p-2 hover:bg-gray-700 rounded ${member.is_suspended ? 'text-green-500' : 'text-yellow-500'}`}
                      title={member.is_suspended ? 'Unsuspend member' : 'Suspend member'}
                    >
                      {member.is_suspended ? (
                        <UserCheck className="w-4 h-4" />
                      ) : (
                        <Ban className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => removeMember(member.user_id)}
                      className="p-2 hover:bg-gray-700 rounded text-red-500"
                      title="Remove member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {isAdmin && invitations.length > 0 && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">Invitations</h2>
            <div className="space-y-3">
              {invitations.map((invite) => (
                <div
                  key={invite.id}
                  className="p-4 bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{invite.email}</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Status: {invite.accepted_at ? (
                          <span className="text-green-500">Member joined</span>
                        ) : (
                          <span className="text-yellow-500">Magic link created</span>
                        )}
                      </p>
                    </div>
                    {!invite.accepted_at && (
                      <button
                        onClick={async () => {
                          const magicLink = `${window.location.origin}/join?token=${invite.invite_token}`;
                          try {
                            await navigator.clipboard.writeText(magicLink);
                            setCopiedLink(invite.id);
                            showToast('Magic link copied to clipboard!');
                            setTimeout(() => setCopiedLink(null), 3000);
                          } catch (err) {
                            // Fallback: select and copy manually
                            const textArea = document.createElement('textarea');
                            textArea.value = magicLink;
                            textArea.style.position = 'fixed';
                            textArea.style.opacity = '0';
                            document.body.appendChild(textArea);
                            textArea.select();
                            try {
                              document.execCommand('copy');
                              setCopiedLink(invite.id);
                              showToast('Magic link copied!');
                              setTimeout(() => setCopiedLink(null), 3000);
                            } catch {
                              showToast('Could not copy link. Please copy manually: ' + magicLink);
                            }
                            document.body.removeChild(textArea);
                          }
                        }}
                        className="btn-secondary text-sm flex items-center gap-2"
                      >
                        {copiedLink === invite.id ? (
                          <>
                            <Check className="w-4 h-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy link
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {invitations.length > 0 && (
              <button
                onClick={() => setShowHowItWorks(!showHowItWorks)}
                className="text-sm text-blue-500 hover:text-blue-400 mt-4 flex items-center gap-1"
              >
                <Info className="w-4 h-4" />
                How to use your magic links
              </button>
            )}
            {showHowItWorks && (
              <div className="bg-gray-800 rounded-lg p-4 mt-2 space-y-2">
                <p className="text-sm text-gray-300 font-medium">How magic links work:</p>
                <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                  <li>Click "Copy link" next to any pending invitation</li>
                  <li>Share the magic link by text or email with your family member</li>
                  <li>They will click the link and follow the instructions to join your family</li>
                  <li>Once they join, the invitation status will update to "Member joined"</li>
                </ol>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="modal-backdrop flex items-center justify-center p-4">
          <div className="modal-content max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Invite family member</h2>
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
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Enter the email address of your family member
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
                  disabled={!inviteEmail}
                  className="btn-primary"
                >
                  Create magic link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}