/* =============================================================
   NileLancers — Firebase Database (db.js)
   -------------------------------------------------------------
   Uses Firebase Authentication + Firestore.
   - Auth  : email/password login & registration
   - Store : user profiles in "users" collection

   SDK: Firebase v10 compat (works with any Firebase project config)
   ============================================================= */

const _firebaseConfig = {
  apiKey:            "AIzaSyAL0YVZsH3rG2nZ_A51Mm2HRncTxvEpPjQ",
  authDomain:        "nilelancers2.firebaseapp.com",
  projectId:         "nilelancers2",
  storageBucket:     "nilelancers2.firebasestorage.app",
  messagingSenderId: "61625924053",
  appId:             "1:61625924053:web:78fed86c8ad60f0b53a55c",
  measurementId:     "G-0KMYYX994M"
};

/* Initialize Firebase (guard against double-init) */
if (!firebase.apps.length) {
  firebase.initializeApp(_firebaseConfig);
}

const _auth = firebase.auth();
const _db   = firebase.firestore();
const _storage = firebase.storage();

/* Session key (localStorage cache — for instant getSession()) */
var SESSION_KEY = 'nl_user';

function _saveSession(userData) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
  return userData;
}

function _clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

/* =============================================================
   UserDB — Public Auth API
   ============================================================= */
