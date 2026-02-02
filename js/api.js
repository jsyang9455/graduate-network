// API Configuration
// Use environment variable or default to localhost
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : 'http://localhost:5000/api';

// API Helper Functions
const api = {
  // Get token from localStorage
  getToken() {
    return localStorage.getItem('token');
  },

  // Set token to localStorage
  setToken(token) {
    localStorage.setItem('token', token);
  },

  // Remove token from localStorage
  removeToken() {
    localStorage.removeItem('token');
  },

  // Make authenticated request
  async request(endpoint, options = {}) {
    const token = this.getToken();
    
    // Skip API call for test and registered user tokens
    if (token && (token.startsWith('test_token_') || token.startsWith('user_token_'))) {
      console.log('Skipping API call for local token:', endpoint);
      // Return empty success response for local tokens
      return { success: true, message: 'Using local storage' };
    }
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  },

  // GET request
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  // POST request
  async post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // PUT request
  async put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  // Auth APIs
  auth: {
    async register(userData) {
      return api.post('/auth/register', userData);
    },

    async login(email, password) {
      return api.post('/auth/login', { email, password });
    },

    async getCurrentUser() {
      return api.get('/auth/me');
    },

    async changePassword(currentPassword, newPassword) {
      return api.post('/auth/change-password', { currentPassword, newPassword });
    },
  },

  // User APIs
  users: {
    async search(params) {
      const queryString = new URLSearchParams(params).toString();
      return api.get(`/users?${queryString}`);
    },

    async getProfile(userId) {
      return api.get(`/users/${userId}`);
    },

    async updateProfile(data) {
      return api.put('/users/profile', data);
    },

    async getGraduateProfile(userId) {
      return api.get(`/users/graduate-profile/${userId}`);
    },

    async updateGraduateProfile(data) {
      return api.put('/users/graduate-profile', data);
    },
  },

  // Job APIs
  jobs: {
    async getAll(params) {
      const queryString = new URLSearchParams(params).toString();
      return api.get(`/jobs?${queryString}`);
    },

    async getById(id) {
      return api.get(`/jobs/${id}`);
    },

    async create(jobData) {
      return api.post('/jobs', jobData);
    },

    async update(id, jobData) {
      return api.put(`/jobs/${id}`, jobData);
    },

    async delete(id) {
      return api.delete(`/jobs/${id}`);
    },

    async apply(id, applicationData) {
      return api.post(`/jobs/${id}/apply`, applicationData);
    },

    async getMyApplications() {
      return api.get('/jobs/my/applications');
    },
  },

  // Networking APIs
  networking: {
    async getConnections() {
      return api.get('/networking/connections');
    },

    async getRequests() {
      return api.get('/networking/requests');
    },

    async sendRequest(userId, message) {
      return api.post(`/networking/connect/${userId}`, { message });
    },

    async respondToRequest(requestId, action) {
      return api.put(`/networking/requests/${requestId}`, { action });
    },

    async getMentors(params) {
      const queryString = new URLSearchParams(params).toString();
      return api.get(`/networking/mentors?${queryString}`);
    },

    async requestMentorship(mentorId, notes) {
      return api.post(`/networking/mentorship/${mentorId}`, { notes });
    },

    async getMyMentorships() {
      return api.get('/networking/my-mentorships');
    },
  },

  // Counseling APIs
  counseling: {
    async getSessions() {
      return api.get('/counseling');
    },

    async bookSession(sessionData) {
      return api.post('/counseling', sessionData);
    },

    async updateSession(id, sessionData) {
      return api.put(`/counseling/${id}`, sessionData);
    },

    async cancelSession(id) {
      return api.delete(`/counseling/${id}`);
    },

    async getAvailableSlots(date) {
      return api.get(`/counseling/available-slots?date=${date}`);
    },
  },

  // Certificate APIs
  certificates: {
    async getAll() {
      return api.get('/certificates');
    },

    async request(certificateData) {
      return api.post('/certificates', certificateData);
    },

    async getById(id) {
      return api.get(`/certificates/${id}`);
    },
  },

  // Post APIs
  posts: {
    async getAll(params) {
      const queryString = new URLSearchParams(params).toString();
      return api.get(`/posts?${queryString}`);
    },

    async getById(id) {
      return api.get(`/posts/${id}`);
    },

    async create(postData) {
      return api.post('/posts', postData);
    },

    async update(id, postData) {
      return api.put(`/posts/${id}`, postData);
    },

    async delete(id) {
      return api.delete(`/posts/${id}`);
    },

    async getComments(id) {
      return api.get(`/posts/${id}/comments`);
    },

    async addComment(id, content, parent_id = null) {
      return api.post(`/posts/${id}/comments`, { content, parent_id });
    },

    async like(id) {
      return api.post(`/posts/${id}/like`, {});
    },
  },
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
