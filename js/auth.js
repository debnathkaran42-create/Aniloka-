/* =========================================================
   ANILOKA — AUTH (ADVANCED, LOCAL ONLY)
   -----------------------------------------------------------
   Still no external backend/Firebase (added later per request),
   but upgraded from the plain-text demo version:
     - Passwords are hashed with SHA-256 (Web Crypto API) before
       ever touching storage — the raw password is never saved.
     - Failed login attempts are rate-limited per email
       (5 tries, then a 30s cooldown) to slow down brute force.
     - Sessions expire automatically after 7 days of inactivity.
   Honest limits: this still runs entirely in the browser, so a
   determined attacker with local device access can still read
   IndexedDB/localStorage. Real security needs a real backend —
   this is a meaningful upgrade over plain text, not a guarantee.
   ========================================================= */

const LOCAL_USERS_KEY = "aniloka_local_users";
const LOGIN_ATTEMPTS_KEY = "aniloka_login_attempts";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hashBuf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

const AUTH = {
  _localUsers() { return DB._read(LOCAL_USERS_KEY, {}); },
  _saveLocalUsers(u) { DB._write(LOCAL_USERS_KEY, u); },

  /* ---- Rate limiting ---- */
  _attempts() { return DB._read(LOGIN_ATTEMPTS_KEY, {}); },
  _recordFailure(email) {
    const a = this._attempts();
    a[email] = a[email] || { count: 0, lockedUntil: 0 };
    a[email].count += 1;
    if (a[email].count >= 5) a[email].lockedUntil = Date.now() + 30000;
    DB._write(LOGIN_ATTEMPTS_KEY, a);
  },
  _clearFailures(email) {
    const a = this._attempts();
    delete a[email];
    DB._write(LOGIN_ATTEMPTS_KEY, a);
  },
  _isLocked(email) {
    const a = this._attempts()[email];
    if (!a || !a.lockedUntil) return 0;
    const remaining = a.lockedUntil - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  },

  async signup({ username, email, password }) {
    email = email.trim().toLowerCase();

    // Real backend (once you've deployed /aniloka-backend and set BACKEND_URL in js/api.js)
    if (typeof API !== "undefined" && API.isConfigured()) {
      try {
        const { user } = await API.signup(username, email, password);
        this._afterAuth({ uid: user.id, email: user.email, username: user.username }, true);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    }

    // Local fallback (no backend configured yet)
    const users = this._localUsers();
    if (users[email]) return { ok: false, error: "An account with this email already exists." };
    if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };

    const uid = "local_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const passwordHash = await sha256Hex(password + ":" + uid); // uid acts as a per-user salt
    users[email] = { uid, username, email, passwordHash };
    this._saveLocalUsers(users);
    this._afterAuth({ uid, email, username });
    return { ok: true };
  },

  async login({ email, password }) {
    email = email.trim().toLowerCase();

    if (typeof API !== "undefined" && API.isConfigured()) {
      try {
        const { user } = await API.login(email, password);
        this._afterAuth({ uid: user.id, email: user.email, username: user.username, role: user.role }, true);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    }

    const lockedFor = this._isLocked(email);
    if (lockedFor > 0) {
      return { ok: false, error: `Too many attempts. Try again in ${lockedFor}s.` };
    }

    const users = this._localUsers();
    const u = users[email];
    if (!u) { this._recordFailure(email); return { ok: false, error: "Incorrect email or password." }; }

    const hash = await sha256Hex(password + ":" + u.uid);
    if (hash !== u.passwordHash) {
      this._recordFailure(email);
      return { ok: false, error: "Incorrect email or password." };
    }

    this._clearFailures(email);
    this._afterAuth({ uid: u.uid, email: u.email, username: u.username });
    return { ok: true };
  },

  async forgotPassword(email) {
    email = email.trim().toLowerCase();

    if (typeof API !== "undefined" && API.isConfigured()) {
      try {
        const res = await API.forgotPassword(email);
        return { ok: true, message: res.message };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    }

    const users = this._localUsers();
    if (!users[email]) return { ok: false, error: "No account found with this email." };
    return { ok: true, message: "Password reset isn't wired to a real email service yet — this is a local demo account." };
  },

  logout() {
    if (typeof API !== "undefined" && API.isConfigured()) {
      API.logout().catch(() => {}); // best-effort; clear local session regardless
    }
    DB.clearSession();
    window.location.href = "login.html";
  },

  _afterAuth({ uid, email, username, role }, fromBackend = false) {
    DB.setSession({ uid, email, username, role: role || "user", fromBackend, loggedInAt: Date.now() });
    if (!DB.getUser(uid)) {
      DB.saveUser(uid, {
        username, email, avatarInitial: username.charAt(0).toUpperCase(),
        isPremium: false, premiumPlan: null, joined: new Date().toISOString()
      });
    }
  },

  currentUser() {
    const session = DB.getSession();
    if (!session) return null;
    // Backend sessions expire server-side (the httpOnly cookie itself times out) — only
    // enforce the local 7-day cap for the local-only fallback auth.
    if (!session.fromBackend && Date.now() - (session.loggedInAt || 0) > SESSION_MAX_AGE_MS) {
      DB.clearSession();
      return null;
    }
    return session;
  },

  isAdmin() {
    const session = this.currentUser();
    return !!session && session.role === "admin";
  },

  requireLogin() {
    if (!this.currentUser()) {
      window.location.href = "login.html";
      return false;
    }
    return true;
  }
};
