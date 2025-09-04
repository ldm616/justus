import { supabase } from './supabaseClient';

class API {
  private async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No session');
    
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    };
  }

  private async request(url: string, options: RequestInit = {}) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  // Photos
  async getPhotos() {
    return this.request('/.netlify/functions/photos');
  }

  async uploadPhotoMetadata(data: any) {
    return this.request('/.netlify/functions/photos', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updatePhoto(photoId: string, data: any) {
    return this.request('/.netlify/functions/photos', {
      method: 'PUT',
      body: JSON.stringify({ photo_id: photoId, ...data })
    });
  }

  async deletePhoto(photoId: string) {
    return this.request(`/.netlify/functions/photos?photo_id=${photoId}`, {
      method: 'DELETE'
    });
  }

  // Comments
  async getComments(photoId: string) {
    return this.request(`/.netlify/functions/comments?photo_id=${photoId}`);
  }

  async addComment(photoId: string, comment: string) {
    return this.request('/.netlify/functions/comments', {
      method: 'POST',
      body: JSON.stringify({ photo_id: photoId, comment })
    });
  }

  async updateComment(commentId: string, comment: string) {
    return this.request('/.netlify/functions/comments', {
      method: 'PATCH',
      body: JSON.stringify({ comment_id: commentId, comment })
    });
  }

  async deleteComment(commentId: string) {
    return this.request(`/.netlify/functions/comments?comment_id=${commentId}`, {
      method: 'DELETE'
    });
  }

  // Profiles
  async getProfile() {
    return this.request('/.netlify/functions/profiles');
  }

  async updateProfile(data: any) {
    return this.request('/.netlify/functions/profiles', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async createProfile(username: string, avatarUrl?: string) {
    return this.request('/.netlify/functions/profiles', {
      method: 'POST',
      body: JSON.stringify({ username, avatar_url: avatarUrl })
    });
  }

  // Families
  async getFamily() {
    return this.request('/.netlify/functions/families');
  }

  async createFamily(name: string) {
    return this.request('/.netlify/functions/families', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  }

  async updateFamily(familyId: string, data: any) {
    return this.request('/.netlify/functions/families', {
      method: 'PUT',
      body: JSON.stringify({ family_id: familyId, ...data })
    });
  }

  async removeFamilyMember(memberId: string) {
    return this.request(`/.netlify/functions/families?member_id=${memberId}`, {
      method: 'DELETE'
    });
  }
}

export const api = new API();