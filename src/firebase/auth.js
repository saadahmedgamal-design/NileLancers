import { auth, db } from './config';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// ─── Register ────────────────────────────────────────────────────────────────
export const registerUser = async ({ name, username, email, password, role, phone, location, bio, yearsOfExperience }) => {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;

    const profile = {
      id: uid,
      name,
      username,
      email,
      role: role || 'freelancer',
      phone: phone || '',
      location: location || '',
      bio: bio || '',
      yearsOfExperience: yearsOfExperience ? Number(yearsOfExperience) : null,
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'users', uid), profile);
    return { ok: true, user: profile };
  } catch (err) {
    let error = 'unknown';
    if (err.code === 'auth/email-already-in-use') error = 'email_taken';
    else if (err.code === 'auth/weak-password')   error = 'weak_password';
    else if (err.code === 'auth/invalid-email')   error = 'invalid_email';
    return { ok: false, error };
  }
};

// ─── Login ───────────────────────────────────────────────────────────────────
export const loginUser = async ({ email, password }) => {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const docSnap = await getDoc(doc(db, 'users', cred.user.uid));
    if (!docSnap.exists()) return { ok: false, error: 'profile_missing' };
    return { ok: true, user: { id: docSnap.id, ...docSnap.data() } };
  } catch (err) {
    let error = 'unknown';
    if (err.code === 'auth/user-not-found')       error = 'not_found';
    else if (err.code === 'auth/wrong-password' ||
             err.code === 'auth/invalid-credential') error = 'wrong_password';
    return { ok: false, error };
  }
};

// ─── Logout ──────────────────────────────────────────────────────────────────
export const logoutUser = () => signOut(auth);

// ─── Password Reset ──────────────────────────────────────────────────────────
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

// ─── Auth State Listener ─────────────────────────────────────────────────────
export const subscribeToAuth = (callback) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const docSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() });
      } else {
        callback({ id: firebaseUser.uid, email: firebaseUser.email });
      }
    } else {
      callback(null);
    }
  });
};
