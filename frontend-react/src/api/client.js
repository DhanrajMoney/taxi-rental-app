import axios from "axios";

// Point this at your Laravel API (defaults to /api in production or http://127.0.0.1:8000/api in dev)
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? "/api" : "http://127.0.0.1:8000/api");

const STORAGE_KEY = "ridedesk_auth_token";
let authToken = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    Accept: "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  },
});

function setAuthToken(token) {
  authToken = token;

  if (token) {
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, token);
    client.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
    delete client.defaults.headers.common.Authorization;
  }
}

export function hasAuthToken() {
  return Boolean(authToken);
}

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) setAuthToken(null);
    return Promise.reject(error);
  },
);

export const AuthAPI = {
  login: (credentials) => client.post("/auth/login", credentials).then((r) => {
    setAuthToken(r.data.token);
    return r.data;
  }),
  forgotPassword: (email) => client.post("/auth/forgot-password", { email }).then((r) => r.data),
  resetPassword: (payload) => client.post("/auth/reset-password", payload).then((r) => r.data),
  me: () => client.get("/auth/me").then((r) => r.data),
  logout: () => client.post("/auth/logout").finally(() => {
    setAuthToken(null);
  }),
};

export const OfficeAPI = {
  list: (params) => client.get("/offices", { params }).then((r) => r.data),
  create: (payload) => client.post("/offices", payload).then((r) => r.data),
  update: (id, payload) => client.put(`/offices/${id}`, payload).then((r) => r.data),
  remove: (id) => client.delete(`/offices/${id}`).then((r) => r.data),
};

export const CustomerAPI = {
  list: (params) => client.get("/customers", { params }).then((r) => r.data),
  create: (payload) => client.post("/customers", payload).then((r) => r.data),
  update: (id, payload) => client.put(`/customers/${id}`, payload).then((r) => r.data),
  remove: (id) => client.delete(`/customers/${id}`).then((r) => r.data),
};

export const TaxiAPI = {
  list: (params) => client.get("/taxis", { params }).then((r) => r.data),
  get: (id) => client.get(`/taxis/${id}`).then((r) => r.data),
  create: (payload) => client.post("/taxis", payload).then((r) => r.data),
  update: (id, payload) => {
    if (payload instanceof FormData) {
      payload.append("_method", "PUT");
      return client.post(`/taxis/${id}`, payload).then((r) => r.data);
    }
    return client.put(`/taxis/${id}`, payload).then((r) => r.data);
  },
  remove: (id) => client.delete(`/taxis/${id}`).then((r) => r.data),
};

export const TaxiDocumentAPI = {
  list: (taxiId) => client.get(`/taxis/${taxiId}/documents`).then((r) => r.data),
  upload: (taxiId, payload) => client.post(`/taxis/${taxiId}/documents`, payload).then((r) => r.data),
  download: (taxiId, documentId) => client.get(`/taxis/${taxiId}/documents/${documentId}/file`, { responseType: "blob" }).then((r) => r.data),
  remove: (taxiId, documentId) => client.delete(`/taxis/${taxiId}/documents/${documentId}`).then((r) => r.data),
};

export const DriverAPI = {
  list: (params) => client.get("/drivers", { params }).then((r) => r.data),
  get: (id) => client.get(`/drivers/${id}`).then((r) => r.data),
  create: (payload) => client.post("/drivers", payload).then((r) => r.data),
  update: (id, payload) => {
    if (payload instanceof FormData) {
      payload.append("_method", "PUT");
      return client.post(`/drivers/${id}`, payload).then((r) => r.data);
    }

    return client.put(`/drivers/${id}`, payload).then((r) => r.data);
  },
  patch: (id, payload) => client.patch(`/drivers/${id}`, payload).then((r) => r.data),
  remove: (id) => client.delete(`/drivers/${id}`).then((r) => r.data),
};

export const DriverDocumentAPI = {
  list: (driverId) => client.get(`/drivers/${driverId}/documents`).then((r) => r.data),
  upload: (driverId, payload) => client.post(`/drivers/${driverId}/documents`, payload).then((r) => r.data),
  download: (driverId, documentId) => client.get(`/drivers/${driverId}/documents/${documentId}/file`, { responseType: "blob" }).then((r) => r.data),
  remove: (driverId, documentId) => client.delete(`/drivers/${driverId}/documents/${documentId}`).then((r) => r.data),
};

