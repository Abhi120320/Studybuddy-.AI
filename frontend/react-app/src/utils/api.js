import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  sendPasswordResetEmail,
  signOut,
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// Helper: Perform authenticated fetches injecting Firebase ID token
const authFetch = async (endpoint, options = {}) => {
  let token = null;
  if (auth.currentUser) {
    token = await auth.currentUser.getIdToken();
  } else {
    token = sessionStorage.getItem('studybuddy_token');
  }

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
    await signOut(auth);
    sessionStorage.removeItem('studybuddy_token');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('userName');
    window.location.hash = 'auth';
    throw new Error('Session expired. Please log in again.');
  }

  return response;
};

// ── Auth APIs ─────────────────────────────────────────────────────────────

/**
 * Synchronize the authenticated Firebase user with the PostgreSQL database.
 */
export const syncUser = async (idToken) => {
  const response = await fetch(`${API_URL}/auth/sync`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to sync account with backend.');
  }
  return data;
};

/**
 * Register a new user in Firebase, send email verification, and trigger backend sync.
 */
export const registerUser = async (name, email, password) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Add display name in Firebase
  await updateProfile(user, { displayName: name });

  // Send verification link
  await sendEmailVerification(user);

  // Initial sync with backend (creates PG entry and General subject)
  const idToken = await user.getIdToken();
  await syncUser(idToken);

  return {
    success: true,
    email: user.email,
    message: 'Verification link sent. Please verify your email to log in.'
  };
};

/**
 * Request password reset link.
 */
export const forgotPassword = async (email) => {
  await sendPasswordResetEmail(auth, email);
  return { success: true, message: 'Password reset link sent to your email.' };
};

/**
 * Log in via Firebase Auth. Forces email verification.
 */
export const loginUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  if (!user.emailVerified) {
    await sendEmailVerification(user);
    await signOut(auth);
    throw new Error('Please verify your email. A new verification link has been sent to your inbox.');
  }

  const idToken = await user.getIdToken();
  const syncData = await syncUser(idToken);

  // Store in sessionStorage for fast synchronous page load checks
  sessionStorage.setItem('studybuddy_token', idToken);
  sessionStorage.setItem('userEmail', user.email);
  if (syncData.name) {
    sessionStorage.setItem('userName', syncData.name);
  }

  return syncData;
};

/**
 * Dummy mocks kept for backward compatibility if any components import them.
 */
export const verifyOTP = async () => ({ success: true });
export const resendOTP = async () => ({ success: true });
export const resetPassword = async () => ({ success: true });

/**
 * Log out user from Firebase and clear local storage.
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Signout error:', err);
  }
  sessionStorage.removeItem('studybuddy_token');
  sessionStorage.removeItem('userEmail');
  sessionStorage.removeItem('userName');
  
  try {
    await fetch(`${API_URL}/auth/logout`, { method: 'POST' });
  } catch (e) {
    // Ignore offline/fail
  }
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

// Legacy alias
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