window.UserDB = {

  /* ----------------------------------------------------------
     uploadFile(file, path, onProgress)
     Returns Promise<string> (downloadUrl)
     ---------------------------------------------------------- */
  uploadFile: function (file, path, onProgress) {
    return new Promise(function (resolve, reject) {
      var ref = _storage.ref(path + '/' + Date.now() + '_' + file.name);
      var task = ref.put(file);
      task.on('state_changed', 
        function (snap) { if (onProgress) onProgress((snap.bytesTransferred / snap.totalBytes) * 100); },
        function (err) { reject(err); },
        function () { task.snapshot.ref.getDownloadURL().then(resolve).catch(reject); }
      );
    });
  },

  /* ----------------------------------------------------------
     login({ email, password })
     Returns Promise<{ ok, user } | { ok: false, error }>
     ---------------------------------------------------------- */
  login: function (opts) {
    var email    = (opts.email    || '').toLowerCase().trim();
    var password = (opts.password || '');

    return _auth.signInWithEmailAndPassword(email, password)
      .then(function (cred) {
        return _db.collection('users').doc(cred.user.uid).get();
      })
      .then(function (doc) {
        if (!doc.exists) return { ok: false, error: 'profile_missing' };
        var userData = Object.assign({ id: doc.id }, doc.data());
        _saveSession(userData);
        return { ok: true, user: userData };
      })
      .catch(function (err) {
        console.warn('[UserDB.login]', err.code, err.message);
        if (err.code === 'auth/user-not-found'  ||
            err.code === 'auth/invalid-email')    return { ok: false, error: 'not_found' };
        if (err.code === 'auth/wrong-password'  ||
            err.code === 'auth/invalid-credential') return { ok: false, error: 'wrong_password' };
        return { ok: false, error: err.message || 'unknown' };
      });
  },

  /* ----------------------------------------------------------
     register({ name, username, email, password, role })
     Returns Promise<{ ok, user } | { ok: false, error }>
     ---------------------------------------------------------- */
  register: function (opts) {
    var name             = (opts.name             || '').trim();
    var username         = (opts.username         || '').trim().toLowerCase();
    var email            = (opts.email            || '').toLowerCase().trim();
    var password         = (opts.password         || '');
    var role             = opts.role || 'freelancer';
    var phone            = (opts.phone            || '').trim();
    var location         = (opts.location         || '').trim();
    var bio              = (opts.bio              || '').trim();
    var yearsOfExperience = opts.yearsOfExperience ? Number(opts.yearsOfExperience) : null;
    var companyName      = (opts.companyName      || '').trim();
    var hourlyRate       = opts.hourlyRate ? Number(opts.hourlyRate) : null;
    var portfolioUrl     = (opts.portfolioUrl     || '').trim();
    var availabilityStatus = opts.availabilityStatus || 'Available';

    /* Step 1 — check username uniqueness (best-effort; skip if Firestore rules block it) */
    var usernameCheck = _db.collection('users').where('username', '==', username).get()
      .then(function (snap) {
        if (!snap.empty) return Promise.reject({ _type: 'username_taken' });
      })
      .catch(function (err) {
        /* If it’s our own rejection, re-throw it */
        if (err && err._type === 'username_taken') return Promise.reject(err);
        /* If it’s a Firestore permission or network error, log and skip the check */
        console.warn('[UserDB.register] Username check skipped:', err.code || err.message);
      });

    return usernameCheck
      .then(function () {
        /* Step 2 — create Firebase Auth user */
        return _auth.createUserWithEmailAndPassword(email, password);
      })
      .then(function (cred) {
        /* Step 3 — store profile in Firestore */
        var userData = {
          id:               cred.user.uid,
          name:             name,
          username:         username,
          email:            email,
          role:             role,
          phone:            phone,
          location:         location,
          bio:              bio,
          yearsOfExperience: yearsOfExperience,
          createdAt:        new Date().toISOString()
        };

        if (role === 'client') {
          userData.companyName = companyName;
          userData.totalSpent = 0;
          userData.projectsPosted = 0;
          userData.membership = 'free';
        } else {
          userData.hourlyRate = hourlyRate;
          userData.portfolioUrl = portfolioUrl;
          userData.availabilityStatus = availabilityStatus;
          userData.totalEarnings = 0;
          userData.completedJobs = 0;
          userData.ratingAvg = 0;
          userData.membership = 'free';
          userData.bidsRemaining = 5; // Default for free plan
        }
        return _db.collection('users').doc(cred.user.uid).set(userData)
          .then(function () { return userData; });
      })
      .then(function (userData) {
        _saveSession(userData);
        return { ok: true, user: userData };
      })
      .catch(function (err) {
        console.warn('[UserDB.register] Error:', err.code || err._type, err.message || err);
        if (err._type === 'username_taken')                  return { ok: false, error: 'username_taken' };
        if (err.code  === 'auth/email-already-in-use')       return { ok: false, error: 'email_taken' };
        if (err.code  === 'auth/weak-password')              return { ok: false, error: 'weak_password' };
        if (err.code  === 'auth/invalid-email')              return { ok: false, error: 'not_found' };
        if (err.code  === 'auth/operation-not-allowed')      return { ok: false, error: 'auth_disabled', message: 'Email/Password sign-in is not enabled in Firebase Console.' };
        if (err.code  === 'permission-denied' ||
            err.code  === 'firestore/permission-denied')     return { ok: false, error: 'permission_denied', message: 'Firestore rules are blocking writes. Set Firestore to test mode.' };
        return { ok: false, error: 'unknown', message: err.message || String(err) };
      });
  },

  /* ----------------------------------------------------------
     getSession()  — synchronous, reads localStorage cache
     ---------------------------------------------------------- */
  getSession: function () {
    try {
      var s = JSON.parse(localStorage.getItem(SESSION_KEY));
      return s || null;
    } catch (e) { return null; }
  },

  /* ----------------------------------------------------------
     logout()  — signs out of Firebase + clears cache
     ---------------------------------------------------------- */
  logout: function () {
    _clearSession();
    return _auth.signOut();
  },

  /* ----------------------------------------------------------
     onAuthStateChanged(callback)
     Keeps the React user state in real-time sync with Firebase.
     Returns the unsubscribe function.
     ---------------------------------------------------------- */
  onAuthStateChanged: function (callback) {
    return _auth.onAuthStateChanged(function (firebaseUser) {
      if (!firebaseUser) {
        _clearSession();
        callback(null);
        return;
      }
      /* Refresh profile from Firestore on every auth state change */
      _db.collection('users').doc(firebaseUser.uid).get()
        .then(function (doc) {
          if (doc.exists) {
            var userData = Object.assign({ id: doc.id }, doc.data());
            _saveSession(userData);
            callback(userData);
          } else {
            _clearSession();
            callback(null);
          }
        })
        .catch(function (err) {
          console.error('[UserDB.onAuthStateChanged]', err);
          callback(null);
        });
    });
  },

  /* ----------------------------------------------------------
     listUsers()  — admin helper; returns Promise<Array>
     ---------------------------------------------------------- */
  listUsers: function () {
    return _db.collection('users').get().then(function (snap) {
      return snap.docs.map(function (doc) {
        var d = doc.data();
        return {
          id: doc.id, name: d.name, username: d.username,
          email: d.email, role: d.role, createdAt: d.createdAt
        };
      });
    });
  },

  /* ----------------------------------------------------------
     listJobs(limitCount?)
     Returns Promise<Array> — reads from Firestore "jobs" collection.
     Sort order (client-side, no composite index needed):
       1. User-posted jobs (have postedBy) — newest createdAt first
       2. Seed / mock jobs (no postedBy) — by their numeric `order` asc
     ---------------------------------------------------------- */
  listJobs: function (limitCount) {
    return _db.collection('jobs').get()
      .then(function (snap) {
        var all = snap.docs.map(function (doc) {
          return Object.assign({ id: doc.id }, doc.data());
        });

        /* Split into user-created vs seed jobs */
        var userJobs = all.filter(function (j) { return !!j.postedBy; });
        var seedJobs = all.filter(function (j) { return !j.postedBy; });

        /* User jobs: newest createdAt first */
        userJobs.sort(function (a, b) {
          return (b.createdAt || '') > (a.createdAt || '') ? 1 : -1;
        });

        /* Seed jobs: by numeric order field asc */
        seedJobs.sort(function (a, b) {
          return (a.order || 0) - (b.order || 0);
        });

        var sorted = userJobs.concat(seedJobs);
        return limitCount ? sorted.slice(0, limitCount) : sorted;
      })
      .catch(function (err) {
        console.warn('[UserDB.listJobs]', err.message);
        return [];
      });
  },

  /* ----------------------------------------------------------
     listCategories() — reads from Firestore "categories" collection
     Falls back to DB_SEED_CATEGORIES if Firestore is unavailable
     ---------------------------------------------------------- */
  listCategories: function () {
    return _db.collection('categories').orderBy('name').get()
      .then(function (snap) {
        if (snap.empty) return window.DB_SEED_CATEGORIES || [];
        return snap.docs.map(function (doc) { return Object.assign({ id: doc.id }, doc.data()); });
      })
      .catch(function () { return window.DB_SEED_CATEGORIES || []; });
  },

  /* ----------------------------------------------------------
     listSkills(categoryFilter?) — reads from Firestore "skills"
     Returns Promise<Array>. Pass category string to filter.
     ---------------------------------------------------------- */
  listSkills: function (categoryFilter) {
    var query = categoryFilter
      ? _db.collection('skills').where('category', '==', categoryFilter).orderBy('name')
      : _db.collection('skills').orderBy('name');
    return query.get()
      .then(function (snap) {
        if (snap.empty) {
          var fallback = window.DB_SEED_SKILLS || [];
          return categoryFilter ? fallback.filter(function (s) { return s.category === categoryFilter; }) : fallback;
        }
        return snap.docs.map(function (doc) { return Object.assign({ id: doc.id }, doc.data()); });
      })
      .catch(function () {
        var fallback = window.DB_SEED_SKILLS || [];
        return categoryFilter ? fallback.filter(function (s) { return s.category === categoryFilter; }) : fallback;
      });
  },

  /* ----------------------------------------------------------
     updateProfile(uid, data)  — update user fields in Firestore
     Returns Promise<{ ok } | { ok: false, error }>
     ---------------------------------------------------------- */
  updateProfile: function (uid, data) {
    return _db.collection('users').doc(uid).update(data)
      .then(function () {
        /* Refresh session cache */
        var session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
        if (session) {
          _saveSession(Object.assign({}, session, data));
        }
        return { ok: true };
      })
      .catch(function (err) {
        console.warn('[UserDB.updateProfile]', err.message);
        return { ok: false, error: err.message };
      });
  },

  /* ----------------------------------------------------------
     addJob(jobData)  — for clients to post new services
     Returns Promise<{ ok, id } | { ok: false, error }>
     ---------------------------------------------------------- */
  addJob: function (jobData) {
    return _db.collection('jobs').add(Object.assign({}, jobData, {
      createdAt: new Date().toISOString()
    })).then(function (ref) {
      return { ok: true, id: ref.id };
    }).catch(function (err) {
      console.warn('[UserDB.addJob]', err.message);
      return { ok: false, error: err.message };
    });
  },

  /* ----------------------------------------------------------
     applyToJob(jobId, userId)
     Creates doc in "applications" collection. Idempotent.
     ---------------------------------------------------------- */
  applyToJob: function (jobId, userId) {
    var docId = jobId + '_' + userId;
    var userRef = _db.collection('users').doc(userId);
    
    return _db.collection('applications').doc(docId).get().then(function(doc) {
      if (doc.exists) return { ok: true }; // Already applied
      
      return userRef.get().then(function(userDoc) {
        var userData = userDoc.data();
        if (userData.membership === 'free' && (userData.bidsRemaining || 0) <= 0) {
          return Promise.reject({ message: 'No bids remaining. Upgrade your plan!' });
        }
        
        var batch = _db.batch();
        batch.set(_db.collection('applications').doc(docId), {
          jobId: jobId, userId: userId, appliedAt: new Date().toISOString(), status: 'pending'
        });
        
        if (userData.membership !== 'unlimited') {
          batch.update(userRef, { bidsRemaining: firebase.firestore.FieldValue.increment(-1) });
        }
        
        return batch.commit().then(function() { return { ok: true }; });
      });
    }).catch(function (err) {
      console.warn('[UserDB.applyToJob]', err.message);
      return { ok: false, error: err.message };
    });
  },

  /* ----------------------------------------------------------
     withdrawApplication(jobId, userId) — deletes the doc
     ---------------------------------------------------------- */
  withdrawApplication: function (jobId, userId) {
    var docId = jobId + '_' + userId;
    return _db.collection('applications').doc(docId).delete()
      .then(function () { return { ok: true }; })
      .catch(function (err) {
        console.warn('[UserDB.withdrawApplication]', err.message);
        return { ok: false, error: err.message };
      });
  },

  /* ----------------------------------------------------------
     saveJob(jobId, userId)  — bookmark a job for a user
     Stores a doc in "saved_jobs" collection.  Idempotent.
     ---------------------------------------------------------- */
  saveJob: function (jobId, userId) {
    var docId = userId + '_' + jobId;
    return _db.collection('saved_jobs').doc(docId).set({
      jobId: jobId, userId: userId, savedAt: new Date().toISOString()
    }).then(function () {
      return { ok: true };
    }).catch(function (err) {
      console.warn('[UserDB.saveJob]', err.message);
      return { ok: false, error: err.message };
    });
  },

  /* ----------------------------------------------------------
     unsaveJob(jobId, userId)  — remove a bookmark
     ---------------------------------------------------------- */
  unsaveJob: function (jobId, userId) {
    var docId = userId + '_' + jobId;
    return _db.collection('saved_jobs').doc(docId).delete()
      .then(function () { return { ok: true }; })
      .catch(function (err) {
        console.warn('[UserDB.unsaveJob]', err.message);
        return { ok: false, error: err.message };
      });
  },

  /* ----------------------------------------------------------
     getSavedJobIds(userId)  — list of saved jobIds for a user
     Returns Promise<string[]>
     ---------------------------------------------------------- */
  getSavedJobIds: function (userId) {
    return _db.collection('saved_jobs').where('userId', '==', userId).get()
      .then(function (snap) {
        return snap.docs.map(function (doc) { return doc.data().jobId; });
      })
      .catch(function (err) {
        console.warn('[UserDB.getSavedJobIds]', err.message);
        return [];
      });
  },

  /* ----------------------------------------------------------
     getSavedJobs(userId)  — full job objects for saved IDs
     Returns Promise<Array>  (empty array if none saved)
     ---------------------------------------------------------- */
  getSavedJobs: function (userId) {
    return window.UserDB.getSavedJobIds(userId).then(function (ids) {
      if (!ids.length) return [];
      /* Firestore "in" query max 10 — batch if needed */
      var CHUNK = 10;
      var chunks = [];
      for (var i = 0; i < ids.length; i += CHUNK) {
        chunks.push(ids.slice(i, i + CHUNK));
      }
      return Promise.all(chunks.map(function (chunk) {
        return _db.collection('jobs').where(firebase.firestore.FieldPath.documentId(), 'in', chunk).get()
          .then(function (snap) {
            return snap.docs.map(function (doc) { return Object.assign({ id: doc.id }, doc.data()); });
          });
      })).then(function (results) {
        return [].concat.apply([], results);
      });
    }).catch(function (err) {
      console.warn('[UserDB.getSavedJobs]', err.message);
      return [];
    });
  },

  /* ----------------------------------------------------------
     listMyApplications(userId) — freelancer's own applications
     Returns Promise<Array<{ jobId, appliedAt, status }>>
     ---------------------------------------------------------- */
  listMyApplications: function (userId) {
    return _db.collection('applications').where('userId', '==', userId).get()
      .then(function (snap) {
        return snap.docs.map(function (doc) {
          return Object.assign({ id: doc.id }, doc.data());
        });
      })
      .catch(function (err) {
        console.warn('[UserDB.listMyApplications]', err.message);
        return [];
      });
  },

  /* ----------------------------------------------------------
     listJobApplications(jobId) — all applicants for a job (client view)
     Returns Promise<Array<{ userId, appliedAt, status }>>
     ---------------------------------------------------------- */
  listJobApplications: function (jobId) {
    return _db.collection('applications').where('jobId', '==', jobId).get()
      .then(function (snap) {
        return snap.docs.map(function (doc) {
          return Object.assign({ id: doc.id }, doc.data());
        });
      })
      .catch(function (err) {
        console.warn('[UserDB.listJobApplications]', err.message);
        return [];
      });
  },

  /* ----------------------------------------------------------
     updateApplicationStatus(appId, status, clientMessage?)
     status: 'accepted' | 'rejected' | 'pending'
     Optionally attaches a message from the client.
     ---------------------------------------------------------- */
  updateApplicationStatus: function (appId, status, clientMessage) {
    var update = {
      status: status,
      respondedAt: new Date().toISOString()
    };
    if (clientMessage) update.clientMessage = clientMessage;
    return _db.collection('applications').doc(appId).update(update)
      .then(function () { return { ok: true }; })
      .catch(function (err) {
        console.warn('[UserDB.updateApplicationStatus]', err.message);
        return { ok: false, error: err.message };
      });
  },

  /* ----------------------------------------------------------
     addReview(freelancerId, clientId, rating, comment, jobId)
     Adds a review and updates the freelancer's average rating
     ---------------------------------------------------------- */
  addReview: function(freelancerId, clientId, rating, comment, jobId) {
    return _db.collection('reviews').add({
      freelancerId: freelancerId,
      clientId: clientId,
      rating: Number(rating),
      comment: comment,
      jobId: jobId,
      createdAt: new Date().toISOString()
    }).then(function() {
      // Recalculate average rating
      return _db.collection('reviews').where('freelancerId', '==', freelancerId).get();
    }).then(function(snap) {
      if (snap.empty) return;
      var total = 0;
      snap.docs.forEach(function(d) { total += d.data().rating || 0; });
      var avg = total / snap.size;
      return _db.collection('users').doc(freelancerId).update({
        rating: avg,
        reviewCount: snap.size
      });
    }).then(function() {
      return { ok: true };
    }).catch(function(err) {
      console.warn('[UserDB.addReview]', err.message);
      return { ok: false, error: err.message };
    });
  },

  /* ----------------------------------------------------------
     listMyPostedJobs(userId) — jobs posted by a client
     Returns Promise<Array>  (sorted newest-first on client to avoid
     requiring a Firestore composite index on postedBy + createdAt)
     ---------------------------------------------------------- */
  listMyPostedJobs: function (userId) {
    return _db.collection('jobs')
      .where('postedBy', '==', userId)
      .get()
      .then(function (snap) {
        var jobs = snap.docs.map(function (doc) {
          return Object.assign({ id: doc.id }, doc.data());
        });
        /* Sort newest-first on the client — no composite index needed */
        jobs.sort(function (a, b) {
          return (b.createdAt || '') > (a.createdAt || '') ? 1 : -1;
        });
        return jobs;
      })
      .catch(function (err) {
        console.warn('[UserDB.listMyPostedJobs]', err.code, err.message);
        return [];
      });
  },

  /* ----------------------------------------------------------
     deleteJob(jobId)
     Deletes the job doc + all its applications in a batch.
     Returns Promise<{ ok } | { ok: false, error }>
     ---------------------------------------------------------- */
  deleteJob: function (jobId) {
    var batch = _db.batch();
    /* Delete the job itself */
    batch.delete(_db.collection('jobs').doc(jobId));
    /* Find and delete all applications for this job */
    return _db.collection('applications').where('jobId', '==', jobId).get()
      .then(function (snap) {
        snap.docs.forEach(function (doc) { batch.delete(doc.ref); });
        return batch.commit();
      })
      .then(function () { return { ok: true }; })
      .catch(function (err) {
        console.warn('[UserDB.deleteJob]', err.message);
        return { ok: false, error: err.message };
      });
  },

  /* ----------------------------------------------------------
     listApplicationsForClient(userId)
     Returns all applications for every job posted by this client,
     enriched with job title + applicant display name.
     Returns Promise<Array<{ ...app, jobTitle, applicantName }>>
     ---------------------------------------------------------- */
  listApplicationsForClient: function (userId) {
    /* Step 1 — get the client's jobs */
    return window.UserDB.listMyPostedJobs(userId).then(function (myJobs) {
      if (!myJobs.length) return [];
      /* Step 2 — for each job, load its applications */
      return Promise.all(myJobs.map(function (job) {
        return _db.collection('applications').where('jobId', '==', job.id).get()
          .then(function (snap) {
            return snap.docs.map(function (doc) {
              return Object.assign({ id: doc.id, jobTitle: job.title, jobIcon: job.icon, jobColor: job.color }, doc.data());
            });
          });
      })).then(function (results) {
        var allApps = [].concat.apply([], results);
        if (!allApps.length) return [];
        /* Step 3 — batch-load applicant display names */
        var uniqueUserIds = allApps.map(function (a) { return a.userId; })
          .filter(function (v, i, arr) { return arr.indexOf(v) === i; });
        var CHUNK = 10;
        var chunks = [];
        for (var i = 0; i < uniqueUserIds.length; i += CHUNK) {
          chunks.push(uniqueUserIds.slice(i, i + CHUNK));
        }
        return Promise.all(chunks.map(function (chunk) {
          return _db.collection('users').where(firebase.firestore.FieldPath.documentId(), 'in', chunk).get()
            .then(function (snap) {
              var map = {};
              snap.docs.forEach(function (doc) {
                var d = doc.data();
                map[doc.id] = { name: d.name, username: d.username, email: d.email };
              });
              return map;
            });
        })).then(function (maps) {
          var userMap = Object.assign.apply(Object, [{}].concat(maps));
          return allApps.map(function (app) {
            var u = userMap[app.userId] || {};
            return Object.assign({}, app, {
              applicantName:     u.name     || 'Unknown',
              applicantUsername: u.username || '',
              applicantEmail:    u.email    || ''
            });
          });
        });
      });
    }).catch(function (err) {
      console.warn('[UserDB.listApplicationsForClient]', err.message);
      return [];
    });
  },

  /* ----------------------------------------------------------
     MESSAGES & NOTIFICATIONS (ERD Integration)
     ---------------------------------------------------------- */

  sendMessage: async function (senderId, receiverId, content) {
    try {
      const msg = {
        senderId,
        receiverId,
        content: content.trim(),
        timestamp: new Date().toISOString(),
        isRead: false,
        conversationId: [senderId, receiverId].sort().join('_')
      };
      const res = await _db.collection('messages').add(msg);
      
      // Stop typing on send
      await this.setTypingStatus(senderId, receiverId, false);
      
      // Add notification for receiver
      await this.addNotification(receiverId, 'message', 'You have a new message', 'messages');

      return { ok: true, id: res.id };
    } catch (e) { return { ok: false, error: e.message }; }
  },

  setTypingStatus: function(userId, targetId, isTyping) {
    const convoId = [userId, targetId].sort().join('_');
    return _db.collection('typing_status').doc(convoId + '_' + userId).set({
      userId, targetId, isTyping, lastUpdate: new Date().toISOString()
    });
  },

  subscribeToTypingStatus: function(targetId, userId, callback) {
    const convoId = [userId, targetId].sort().join('_');
    return _db.collection('typing_status').doc(convoId + '_' + targetId)
      .onSnapshot(doc => {
        if (doc.exists) callback(doc.data().isTyping);
        else callback(false);
      });
  },

  subscribeToMessages: function (userId, callback) {
    /* Listen for all messages where user is sender or receiver */
    return _db.collection('messages')
      .where('senderId', '==', userId)
      .onSnapshot(function (snap1) {
        _db.collection('messages')
          .where('receiverId', '==', userId)
          .onSnapshot(function (snap2) {
            var all = [];
            snap1.forEach(function (d) { all.push(Object.assign({ id: d.id }, d.data())); });
            snap2.forEach(function (d) { all.push(Object.assign({ id: d.id }, d.data())); });
            /* Sort by timestamp */
            all.sort(function (a, b) { return (a.timestamp > b.timestamp) ? 1 : -1; });
            callback(all);
          });
      });
  },

  markMessageRead: function (msgId) {
    return _db.collection('messages').doc(msgId).update({ isRead: true });
  },

  addNotification: function (userId, type, message, page, appId) {
    var note = {
      userId:    userId,
      type:      type || 'info', // info, success, warning, message
      message:   message,
      page:      page || '',
      appId:     appId || '',
      isRead:    false,
      timestamp: new Date().toISOString()
    };
    
    // Trigger Email Notification (Best effort)
    _db.collection('users').doc(userId).get().then(function(doc) {
      if (doc.exists && doc.data().email) {
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: doc.data().email,
            subject: 'New Notification from NileLancers',
            text: message + '\n\nCheck it out here: ' + window.location.origin
          })
        }).catch(function(e) { console.warn('Email notify failed:', e); });
      }
    });

    return _db.collection('notifications').add(note);
  },

  subscribeToNotifications: function (userId, callback) {
    return _db.collection('notifications')
      .where('userId', '==', userId)
      .onSnapshot(function (snap) {
        var notes = [];
        snap.forEach(function (doc) { notes.push(Object.assign({ id: doc.id }, doc.data())); });
        notes.sort(function (a, b) { return (b.timestamp > a.timestamp) ? 1 : -1; });
        callback(notes);
      });
  },

  /* ----------------------------------------------------------
     REVIEWS
     ---------------------------------------------------------- */
  addReview: function (freelancerId, clientId, rating, comment, jobId) {
    var review = {
      freelancerId: freelancerId,
      clientId:     clientId,
      rating:       Number(rating),
      comment:      comment,
      jobId:        jobId,
      timestamp:    new Date().toISOString()
    };
    return _db.collection('reviews').add(review);
  },

  subscribeToReviews: function (userId, callback) {
    return _db.collection('reviews')
      .where('freelancerId', '==', userId)
      .onSnapshot(function (snap) {
        var reviews = [];
        snap.forEach(function (doc) { reviews.push(Object.assign({ id: doc.id }, doc.data())); });
        reviews.sort(function (a, b) { return (b.timestamp > a.timestamp) ? 1 : -1; });
        callback(reviews);
      });
  },

  /* ----------------------------------------------------------
     VERIFICATION
     ---------------------------------------------------------- */
  submitVerification: function (userId, idPhotoUrl) {
    return _db.collection('verifications').doc(userId).set({
      userId:    userId,
      idPhoto:   idPhotoUrl,
      status:    'pending',
      timestamp: new Date().toISOString()
    });
  },

  getVerificationStatus: function (userId, callback) {
    return _db.collection('verifications').doc(userId).onSnapshot(function (doc) {
      callback(doc.exists ? doc.data() : null);
    });
  },

  listPendingVerifications: function () {
    return _db.collection('verifications').where('status', '==', 'pending').get().then(function (snap) {
      var list = [];
      snap.forEach(function (doc) { list.push(doc.data()); });
      return { ok: true, list: list };
    });
  },

  approveVerification: function (userId) {
    return _db.collection('verifications').doc(userId).update({ status: 'approved' }).then(function () {
      return _db.collection('users').doc(userId).update({ isVerified: true });
    });
  },

  markNotificationRead: function (noteId) {
    return _db.collection('notifications').doc(noteId).update({ isRead: true });
  }

};

