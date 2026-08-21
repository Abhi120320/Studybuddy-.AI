const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Helper: Perform authenticated fetches injecting JWT token
const authFetch = async (endpoint, options = {}) => {
  const token = sessionStorage.getItem('studybuddy_token');
  const headers = {
    ...options.headers,
    ...(token && { 'Authorization': `Bearer ${token}` })
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401 || response.status === 403) {
    // Session expired or invalid
    sessionStorage.removeItem('studybuddy_token');
    sessionStorage.removeItem('userEmail');
    window.location.hash = 'auth';
    throw new Error('Session expired. Please log in again.');
  }

  return response;
};

// ── Auth APIs ─────────────────────────────────────────────────────────────

/**
 * Register a new account. Triggers an OTP email.
 * Returns { success, otpRequired, email, message, expiresInSeconds }
 */
export const registerUser = async (name, email, password) => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Registration failed');
  }
  return data;
};

/**
 * Validate email + password. On success, logs the user in directly.
 * Stores JWT in sessionStorage and sets refresh cookie.
 */
export const loginUser = async (email, password) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    credentials: 'include',   // needed for Set-Cookie (refresh token)
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Login failed');
  }
  // Store authentication details securely
  if (data.token) {
    sessionStorage.setItem('studybuddy_token', data.token);
    sessionStorage.setItem('userEmail', data.email || email);
    if (data.name) sessionStorage.setItem('userName', data.name);
  }
  return data;
};

/**
 * Verify the 6-digit OTP and complete authentication.
 * On success, stores JWT in sessionStorage and sets refresh cookie.
 */
export const verifyOTP = async (email, otp) => {
  const response = await fetch(`${API_URL}/auth/verify-otp`, {
    method: 'POST',
    credentials: 'include',   // needed for Set-Cookie (refresh token)
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Verification failed');
  }
  // Store authentication details securely
  if (data.token) {
    sessionStorage.setItem('studybuddy_token', data.token);
    sessionStorage.setItem('userEmail', data.email || email);
    if (data.name) sessionStorage.setItem('userName', data.name);
  }
  return data;
};

/**
 * Request a new OTP (invalidates the previous one).
 */
export const resendOTP = async (email) => {
  const response = await fetch(`${API_URL}/auth/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to resend code');
  }
  return data;
};

/**
 * Log out the current user — clears local storage and refresh cookie.
 */
export const logoutUser = async () => {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // Fire-and-forget — always clear local state regardless of server response
  }
  sessionStorage.removeItem('studybuddy_token');
  sessionStorage.removeItem('userEmail');
  sessionStorage.removeItem('userName');
};

/**
 * Fetch the authenticated user's safe profile.
 */
export const fetchMe = async () => {
  const response = await authFetch('/auth/me');
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch profile');
  }
  return data;
};

// Legacy alias — kept so any code that still calls sendOTP doesn't break
export const sendOTP = loginUser;

// ── Study Materials & Uploads ─────────────────────────────────────────────

export const uploadPDF = async (files, subject = '') => {
  const formData = new FormData();
  
  if (Array.isArray(files) || files instanceof FileList || (files && files.length !== undefined)) {
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
  } else {
    formData.append('files', files);
  }

  if (subject) {
    formData.append('subject', subject);
  }

  const response = await authFetch('/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to upload PDF');
  }
  return data;
};

export const fetchSubjects = async () => {
  const response = await authFetch('/upload/subjects');
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch subjects list');
  }
  return data;
};

export const createSubject = async (name, meta = {}) => {
  const response = await authFetch('/upload/subjects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, ...meta }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to create subject folder');
  }
  return data;
};

export const updateSubjectMeta = async (name, meta) => {
  const response = await authFetch(`/upload/subjects/${encodeURIComponent(name)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(meta),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to update subject appearance');
  }
  return data;
};

export const deleteSubject = async (name) => {
  const response = await authFetch(`/upload/subjects/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to delete subject folder');
  }
  return data;
};

export const fetchDocumentsList = async () => {
  const response = await authFetch('/upload/list');
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch documents list');
  }
  return data;
};

export const toggleDocument = async (id) => {
  const response = await authFetch(`/upload/toggle/${id}`, {
    method: 'PUT',
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to toggle document');
  }
  return data;
};

// ── Practice Arena ────────────────────────────────────────────────────────

export const generateQuestions = async (difficulty, count) => {
  const response = await authFetch('/generate-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ difficulty, count }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate questions');
  }
  return data;
};

export const generateMockExam = async (numQuestions) => {
  const response = await authFetch('/mock-exam', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ numQuestions }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate mock exam');
  }
  return data;
};

export const sendChatMessage = async (question, conversationHistory = []) => {
  const response = await authFetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, conversationHistory }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to send message');
  }
  return data;
};

// ── AI Tools / Study Schedules ────────────────────────────────────────────

export const generateSummary = async (topic) => {
  const response = await authFetch('/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate summary');
  }
  return data;
};

export const generateSchedule = async (daysUntilExam) => {
  const response = await authFetch('/study-schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ daysUntilExam }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate study plan');
  }
  return data;
};

// ── Viva & Speech Evaluation ──────────────────────────────────────────────

export const generateVivaQuestions = async (numQuestions) => {
  const response = await authFetch('/viva/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ numQuestions }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate viva questions');
  }
  return data;
};

export const evaluateVivaAnswer = async (question, answer) => {
  const response = await authFetch('/viva/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, answer }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to evaluate answer');
  }
  return data;
};

// ── Written Grading ───────────────────────────────────────────────────────

export const evaluateWrittenAnswer = async (imageFile) => {
  const formData = new FormData();
  formData.append('image', imageFile);

  const response = await authFetch('/evaluate-written', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to evaluate written answer');
  }
  return data;
};

// ── Backward-compatible aliases ───────────────────────────────────────────
// UploadSection.jsx uses these legacy names; kept for compatibility
export { fetchDocumentsList as fetchNotesList };
export { toggleDocument as toggleNoteStatus };
