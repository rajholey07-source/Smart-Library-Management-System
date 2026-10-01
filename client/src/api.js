/**
 * API client — single fetch wrapper + endpoint functions.
 * Cookies carry the session (httpOnly token), so credentials are always included.
 */
async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    err.details = data && data.details;
    throw err;
  }
  return data;
}

export const api = {
  // auth
  register: (payload) => request('/api/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),
  changePassword: (payload) => request('/api/auth/change-password', { method: 'PUT', body: payload }),

  // books
  books: (params = {}) => request(`/api/books?${new URLSearchParams(params)}`),
  book: (id) => request(`/api/books/${id}`),
  featured: () => request('/api/books/featured'),
  recent: () => request('/api/books/recent'),
  recommendations: () => request('/api/books/recommendations'),
  bookFilters: () => request('/api/books/meta/filters'),
  createBook: (payload) => request('/api/books', { method: 'POST', body: payload }),
  updateBook: (id, payload) => request(`/api/books/${id}`, { method: 'PUT', body: payload }),
  deleteBook: (id) => request(`/api/books/${id}`, { method: 'DELETE' }),

  // borrowing
  borrow: (bookId) => request('/api/borrow', { method: 'POST', body: { book_id: bookId } }),
  issueBook: (bookId, userId) => request('/api/borrow', { method: 'POST', body: { book_id: bookId, user_id: userId } }),
  records: (params = {}) => request(`/api/borrow?${new URLSearchParams(params)}`),
  returnBook: (id) => request(`/api/borrow/${id}/return`, { method: 'PUT' }),
  overdueCheck: () => request('/api/borrow/overdue-check', { method: 'POST' }),

  // users
  users: (params = {}) => request(`/api/users?${new URLSearchParams(params)}`),
  user: (id) => request(`/api/users/${id}`),
  updateUser: (id, payload) => request(`/api/users/${id}`, { method: 'PUT', body: payload }),
  updateMyProfile: (payload) => request('/api/users/me/profile', { method: 'PUT', body: payload }),

  // fines
  fines: (params = {}) => request(`/api/fines?${new URLSearchParams(params)}`),
  payFine: (id) => request(`/api/fines/${id}/pay`, { method: 'PUT' }),
  unpayFine: (id) => request(`/api/fines/${id}/unpay`, { method: 'PUT' }),
  payAllFines: (userId) => request(`/api/fines/pay-all/${userId}`, { method: 'PUT' }),

  // dashboard & settings
  dashboardStats: () => request('/api/dashboard/stats'),
  reports: () => request('/api/dashboard/reports'),
  settings: () => request('/api/settings'),
  updateSettings: (payload) => request('/api/settings', { method: 'PUT', body: payload }),

  // notifications
  notifications: (unread) => request(`/api/notifications${unread ? '?unread=1' : ''}`),
  markRead: (id) => request(`/api/notifications/${id}/read`, { method: 'PUT' }),
  markAllRead: () => request('/api/notifications/read-all', { method: 'PUT' }),
};