/* =============================================================
   Job Seed Data — all 12 listings from the site
   Written to Firestore once (skipped if jobs already exist)
   ============================================================= */
window.DB_SEED_JOBS = [
  { order: 1,  title: 'Full-Stack Web Developer',       category: 'Web Development',    budget: 5000, type: 'local', skills: ['React', 'Node.js', 'Firebase'],                   deadline: '2026-06-01', days: 30,  icon: 'fa-laptop-code', color: '#0074D9', description: 'Build a modern web platform for our e-commerce startup using React and Node.js backend.' },
  { order: 2,  title: 'UI/UX Designer for Mobile App',  category: 'Design',             budget: 3500, type: 'local', skills: ['Figma', 'Prototyping', 'User Research'],         deadline: '2026-05-20', days: 21,  icon: 'fa-paint-brush', color: '#e74c3c', description: 'Design a beautiful and intuitive mobile app experience for iOS and Android.' },
  { order: 3,  title: 'Digital Marketing Specialist',   category: 'Marketing',          budget: 2500, type: 'local', skills: ['SEO', 'Google Ads', 'Social Media'],             deadline: '2026-05-15', days: 14,  icon: 'fa-chart-line',  color: '#f1c40f', description: 'Drive organic growth and manage paid campaigns for our growing brand.' },
  { order: 4,  title: 'React Native Mobile Developer',  category: 'Mobile Development', budget: 6000, type: 'local', skills: ['React Native', 'TypeScript', 'Redux'],           deadline: '2026-07-15', days: 45,  icon: 'fa-mobile-alt',  color: '#2ecc71', description: 'Develop a cross-platform mobile app for both iOS and Android platforms.' },
  { order: 5,  title: 'Content Writer & SEO Specialist',category: 'Writing',            budget: 1800, type: 'local', skills: ['SEO Writing', 'WordPress', 'Research'],          deadline: '2026-05-30', days: 21,  icon: 'fa-file-alt',    color: '#e67e22', description: 'Create high-quality, SEO-optimized blog posts and website copy.' },
  { order: 6,  title: 'Video Editor & Motion Designer', category: 'Other',              budget: 4000, type: 'local', skills: ['Premiere Pro', 'After Effects', 'Motion Graphics'],deadline: '2026-06-10', days: 30,  icon: 'fa-video',       color: '#9b59b6', description: 'Edit and produce professional marketing videos and motion graphics.' },
  { order: 7,  title: 'Python Data Scientist',          category: 'Web Development',    budget: 7500, type: 'intl',  skills: ['Python', 'Pandas', 'ML'],                        deadline: '2026-08-01', days: 60,  icon: 'fa-database',    color: '#3498db', description: 'Analyze large datasets and build machine learning models for our fintech startup.' },
  { order: 8,  title: 'Brand Identity Designer',        category: 'Design',             budget: 4500, type: 'local', skills: ['Illustrator', 'Brand Design', 'Logo'],           deadline: '2026-05-25', days: 28,  icon: 'fa-pen-nib',     color: '#e74c3c', description: 'Create a complete brand identity system including logo, colors and typography.' },
  { order: 9,  title: 'WordPress Developer',            category: 'Web Development',    budget: 2800, type: 'local', skills: ['WordPress', 'PHP', 'CSS'],                       deadline: '2026-05-10', days: 14,  icon: 'fa-wordpress',   color: '#21759b', description: 'Build and customize a WordPress site with WooCommerce integration.' },
  { order: 10, title: 'Social Media Manager',           category: 'Marketing',          budget: 2200, type: 'local', skills: ['Instagram', 'Facebook', 'Content'],              deadline: '2026-06-05', days: 21,  icon: 'fa-hashtag',     color: '#e1306c', description: 'Manage our social media channels and grow our brand presence.' },
  { order: 11, title: 'iOS Swift Developer',            category: 'Mobile Development', budget: 9000, type: 'intl',  skills: ['Swift', 'iOS', 'Xcode'],                         deadline: '2026-09-01', days: 90,  icon: 'fa-mobile-alt',  color: '#555555', description: 'Build a native iOS app for our health and fitness platform.' },
  { order: 12, title: 'Technical Content Writer',       category: 'Writing',            budget: 1500, type: 'local', skills: ['Technical Writing', 'SEO', 'Docs'],              deadline: '2026-06-20', days: 30,  icon: 'fa-pen',         color: '#27ae60', description: 'Write clear technical documentation and blog articles for our SaaS product.' }
];

