import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:3001/api", 
});

// Add a request interceptor to include the token in headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const getUserProfile = async () => {
  const response = await api.get("/users/profile");
  return response.data;
};

export const getResources = async (params) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v != null && v !== "")
  );
  const response = await api.get("/resources", { params: cleanParams });
  return response.data;
};

export const getChatSessions = async () => {
  const response = await api.get("/chat/sessions");
  return response.data;
};

export const getChatSession = async (sessionId) => {
  const response = await api.get(`/chat/sessions/${sessionId}`);
  return response.data;
};

export const updateChatSession = async (sessionId, data) => {
  const response = await api.put(`/chat/sessions/${sessionId}`, data);
  return response.data;
};

export const deleteChatSession = async (sessionId) => {
  const response = await api.delete(`/chat/sessions/${sessionId}`);
  return response.data;
};

export const createMoodEntry = async (data) => {
  const response = await api.post("/mood/entries", data);
  return response.data;
};

export const getMoodEntries = async (params) => {
  const response = await api.get("/mood/entries", { params });
  return response.data;
};

// Resources
export const getResourceCategories = async () => {
  const response = await api.get("/resources/categories");
  return response.data;
};

export const getResourceById = async (id) => {
  const response = await api.get(`/resources/${id}`);
  return response.data;
};

export const getRecommendedResources = async () => {
  const response = await api.get("/resources/recommended/for-user");
  return response.data;
};

export const engageResource = async (id, action) => {
  const response = await api.post(`/resources/${id}/engage`, null, {
    params: { action },
  });
  return response.data;
};

export const getCrisisHotlines = async (params) => {
  const response = await api.get("/resources/crisis/hotlines", { params });
  return response.data;
};

// Crisis
export const createCrisisAlert = async (data) => {
  const response = await api.post("/crisis/alert", data);
  return response.data;
};

// Voice
export const analyzeVoice = async (formData) => {
  const response = await api.post("/voice/analyze", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

// Auth
export const logoutUser = async () => {
  const response = await api.post("/auth/logout");
  return response.data;
};

export const refreshAccessToken = async (refreshToken) => {
  const response = await api.post("/auth/refresh", { refreshToken });
  return response.data;
};

export const forgotPassword = async (email) => {
  const response = await api.post("/auth/forgot-password", { email });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};

// User Management
export const updateUserProfile = async (data) => {
  const response = await api.put("/users/profile", data);
  return response.data;
};

export const updateUserPreferences = async (data) => {
  const response = await api.put("/users/preferences", data);
  return response.data;
};

export const updateUserAccessibility = async (data) => {
  const response = await api.put("/users/accessibility", data);
  return response.data;
};

export const changeUserPassword = async (data) => {
  const response = await api.put("/users/change-password", data);
  return response.data;
};

export const deleteUserAccount = async (data) => {
  const response = await api.delete("/users/account", { data });
  return response.data;
};

export const reactivateUserAccount = async (data) => {
  const response = await api.put("/users/reactivate", data);
  return response.data;
};
