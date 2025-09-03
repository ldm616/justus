import { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, Send, Edit2, Trash2, Tag, MessageCircle, Type } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';
import { formatTimeAgo } from '../utils/timeFormat';
import { useToast } from '../contexts/ToastContext';

interface Photo {
  id: string;
  user_id: string;
  photo_url: string;
  medium_url?: string;
  thumbnail_url: string;
  created_at: string;
  upload_date: string;
  caption?: string | null;
  username?: string | null;
  avatar_url?: string | null;
}

interface Comment {
  id: string;
  photo_id: string;
  user_id: string;
  comment: string;
  edited_at: string | null;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
}

interface PhotoTag {
  id: string;
  photo_id: string;
  tag: string;
  created_by: string;
  created_at: string;
}

interface PhotoModalProps {
  photo: Photo;
  onClose: () => void;
  onReplace?: () => void;
  uploading?: boolean;
  isToday?: boolean;
}

export default function PhotoModal({ photo, onClose, onReplace, uploading = false, isToday = false }: PhotoModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [tags, setTags] = useState<PhotoTag[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionText, setCaptionText] = useState(photo.caption || '');
  const [activeSection, setActiveSection] = useState<'caption' | 'comments' | 'tags' | null>('caption');
  const { profile } = useUser();
  const { showToast } = useToast();
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (photo) {
      loadComments();
      loadTags();
      setCaptionText(photo.caption || '');
    }
  }, [photo, profile]);

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('photo_comments')
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
        .eq('photo_id', photo.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const loadTags = async () => {
    try {
      const { data, error } = await supabase
        .from('photo_tags')
        .select('*')
        .eq('photo_id', photo.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTags(data || []);
    } catch (err) {
      console.error('Error loading tags:', err);
    }
  };


  const handleAddComment = async () => {
    if (!newComment.trim() || submittingComment || !profile) return;

    setSubmittingComment(true);
    try {
      const { data, error } = await supabase
        .from('photo_comments')
        .insert({
          photo_id: photo.id,
          user_id: profile.id,
          comment: newComment.trim()
        })
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;
      
      setComments([data, ...comments]);
      setNewComment('');
      showToast('Comment added');
    } catch (err: any) {
      console.error('Error adding comment:', err);
      showToast(err.message || 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editingCommentText.trim()) return;

    try {
      const { error } = await supabase
        .from('photo_comments')
        .update({
          comment: editingCommentText.trim(),
          edited_at: new Date().toISOString()
        })
        .eq('id', commentId);

      if (error) throw error;

      setComments(comments.map(c => 
        c.id === commentId 
          ? { ...c, comment: editingCommentText.trim(), edited_at: new Date().toISOString() }
          : c
      ));
      setEditingCommentId(null);
      setEditingCommentText('');
      showToast('Comment updated');
    } catch (err) {
      console.error('Error editing comment:', err);
      showToast('Failed to edit comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure?')) return;

    try {
      const { error } = await supabase
        .from('photo_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      setComments(comments.filter(c => c.id !== commentId));
      showToast('Comment deleted');
    } catch (err) {
      console.error('Error deleting comment:', err);
      showToast('Failed to delete comment');
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim() || !profile) return;
    
    const formattedTag = newTag.trim().startsWith('#') ? newTag.trim() : `#${newTag.trim()}`;
    
    try {
      const { data, error } = await supabase
        .from('photo_tags')
        .insert({
          photo_id: photo.id,
          tag: formattedTag,
          created_by: profile.id
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          showToast('Tag already exists');
        } else {
          throw error;
        }
        return;
      }
      
      setTags([...tags, data]);
      setNewTag('');
      setShowTagInput(false);
      showToast('Tag added');
    } catch (err) {
      console.error('Error adding tag:', err);
      showToast('Failed to add tag');
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from('photo_tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;
      
      setTags(tags.filter(t => t.id !== tagId));
      showToast('Tag removed');
    } catch (err) {
      console.error('Error removing tag:', err);
      showToast('Failed to remove tag');
    }
  };

  const handleUpdateCaption = async () => {
    if (!profile || profile.id !== photo.user_id) return;
    
    try {
      const { error } = await supabase
        .from('photos')
        .update({ caption: captionText.trim() || null })
        .eq('id', photo.id);

      if (error) throw error;
      
      // Update the photo object and state
      photo.caption = captionText.trim() || null;
      setCaptionText(captionText.trim());
      setEditingCaption(false);
      showToast('Caption updated');
    } catch (err) {
      console.error('Error updating caption:', err);
      showToast('Failed to update caption');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
      <div className="w-full md:w-[650px] max-h-[90vh] overflow-y-auto">
        {/* Close button - fixed position */}
        <button
          onClick={onClose}
          className="fixed top-4 right-4 text-white hover:text-gray-300 z-50 bg-black/50 rounded-full p-2"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Image Section - fixed 650x650 on desktop, full width on mobile */}
        <div className="relative bg-black w-full md:w-[650px] md:h-[650px]">
          <img
            src={photo.medium_url || photo.photo_url}
            alt={`Photo by ${photo.username || 'User'}`}
            className="w-full h-full object-contain"
            onLoad={() => setImageLoaded(true)}
          />
        </div>

        {/* Action Bar - directly below image */}
        {imageLoaded && (
          <div className="bg-gray-900 border-t border-gray-800">
            <div className="flex justify-around py-3">
              {/* Caption Button */}
              <button
                onClick={() => setActiveSection(activeSection === 'caption' ? null : 'caption')}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                  activeSection === 'caption' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Type className="w-5 h-5" />
                <span className="text-xs">Caption</span>
              </button>

              {/* Comments Button */}
              <button
                onClick={() => setActiveSection(activeSection === 'comments' ? null : 'comments')}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                  activeSection === 'comments' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-xs">Comments</span>
              </button>

              {/* Tags Button */}
              <button
                onClick={() => setActiveSection(activeSection === 'tags' ? null : 'tags')}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                  activeSection === 'tags' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Tag className="w-5 h-5" />
                <span className="text-xs">Tags</span>
              </button>

              {/* Replace Button - only show for today's photo by owner */}
              {profile && photo.user_id === profile.id && isToday && onReplace && (
                <button
                  onClick={onReplace}
                  disabled={uploading}
                  className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  <RefreshCw className={`w-5 h-5 ${uploading ? 'animate-spin' : ''}`} />
                  <span className="text-xs">Replace</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content Section - shows based on activeSection */}
        {imageLoaded && activeSection && (
          <div className="bg-gray-900 w-full md:w-[650px]">
            {/* Photo Info Header */}
            <div className="px-4 py-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                {photo.avatar_url ? (
                  <img 
                    src={photo.avatar_url} 
                    alt={photo.username || 'User'}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-700" />
                )}
                <div>
                  <p className="font-medium">{photo.username || 'Anonymous'}</p>
                  <p className="text-xs text-gray-400">{formatTimeAgo(photo.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Dynamic Content Based on Active Section */}
            <div className="p-4">
              {/* Caption Section */}
              {activeSection === 'caption' && (
                <div>
                  {editingCaption ? (
                    <div>
                      <textarea
                        value={captionText}
                        onChange={(e) => setCaptionText(e.target.value)}
                        className="w-full bg-gray-800 rounded px-3 py-2 text-sm resize-none"
                        rows={3}
                        placeholder="Add a caption..."
                        autoFocus
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={handleUpdateCaption}
                          className="text-xs bg-blue-600 px-3 py-1 rounded hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingCaption(false);
                            setCaptionText(photo.caption || '');
                          }}
                          className="text-xs bg-gray-700 px-3 py-1 rounded hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {captionText ? (
                        <div className="flex items-start gap-2">
                          <p className="text-sm flex-1">{captionText}</p>
                          {profile?.id === photo.user_id && (
                            <button
                              onClick={() => setEditingCaption(true)}
                              className="p-1 hover:bg-gray-800 rounded"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ) : profile?.id === photo.user_id ? (
                        <button
                          onClick={() => setEditingCaption(true)}
                          className="text-gray-400 hover:text-white text-sm"
                        >
                          Add a caption...
                        </button>
                      ) : (
                        <p className="text-gray-400 text-sm">No caption</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tags Section */}
              {activeSection === 'tags' && (
                <div>
                  {profile?.id === photo.user_id && (
                    <div className="mb-3">
                      {showTagInput ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTag();
                              } else if (e.key === 'Escape') {
                                setShowTagInput(false);
                                setNewTag('');
                              }
                            }}
                            placeholder="Add tag (e.g. #vacation)"
                            className="flex-1 bg-gray-800 rounded px-3 py-2 text-sm"
                            autoFocus
                          />
                          <button
                            onClick={handleAddTag}
                            className="text-xs bg-blue-600 px-3 py-1 rounded hover:bg-blue-700"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => {
                              setShowTagInput(false);
                              setNewTag('');
                            }}
                            className="text-xs bg-gray-700 px-3 py-1 rounded hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowTagInput(true)}
                          className="text-gray-400 hover:text-white text-sm"
                        >
                          + Add tag
                        </button>
                      )}
                    </div>
                  )}
                  
                  {tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {tags.map(tag => (
                        <span key={tag.id} className="inline-flex items-center text-sm bg-gray-800 px-3 py-1 rounded-full group">
                          <span>{tag.tag}</span>
                          {profile?.id === photo.user_id && (
                            <button
                              onClick={() => handleRemoveTag(tag.id)}
                              className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">No tags</p>
                  )}
                </div>
              )}

              {/* Comments Section */}
              {activeSection === 'comments' && (
                <div>
                  {loadingComments ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto" />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4 mb-4 max-h-[300px] overflow-y-auto">
                        {comments.length === 0 ? (
                          <p className="text-gray-400 text-center py-8">No comments yet</p>
                        ) : (
                          comments.map(comment => (
                            <div key={comment.id} className="flex gap-3">
                    {comment.profiles?.avatar_url ? (
                      <img 
                        src={comment.profiles.avatar_url}
                        className="w-8 h-8 rounded-full flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <span className="font-medium text-sm">
                            {comment.profiles?.username || 'Anonymous'}
                          </span>
                          <span className="text-xs text-gray-400 ml-2">
                            {formatTimeAgo(comment.created_at)}
                            {comment.edited_at && ' (edited)'}
                          </span>
                        </div>
                        
                        {comment.user_id === profile?.id && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditingCommentText(comment.comment);
                              }}
                              className="p-1 hover:bg-gray-800 rounded"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="p-1 hover:bg-gray-800 rounded text-red-500"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {editingCommentId === comment.id ? (
                        <div className="mt-1">
                          <textarea
                            value={editingCommentText}
                            onChange={(e) => setEditingCommentText(e.target.value)}
                            className="w-full bg-gray-800 rounded px-2 py-1 text-sm resize-none"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex gap-2 mt-1">
                            <button
                              onClick={() => handleEditComment(comment.id)}
                              className="text-xs bg-blue-600 px-2 py-1 rounded hover:bg-blue-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingCommentId(null);
                                setEditingCommentText('');
                              }}
                              className="text-xs bg-gray-700 px-2 py-1 rounded hover:bg-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm mt-1">{comment.comment}</p>
                      )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    {/* Add Comment */}
                    <div className="pt-3 border-t border-gray-800">
                      <div className="flex gap-2">
                        <textarea
                          ref={commentInputRef}
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAddComment();
                            }
                          }}
                          placeholder="Add a comment..."
                          className="flex-1 bg-gray-800 rounded-lg px-3 py-2 resize-none text-sm"
                          rows={2}
                        />
                        <button
                          onClick={handleAddComment}
                          disabled={!newComment.trim() || submittingComment}
                          className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}