export const BookingAPI = {
  list: (params) => client.get("/bookings", { params }).then((r) => r.data),
  get: (id) => client.get(`/bookings/${id}`).then((r) => r.data),
  create: (payload) => client.post("/bookings", payload).then((r) => r.data),
  update: (id, payload) => client.put(`/bookings/${id}`, payload).then((r) => r.data),
  remove: (id, payload) => client.delete(`/bookings/${id}`, payload ? { data: payload } : undefined).then((r) => r.data),
};

export const UserAPI = {
  list: (params) => client.get("/users", { params }).then((r) => r.data),
  create: (payload) => client.post("/users", payload).then((r) => r.data),
  update: (id, payload) => client.put(`/users/${id}`, payload).then((r) => r.data),
  remove: (id) => client.delete(`/users/${id}`).then((r) => r.data),
};

export const MaintenanceAPI = {
  list: (params) => client.get("/maintenance", { params }).then((r) => r.data),
  create: (payload) => client.post("/maintenance", payload).then((r) => r.data),
  update: (id, payload) => {
    if (payload instanceof FormData) {
      payload.append("_method", "PUT");
      return client.post(`/maintenance/${id}`, payload).then((r) => r.data);
    }

    return client.put(`/maintenance/${id}`, payload).then((r) => r.data);
  },
  downloadBill: (id) => client.get(`/maintenance/${id}/bill`, { responseType: "blob" }).then((r) => r.data),
  remove: (id) => client.delete(`/maintenance/${id}`).then((r) => r.data),
};

export const NotificationAPI = {
  list: () => client.get("/notifications").then((r) => r.data),
  markRead: (id) => client.post(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => client.post("/notifications/read-all").then((r) => r.data),
};

export const ProfileAPI = {
  update: (payload) => client.put("/profile", payload).then((r) => r.data),
  changePassword: (payload) => client.post("/profile/change-password", payload).then((r) => r.data),
  loginActivity: (params) => client.get("/profile/login-activity", { params }).then((r) => r.data),
};

export const ImportAPI = {
  getTemplateUrl: (type) => `${BASE_URL}/imports/templates/${type}`,
  preview: (payload) => client.post("/imports/preview", payload).then((r) => r.data),
  confirm: (payload) => client.post("/imports/confirm", payload).then((r) => r.data),
  getHistory: () => client.get("/imports/history").then((r) => r.data),
};

export const SettingAPI = {
  get: () => client.get("/settings").then((r) => r.data),
  update: (settings) => client.put("/settings", { settings }).then((r) => r.data),
};

export const DashboardAPI = {
  overview: (params) => client.get("/dashboard/overview", { params }).then((r) => r.data),
};

export const ExpenseAPI = {
  listAll: (params) => client.get("/expenses", { params }).then((r) => r.data),
  listForBooking: (bookingId) => client.get(`/bookings/${bookingId}/expenses`).then((r) => r.data),
  create: (bookingId, payload) => {
    const config = payload instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : {};
    return client.post(`/bookings/${bookingId}/expenses`, payload, config).then((r) => r.data);
  },
  update: (id, payload) => {
    if (payload instanceof FormData) {
      payload.append("_method", "PUT");
      return client.post(`/expenses/${id}`, payload, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
    }
    return client.put(`/expenses/${id}`, payload).then((r) => r.data);
  },
  remove: (id) => client.delete(`/expenses/${id}`).then((r) => r.data),
  approve: (id) => client.post(`/expenses/${id}/approve`).then((r) => r.data),
  reimburse: (id) => client.post(`/expenses/${id}/reimburse`).then((r) => r.data),
  reject: (id) => client.post(`/expenses/${id}/reject`).then((r) => r.data),
  downloadReceipt: (id) => client.get(`/expenses/${id}/receipt`, { responseType: "blob" }).then((r) => r.data),
  getReceiptUrl: (id) => `${BASE_URL}/expenses/${id}/receipt`,
};

export default client;
