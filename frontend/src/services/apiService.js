const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('auth_token');
  }

  // Set authorization token
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  // Get authorization headers
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // Auth endpoints
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(email) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyToken(token) {
    return this.request('/auth/verify-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // User endpoints
  async saveUser(userData) {
    return this.request('/users/save', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getUserByEmail(email) {
    return this.request(`/users/by-email/${encodeURIComponent(email)}`);
  }

  async updateProfile(userData) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }



  // Interview endpoints
  async getUnfinishedInterview(email) {
    return this.request(`/interviews/unfinished/${encodeURIComponent(email)}`);
  }
  async createInterview(email, candidateInfo) {
    return this.request('/interviews/create', {
      method: 'POST',
      body: JSON.stringify({ email, candidateInfo }),
    });
  }

  async updateInterviewQuestion(interviewId, questionData) {
    return this.request(`/interviews/${interviewId}/question`, {
      method: 'PUT',
      body: JSON.stringify({ questionData }),
    });
  }

  async completeInterview(interviewId, allAnswers) {
    return this.request(`/interviews/${interviewId}/complete`, {
      method: 'PUT',
      body: JSON.stringify({ allAnswers }),
    });
  }

  // Complete interview but allow creating a new session from a resumed interview
  async completeInterviewWithNewSession(interviewId, allAnswers, createNewSession = false) {
    return this.request(`/interviews/${interviewId}/complete`, {
      method: 'PUT',
      body: JSON.stringify({ allAnswers, createNewSession }),
    });
  }

  async getUserInterviews(email) {
    return this.request(`/interviews/user/${encodeURIComponent(email)}`);
  }

  async getInterview(interviewId) {
    return this.request(`/interviews/${interviewId}`);
  }

  // Dashboard methods
  async getAllInterviews(params = {}) {
    const { search, sortBy, sortOrder, status } = params;
    const queryParams = new URLSearchParams();
    
    if (search) queryParams.append('search', search);
    if (sortBy) queryParams.append('sortBy', sortBy);
    if (sortOrder) queryParams.append('sortOrder', sortOrder);
    if (status) queryParams.append('status', status);
    
    const queryString = queryParams.toString();
    const endpoint = `/interviews/all${queryString ? `?${queryString}` : ''}`;
    
    return this.request(endpoint);
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;