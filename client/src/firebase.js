import { initializeApp } from 'firebase/app';
import { 
  getAuth,
  createUserWithEmailAndPassword as realCreateUserWithEmailAndPassword,
  signInWithEmailAndPassword as realSignInWithEmailAndPassword,
  signOut as realSignOut,
  onAuthStateChanged as realOnAuthStateChanged,
  updateProfile as realUpdateProfile
} from 'firebase/auth';
import { 
  getFirestore,
  collection as realCollection,
  query as realQuery,
  where as realWhere,
  getDocs as realGetDocs,
  addDoc as realAddDoc,
  deleteDoc as realDeleteDoc,
  doc as realDoc
} from 'firebase/firestore';

// Check if valid Firebase credentials are provided
const isFirebaseConfigured = !!(
  import.meta.env.VITE_FIREBASE_API_KEY && 
  import.meta.env.VITE_FIREBASE_API_KEY !== 'undefined' &&
  import.meta.env.VITE_FIREBASE_API_KEY !== '' &&
  !import.meta.env.VITE_FIREBASE_API_KEY.includes('YOUR_')
);

let app = null;
let auth = null;
let db = null;

if (isFirebaseConfigured) {
  try {
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("🔥 Firebase initialized successfully.");
  } catch (error) {
    console.error("❌ Failed to initialize real Firebase:", error);
  }
}

if (!auth || !db) {
  console.warn("⚠️ Firebase configuration missing or invalid. Running in local MOCK/LOCAL STORAGE database and auth mode.");
  auth = { currentUser: null };
  db = { type: 'mock-db' };
}

export { auth, db };
export default app;

// --- Mock Auth Store and helper state ---
const mockAuthObject = {
  currentUser: null,
  listeners: []
};

const notifyListeners = () => {
  mockAuthObject.listeners.forEach(cb => cb(mockAuthObject.currentUser));
};

// Load initial user state if any from localStorage (ONLY in mock mode)
if (!isFirebaseConfigured) {
  try {
    const savedUser = localStorage.getItem('safecommute_mock_user');
    if (savedUser) {
      mockAuthObject.currentUser = JSON.parse(savedUser);
      auth.currentUser = mockAuthObject.currentUser;
    }
  } catch (e) {
    console.error("Failed to parse mock user from localStorage:", e);
  }
}

// --- Auth Functions ---

export const createUserWithEmailAndPassword = async (authObj, email, password) => {
  if (!isFirebaseConfigured) {
    const users = JSON.parse(localStorage.getItem('safecommute_mock_users') || '[]');
    if (users.find(u => u.email === email)) {
      const err = new Error("Firebase: Error (auth/email-already-in-use).");
      err.code = "auth/email-already-in-use";
      throw err;
    }
    const newUser = {
      uid: 'mock-uid-' + Math.random().toString(36).substring(2, 11),
      email,
      displayName: '',
      password // Store password in the local list for mock verification
    };
    users.push(newUser);
    localStorage.setItem('safecommute_mock_users', JSON.stringify(users));
    
    const { password: _, ...userWithoutPassword } = newUser;
    mockAuthObject.currentUser = userWithoutPassword;
    auth.currentUser = userWithoutPassword;
    localStorage.setItem('safecommute_mock_user', JSON.stringify(userWithoutPassword));
    notifyListeners();
    
    return { user: userWithoutPassword };
  }
  return realCreateUserWithEmailAndPassword(authObj, email, password);
};

export const signInWithEmailAndPassword = async (authObj, email, password) => {
  if (!isFirebaseConfigured) {
    const users = JSON.parse(localStorage.getItem('safecommute_mock_users') || '[]');
    const user = users.find(u => u.email === email);
    if (!user) {
      const err = new Error("Firebase: Error (auth/user-not-found).");
      err.code = "auth/user-not-found";
      throw err;
    }
    // Check password if it is set in mock storage (allow old mock users without password to log in)
    if (user.password !== undefined && user.password !== password) {
      const err = new Error("Firebase: Error (auth/wrong-password).");
      err.code = "auth/wrong-password";
      throw err;
    }
    const { password: _, ...userWithoutPassword } = user;
    mockAuthObject.currentUser = userWithoutPassword;
    auth.currentUser = userWithoutPassword;
    localStorage.setItem('safecommute_mock_user', JSON.stringify(userWithoutPassword));
    notifyListeners();
    return { user: userWithoutPassword };
  }
  return realSignInWithEmailAndPassword(authObj, email, password);
};

export const signOut = async (authObj) => {
  if (!isFirebaseConfigured) {
    mockAuthObject.currentUser = null;
    auth.currentUser = null;
    localStorage.removeItem('safecommute_mock_user');
    notifyListeners();
    return Promise.resolve();
  }
  return realSignOut(authObj);
};

