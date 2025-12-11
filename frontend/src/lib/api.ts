// API Base URL - taken directly from environment (or fallback for local dev).
// Only trims trailing slashes; does not add or alter the protocol.
const rawApiBase =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8000/api';
const API_BASE_URL = rawApiBase.trim().replace(/\/+$/, '');

export interface Sound {
  id: number;
  name: string;
  description?: string;
  image_url?: string;
  mp3_url?: string;
  tags: Tag[];
  uploaded_by: string | { id: number; username: string; email: string };
  created_at: string;
  updated_at?: string;
  is_favorite?: boolean;
  favorite_count?: number;
  comments?: Comment[];
}

export interface Tag {
  id: number;
  name: string;
}

export interface Comment {
  id: number;
  user_name: string;
  content: string;
  created_at: string;
  sound?: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
}

export interface AuthResponse {
  user: User;
  tokens: {
    access: string;
    refresh: string;
  };
}

export interface SoundsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Sound[];
}

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('accessToken');
};

// API request helper
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getAuthToken();
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'An error occurred' }));
    throw new Error(error.error || error.detail || `HTTP error! status: ${response.status}`);
  }

  // Handle 204 No Content (empty response)
  if (response.status === 204) {
    return null as T;
  }

  // Check if response has content to parse
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const text = await response.text();
    if (text.trim() === '') {
      return null as T;
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      return null as T;
    }
  }

  return null as T;
};

// Auth API
export const authAPI = {
  register: async (username: string, email: string, password: string): Promise<AuthResponse> => {
    return apiRequest<AuthResponse>('/auth/register/', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  },

  login: async (usernameOrEmail: string, password: string): Promise<AuthResponse> => {
    return apiRequest<AuthResponse>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ 
        username: usernameOrEmail,
        password 
      }),
    });
  },

  loginWithEmail: async (email: string, password: string): Promise<AuthResponse> => {
    return apiRequest<AuthResponse>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  logout: async (refreshToken: string): Promise<void> => {
    await apiRequest('/auth/logout/', {
      method: 'POST',
      body: JSON.stringify({ refresh: refreshToken }),
    });
  },

  me: async (): Promise<User> => {
    return apiRequest<User>('/auth/me/');
  },

  refreshToken: async (refreshToken: string): Promise<{ access: string }> => {
    return apiRequest<{ access: string }>('/auth/token/refresh/', {
      method: 'POST',
      body: JSON.stringify({ refresh: refreshToken }),
    });
  },
};

// Sounds API
export const soundsAPI = {
  list: async (params?: { tag?: string; search?: string }): Promise<SoundsResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.tag) queryParams.append('tag', params.tag);
    if (params?.search) queryParams.append('search', params.search);
    
    const query = queryParams.toString();
    return apiRequest<SoundsResponse>(`/sounds/${query ? `?${query}` : ''}`);
  },

  get: async (id: number): Promise<Sound> => {
    return apiRequest<Sound>(`/sounds/${id}/`);
  },

  create: async (formData: FormData): Promise<Sound> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/sounds/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'An error occurred' }));
      throw new Error(error.error || error.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  update: async (id: number, formData: FormData): Promise<Sound> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/sounds/${id}/`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'An error occurred' }));
      throw new Error(error.error || error.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    await apiRequest(`/sounds/${id}/`, {
      method: 'DELETE',
    });
  },
};

// Tags API
export const tagsAPI = {
  list: async (): Promise<Tag[]> => {
    const response = await apiRequest<Tag[] | { results: Tag[] }>('/tags/');
    if (Array.isArray(response)) {
      return response;
    }
    if (response && typeof response === 'object' && 'results' in response) {
      return (response as { results: Tag[] }).results || [];
    }
    return [];
  },

  create: async (name: string): Promise<Tag> => {
    return apiRequest<Tag>('/tags/', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  delete: async (id: number): Promise<void> => {
    await apiRequest(`/tags/${id}/`, {
      method: 'DELETE',
    });
  },
};

// Comments API
export const commentsAPI = {
  list: async (soundId: number): Promise<Comment[]> => {
    return apiRequest<Comment[]>(`/comments/?sound=${soundId}`);
  },

  create: async (soundId: number, content: string): Promise<Comment> => {
    return apiRequest<Comment>('/comments/', {
      method: 'POST',
      body: JSON.stringify({ sound: soundId, content }),
    });
  },

  delete: async (id: number): Promise<void> => {
    await apiRequest(`/comments/${id}/`, {
      method: 'DELETE',
    });
  },
};

// Favorites API
export const favoritesAPI = {
  list: async (): Promise<Sound[]> => {
    const response = await apiRequest<any>('/favorites/');
    
    // Handle paginated response
    let favorites = [];
    if (Array.isArray(response)) {
      favorites = response;
    } else if (response && typeof response === 'object' && 'results' in response) {
      favorites = response.results || [];
    }
    
    // Extract sound_detail from each favorite object
    return favorites
      .map((fav: any) => fav.sound_detail || fav.sound)
      .filter((sound: any) => sound != null);
  },

  create: async (soundId: number): Promise<Sound> => {
    return apiRequest<Sound>('/favorites/', {
      method: 'POST',
      body: JSON.stringify({ sound: soundId }),
    });
  },

  delete: async (soundId: number): Promise<void> => {
    await apiRequest(`/favorites/remove/?sound=${soundId}`, {
      method: 'DELETE',
    });
  },
};