/* =============================================================
   Category Seed Data — mirrors the ERD categories entity
   { id, name, description }
   ============================================================= */
window.DB_SEED_CATEGORIES = [
  { id: 'cat-1', name: 'Web Development',    description: 'Websites, web apps, APIs, and full-stack solutions.' },
  { id: 'cat-2', name: 'Design',             description: 'UI/UX, branding, logo, and graphic design.' },
  { id: 'cat-3', name: 'Marketing',          description: 'SEO, SEM, social media, and digital advertising.' },
  { id: 'cat-4', name: 'Mobile Development', description: 'Native and cross-platform iOS and Android apps.' },
  { id: 'cat-5', name: 'Writing',            description: 'Content writing, copywriting, SEO articles, and documentation.' },
  { id: 'cat-6', name: 'Other',              description: 'Video editing, motion graphics, and other creative services.' }
];

/* Auto-seed: write jobs to Firestore once if collection is empty */
(function _seedJobs() {
  _db.collection('jobs').limit(1).get()
    .then(function (snap) {
      if (!snap.empty) return; /* already seeded */
      var batch = _db.batch();
      window.DB_SEED_JOBS.forEach(function (job, i) {
        var ref = _db.collection('jobs').doc('job-' + (i + 1));
        batch.set(ref, job);
      });
      return batch.commit().then(function () {
        console.info('[NileLancers DB] Seeded', window.DB_SEED_JOBS.length, 'jobs to Firestore.');
      });
    })
    .catch(function (err) {
      console.warn('[NileLancers DB] Job seed skipped:', err.code || err.message);
    });
})();

