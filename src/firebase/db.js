import { db } from './config';
import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit 
} from "firebase/firestore";

/* =============================================================
   Jobs Collection
   ============================================================= */
export const getJobs = async (limitCount = null) => {
  try {
    const jobsRef = collection(db, "jobs");
    let q = query(jobsRef, orderBy("createdAt", "desc"));
    
    if (limitCount) {
      q = query(q, limit(limitCount));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return [];
  }
};

export const getJobById = async (jobId) => {
  try {
    const docRef = doc(db, "jobs", jobId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error fetching job:", error);
    return null;
  }
};

/* =============================================================
   Categories Collection
   ============================================================= */
export const getCategories = async () => {
  try {
    const categoriesRef = collection(db, "categories");
    const q = query(categoriesRef, orderBy("name"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};

/* =============================================================
   Skills Collection
   ============================================================= */
export const getSkills = async () => {
  try {
    const skillsRef = collection(db, "skills");
    const q = query(skillsRef, orderBy("name"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching skills:", error);
    return [];
  }
};

/* =============================================================
   User Profiles
   ============================================================= */
export const getUserProfile = async (uid) => {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
};

export const createUserProfile = async (uid, profileData) => {
  try {
    await updateDoc(doc(db, "users", uid), {
      ...profileData,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    // If doc doesn't exist, try setting it
    try {
      await updateDoc(doc(db, "users", uid), {
        ...profileData,
        createdAt: new Date().toISOString()
      });
      return true;
    } catch (e) {
      console.error("Error creating/updating user profile:", e);
      return false;
    }
  }
};