export const onAuthStateChanged = (authObj, callback) => {
  if (!isFirebaseConfigured) {
    mockAuthObject.listeners.push(callback);
    callback(mockAuthObject.currentUser);
    return () => {
      mockAuthObject.listeners = mockAuthObject.listeners.filter(cb => cb !== callback);
    };
  }
  return realOnAuthStateChanged(authObj, callback);
};

export const updateProfile = async (user, profileData) => {
  if (!isFirebaseConfigured) {
    if (user && mockAuthObject.currentUser && mockAuthObject.currentUser.uid === user.uid) {
      mockAuthObject.currentUser.displayName = profileData.displayName;
      auth.currentUser = mockAuthObject.currentUser;
      localStorage.setItem('safecommute_mock_user', JSON.stringify(mockAuthObject.currentUser));
      
      const users = JSON.parse(localStorage.getItem('safecommute_mock_users') || '[]');
      const index = users.findIndex(u => u.uid === user.uid);
      if (index !== -1) {
        users[index].displayName = profileData.displayName;
        localStorage.setItem('safecommute_mock_users', JSON.stringify(users));
      }
      notifyListeners();
    }
    return Promise.resolve();
  }
  return realUpdateProfile(user, profileData);
};

// --- Firestore Functions ---

export const collection = (dbObj, path) => {
  if (!isFirebaseConfigured) {
    return { type: 'collection', path };
  }
  return realCollection(dbObj, path);
};

export const query = (collectionRef, ...queryConstraints) => {
  if (!isFirebaseConfigured) {
    return { type: 'query', collectionRef, queryConstraints };
  }
  return realQuery(collectionRef, ...queryConstraints);
};

export const where = (field, operator, value) => {
  if (!isFirebaseConfigured) {
    return { type: 'where', field, operator, value };
  }
  return realWhere(field, operator, value);
};

export const getDocs = async (queryRef) => {
  if (!isFirebaseConfigured) {
    let collectionPath = '';
    let constraints = [];
    if (queryRef.type === 'collection') {
      collectionPath = queryRef.path;
    } else if (queryRef.type === 'query') {
      collectionPath = queryRef.collectionRef.path;
      constraints = queryRef.queryConstraints || [];
    }
    
    const storageKey = `safecommute_mock_db_${collectionPath}`;
    let docs = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    // Seed default emergency contacts if none exist
    if (collectionPath === 'contacts' && docs.length === 0) {
      if (mockAuthObject.currentUser) {
        docs = [
          {
            id: 'mock-contact-1',
            userId: mockAuthObject.currentUser.uid,
            name: 'Emergency Services (Mock)',
            phone: '+919999999999',
            createdAt: new Date().toISOString()
          },
          {
            id: 'mock-contact-2',
            userId: mockAuthObject.currentUser.uid,
            name: 'Family Member (Mock)',
            phone: '+918888888888',
            createdAt: new Date().toISOString()
          }
        ];
        localStorage.setItem(storageKey, JSON.stringify(docs));
      }
    }
    
    for (const constraint of constraints) {
      if (constraint && constraint.type === 'where') {
        const { field, operator, value } = constraint;
        if (operator === '==') {
          docs = docs.filter(d => d[field] === value);
        }
      }
    }
    
    const docSnapshots = docs.map(d => ({
      id: d.id,
      data: () => d
    }));
    
    return {
      docs: docSnapshots,
      forEach: (callback) => docSnapshots.forEach(callback)
    };
  }
  return realGetDocs(queryRef);
};

export const addDoc = async (collectionRef, data) => {
  if (!isFirebaseConfigured) {
    const collectionPath = collectionRef.path;
    const storageKey = `safecommute_mock_db_${collectionPath}`;
    const docs = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    const newDoc = {
      id: 'mock-doc-' + Math.random().toString(36).substring(2, 11),
      ...data
    };
    docs.push(newDoc);
    localStorage.setItem(storageKey, JSON.stringify(docs));
    return newDoc;
  }
  return realAddDoc(collectionRef, data);
};

export const doc = (dbObj, collectionName, id) => {
  if (!isFirebaseConfigured) {
    return { type: 'doc', collectionName, id };
  }
  return realDoc(dbObj, collectionName, id);
};

export const deleteDoc = async (docRef) => {
  if (!isFirebaseConfigured) {
    const { collectionName, id } = docRef;
    const storageKey = `safecommute_mock_db_${collectionName}`;
    let docs = JSON.parse(localStorage.getItem(storageKey) || '[]');
    docs = docs.filter(d => d.id !== id);
    localStorage.setItem(storageKey, JSON.stringify(docs));
    return Promise.resolve();
  }
  return realDeleteDoc(docRef);
};