/* =============================================================
   Skill Seed Data — mirrors the ERD skills entity
   { id, name, category } — unique skills across all seed jobs
   ============================================================= */
window.DB_SEED_SKILLS = [
  { id: 'sk-1',  name: 'React',            category: 'Web Development' },
  { id: 'sk-2',  name: 'Node.js',          category: 'Web Development' },
  { id: 'sk-3',  name: 'Firebase',         category: 'Web Development' },
  { id: 'sk-4',  name: 'Python',           category: 'Web Development' },
  { id: 'sk-5',  name: 'Pandas',           category: 'Web Development' },
  { id: 'sk-6',  name: 'ML',               category: 'Web Development' },
  { id: 'sk-7',  name: 'WordPress',        category: 'Web Development' },
  { id: 'sk-8',  name: 'PHP',              category: 'Web Development' },
  { id: 'sk-9',  name: 'CSS',              category: 'Web Development' },
  { id: 'sk-10', name: 'Figma',            category: 'Design' },
  { id: 'sk-11', name: 'Prototyping',      category: 'Design' },
  { id: 'sk-12', name: 'User Research',    category: 'Design' },
  { id: 'sk-13', name: 'Illustrator',      category: 'Design' },
  { id: 'sk-14', name: 'Brand Design',     category: 'Design' },
  { id: 'sk-15', name: 'Logo',             category: 'Design' },
  { id: 'sk-16', name: 'SEO',              category: 'Marketing' },
  { id: 'sk-17', name: 'Google Ads',       category: 'Marketing' },
  { id: 'sk-18', name: 'Social Media',     category: 'Marketing' },
  { id: 'sk-19', name: 'Instagram',        category: 'Marketing' },
  { id: 'sk-20', name: 'Facebook',         category: 'Marketing' },
  { id: 'sk-21', name: 'Content',          category: 'Marketing' },
  { id: 'sk-22', name: 'React Native',     category: 'Mobile Development' },
  { id: 'sk-23', name: 'TypeScript',       category: 'Mobile Development' },
  { id: 'sk-24', name: 'Redux',            category: 'Mobile Development' },
  { id: 'sk-25', name: 'Swift',            category: 'Mobile Development' },
  { id: 'sk-26', name: 'iOS',              category: 'Mobile Development' },
  { id: 'sk-27', name: 'Xcode',            category: 'Mobile Development' },
  { id: 'sk-28', name: 'SEO Writing',      category: 'Writing' },
  { id: 'sk-29', name: 'Research',         category: 'Writing' },
  { id: 'sk-30', name: 'Technical Writing',category: 'Writing' },
  { id: 'sk-31', name: 'Docs',             category: 'Writing' },
  { id: 'sk-32', name: 'Premiere Pro',     category: 'Other' },
  { id: 'sk-33', name: 'After Effects',    category: 'Other' },
  { id: 'sk-34', name: 'Motion Graphics',  category: 'Other' }
];

/* Auto-seed categories once */
(function _seedCategories() {
  _db.collection('categories').limit(1).get()
    .then(function (snap) {
      if (!snap.empty) return;
      var batch = _db.batch();
      window.DB_SEED_CATEGORIES.forEach(function (cat) {
        batch.set(_db.collection('categories').doc(cat.id), cat);
      });
      return batch.commit().then(function () {
        console.info('[NileLancers DB] Seeded', window.DB_SEED_CATEGORIES.length, 'categories.');
      });
    })
    .catch(function (err) { console.warn('[NileLancers DB] Category seed skipped:', err.code || err.message); });
})();

/* Auto-seed skills once */
(function _seedSkills() {
  _db.collection('skills').limit(1).get()
    .then(function (snap) {
      if (!snap.empty) return;
      var batch = _db.batch();
      window.DB_SEED_SKILLS.forEach(function (skill) {
        batch.set(_db.collection('skills').doc(skill.id), skill);
      });
      return batch.commit().then(function () {
        console.info('[NileLancers DB] Seeded', window.DB_SEED_SKILLS.length, 'skills.');
      });
    })
    .catch(function (err) { console.warn('[NileLancers DB] Skill seed skipped:', err.code || err.message); });
})();

/* =============================================================
   Admin Promotion
   Ensures the listed emails always have role === 'admin'
   in Firestore. Runs automatically on every page load.
   ============================================================= */
window.ADMIN_EMAILS = [
  'saad.ahmedgamal@gmail.com',
  'morad.karym@gmail.com'
];

window.UserDB.promoteToAdmin = function (emailList) {
  var emails = emailList || window.ADMIN_EMAILS;
  emails.forEach(function (email) {
    _db.collection('users')
      .where('email', '==', email.toLowerCase().trim())
      .get()
      .then(function (snap) {
        if (snap.empty) {
          console.info('[NileLancers DB] Admin promote: no user found for', email);
          return;
        }
        snap.docs.forEach(function (doc) {
          if (doc.data().role === 'admin') {
            console.info('[NileLancers DB] Already admin:', email);
            return;
          }
          doc.ref.update({ role: 'admin' }).then(function () {
            console.info('[NileLancers DB] Promoted to admin:', email);
          });
        });
      })
      .catch(function (err) {
        console.warn('[NileLancers DB] Admin promote error for', email, ':', err.message);
      });
  });
};

/* Run automatically on page load */
(function _promoteAdmins() {
  window.UserDB.promoteToAdmin(window.ADMIN_EMAILS);
})();
