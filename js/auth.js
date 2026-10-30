/**
 * EcoMatrix Authentication & Progress Tracking Module
 * Powered by Supabase & Row Level Security (RLS)
 */

(function () {
  const AuthState = {
    client: null,
    user: null,
    session: null,
    profile: null,
    isInitialized: false,
    authListeners: [],
    // In-memory recovery buffer for quiz attempts that failed network saving
    failedAttemptBuffer: null
  };

  /**
   * Initialize Supabase client using window.ECO_CONFIG
   */
  function initSupabase() {
    if (AuthState.client) return AuthState.client;

    const config = window.ECO_CONFIG || {};
    const url = config.SUPABASE_URL;
    const anonKey = config.SUPABASE_ANON_KEY;

    if (!url || url.includes("your-project-id")) {
      console.warn("EcoMatrix: Supabase URL not configured in js/config.js.");
      return null;
    }

    if (!anonKey || anonKey.includes("your-anon-publishable-key")) {
      console.warn("EcoMatrix: Supabase Anon Key not configured in js/config.js.");
      return null;
    }

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      console.error("EcoMatrix: Supabase SDK not loaded on window. Check network/ad-blocker.");
      return null;
    }

    try {
      AuthState.client = window.supabase.createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage
        }
      });

      // Listen for auth state changes
      AuthState.client.auth.onAuthStateChange(async (event, session) => {
        AuthState.session = session;
        AuthState.user = session ? session.user : null;

        if (AuthState.user) {
          await loadUserProfile(AuthState.user.id);
        } else {
          AuthState.profile = null;
        }

        notifyAuthListeners(event);
      });

      // Load initial session
      AuthState.client.auth.getSession().then(async ({ data, error }) => {
        if (!error && data && data.session) {
          AuthState.session = data.session;
          AuthState.user = data.session.user;
          await loadUserProfile(AuthState.user.id);
        }
        AuthState.isInitialized = true;
        notifyAuthListeners("INITIAL_LOAD");
      });

      return AuthState.client;
    } catch (err) {
      console.error("EcoMatrix: Error initializing Supabase:", err);
      return null;
    }
  }

  /**
   * Fetch student profile from public.profiles
   */
  async function loadUserProfile(userId) {
    if (!AuthState.client || !userId) return null;
    try {
      const { data, error } = await AuthState.client
        .from("profiles")
        .select("id, full_name, email, created_at")
        .eq("id", userId)
        .single();

      if (!error && data) {
        AuthState.profile = data;
        return data;
      }
      // Fallback from auth user metadata if profile row is still provisioning
      AuthState.profile = {
        id: userId,
        full_name: AuthState.user?.user_metadata?.full_name || AuthState.user?.email?.split("@")[0] || "Student",
        email: AuthState.user?.email || ""
      };
      return AuthState.profile;
    } catch (err) {
      console.warn("EcoMatrix: Could not load profile:", err);
      return null;
    }
  }

  /**
   * Register a new student (Email confirmation disabled by user configuration)
   */
  async function registerStudent(fullName, email, password) {
    const client = initSupabase();
    if (!client) {
      const cfg = window.ECO_CONFIG || {};
      if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes("your-project-id") || !cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_ANON_KEY.includes("your-anon-publishable-key")) {
        return { success: false, error: "Supabase credentials not configured in js/config.js. Please hard-refresh your browser (Ctrl+F5) to clear cached scripts." };
      }
      if (!window.supabase) {
        return { success: false, error: "Supabase library not loaded. Please disable ad-blockers for cdn.jsdelivr.net and refresh." };
      }
      return { success: false, error: "Supabase client initialization failed. Please hard-refresh (Ctrl+F5)." };
    }

    const cleanName = (fullName || "").trim();
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!cleanName) return { success: false, error: "Please enter your full name." };
    if (!cleanEmail || !cleanEmail.includes("@")) return { success: false, error: "Please enter a valid email address." };
    if (!password || password.length < 6) return { success: false, error: "Password must be at least 6 characters long." };

    try {
      const { data, error } = await client.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            full_name: cleanName
          }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      AuthState.user = data.user;
      AuthState.session = data.session;
      if (data.user) {
        await loadUserProfile(data.user.id);
      }
      return { success: true, user: data.user, session: data.session };
    } catch (err) {
      return { success: false, error: err.message || "Registration failed." };
    }
  }

  /**
   * Student Login
   */
  async function loginStudent(email, password) {
    const client = initSupabase();
    if (!client) {
      const cfg = window.ECO_CONFIG || {};
      if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes("your-project-id") || !cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_ANON_KEY.includes("your-anon-publishable-key")) {
        return { success: false, error: "Supabase credentials not configured in js/config.js. Please hard-refresh your browser (Ctrl+F5) to clear cached scripts." };
      }
      if (!window.supabase) {
        return { success: false, error: "Supabase library not loaded. Please disable ad-blockers for cdn.jsdelivr.net and refresh." };
      }
      return { success: false, error: "Supabase client initialization failed. Please hard-refresh (Ctrl+F5)." };
    }

    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail) return { success: false, error: "Please enter your email." };
    if (!password) return { success: false, error: "Please enter your password." };

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: cleanEmail,
        password: password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      AuthState.user = data.user;
      AuthState.session = data.session;
      if (data.user) {
        await loadUserProfile(data.user.id);
      }
      return { success: true, user: data.user, session: data.session };
    } catch (err) {
      return { success: false, error: err.message || "Login failed." };
    }
  }

  /**
   * Student Logout
   */
  async function logoutStudent() {
    if (!AuthState.client) {
      AuthState.user = null;
      AuthState.session = null;
      AuthState.profile = null;
      notifyAuthListeners("SIGNED_OUT");
      return { success: true };
    }

    try {
      await AuthState.client.auth.signOut();
      AuthState.user = null;
      AuthState.session = null;
      AuthState.profile = null;
      notifyAuthListeners("SIGNED_OUT");
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Password Reset
   */
  async function resetStudentPassword(email) {
    const client = initSupabase();
    if (!client) {
      return { success: false, error: "Supabase is not configured yet." };
    }

    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail) return { success: false, error: "Please enter your registered email address." };

    try {
      const { error } = await client.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: window.location.origin
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, message: "Password reset link sent to your email (if registered)." };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Save Completed Quiz Attempt with Strict Reliability, Anti-Duplication, and In-Memory Recovery
   */
  async function saveQuizAttempt(payload) {
    // Check if user is logged in
    if (!AuthState.user) {
      return { success: false, isGuest: true, message: "User not logged in." };
    }

    const client = initSupabase();
    if (!client) {
      // Buffer in memory for retry
      AuthState.failedAttemptBuffer = payload;
      return { success: false, error: "Database client unavailable. Quiz preserved in memory for retry." };
    }

    // Verify internal consistency: total = correct + incorrect + unanswered
    const total = Number(payload.total_questions) || 0;
    const correct = Number(payload.correct_answers) || 0;
    const incorrect = Number(payload.incorrect_answers) || 0;
    const unanswered = Number(payload.unanswered_questions) || (total - correct - incorrect);

    if (total <= 0 || (correct + incorrect + unanswered !== total)) {
      return { success: false, error: "Inconsistent question counts. Cannot save malformed quiz." };
    }

    // Consistent accuracy formula: round((correct / total) * 100)
    const accuracy = Number(((correct * 100.0) / total).toFixed(2));

    // Reuse or generate consistent idempotency key for this test attempt
    const idempotencyKey = payload.idempotency_key || `${AuthState.user.id}_${payload.sessionStartTime || Date.now()}_${payload.subject || "quiz"}`;

    const record = {
      student_id: AuthState.user.id,
      subject: payload.subject, // 'economics' | 'quantitative' | 'daily'
      selected_chapters: payload.selected_chapters || [],
      total_questions: total,
      correct_answers: correct,
      incorrect_answers: incorrect,
      unanswered_questions: unanswered,
      accuracy_percentage: accuracy,
      duration_seconds: payload.duration_seconds || 0,
      difficulty: payload.difficulty || "mix",
      mode: payload.mode || "practice",
      chapter_breakdown: payload.chapter_breakdown || {},
      idempotency_key: idempotencyKey
    };

    try {
      // Attempt insert
      const { data, error } = await client
        .from("quiz_attempts")
        .insert(record)
        .select()
        .single();

      if (error) {
        // Check if error is a duplicate key (already saved successfully)
        if (error.code === "23505" || error.message?.includes("idempotency_key") || error.details?.includes("idempotency_key")) {
          // Already saved successfully earlier
          AuthState.failedAttemptBuffer = null;
          return { success: true, isDuplicate: true, message: "Attempt already securely recorded." };
        }
        // Save failed: preserve in memory for student retry
        AuthState.failedAttemptBuffer = { ...payload, idempotency_key: idempotencyKey };
        return { success: false, error: error.message, bufferedAttempt: AuthState.failedAttemptBuffer };
      }

      // Success confirmed by Supabase
      AuthState.failedAttemptBuffer = null;
      return { success: true, data: data };
    } catch (err) {
      AuthState.failedAttemptBuffer = { ...payload, idempotency_key: idempotencyKey };
      return { success: false, error: err.message, bufferedAttempt: AuthState.failedAttemptBuffer };
    }
  }

  /**
   * Fetch student's full historical progress and calculate accurate statistics
   */
  async function fetchStudentDashboardData() {
    if (!AuthState.user) {
      return { success: false, error: "User is not authenticated." };
    }

    const client = initSupabase();
    if (!client) {
      return { success: false, error: "Supabase client not initialized." };
    }

    try {
      const { data: attempts, error } = await client
        .from("quiz_attempts")
        .select("*")
        .eq("student_id", AuthState.user.id)
        .order("completed_at", { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!attempts || attempts.length === 0) {
        return {
          success: true,
          isEmpty: true,
          totalQuizzes: 0,
          totalQuestions: 0,
          totalCorrect: 0,
          totalIncorrect: 0,
          totalUnanswered: 0,
          overallAccuracy: 0,
          subjectStats: {
            economics: { total: 0, correct: 0, accuracy: 0, quizzes: 0 },
            quantitative: { total: 0, correct: 0, accuracy: 0, quizzes: 0 }
          },
          chapterStats: {},
          weakChapters: [],
          attempts: []
        };
      }

      // Aggregate high-fidelity metrics
      let totalQuestions = 0;
      let totalCorrect = 0;
      let totalIncorrect = 0;
      let totalUnanswered = 0;

      const subjectStats = {
        economics: { total: 0, correct: 0, quizzes: 0 },
        quantitative: { total: 0, correct: 0, quizzes: 0 }
      };

      const chapterAggregates = {}; // key: "econ_1" or "quant_2"

      attempts.forEach((att) => {
        const qCount = Number(att.total_questions) || 0;
        const cCount = Number(att.correct_answers) || 0;
        const iCount = Number(att.incorrect_answers) || 0;
        const uCount = Number(att.unanswered_questions) || 0;

        totalQuestions += qCount;
        totalCorrect += cCount;
        totalIncorrect += iCount;
        totalUnanswered += uCount;

        if (subjectStats[att.subject]) {
          subjectStats[att.subject].total += qCount;
          subjectStats[att.subject].correct += cCount;
          subjectStats[att.subject].quizzes += 1;
        }

        // Aggregate genuine chapter breakdown without fabricating
        if (att.chapter_breakdown && typeof att.chapter_breakdown === "object") {
          Object.keys(att.chapter_breakdown).forEach((chId) => {
            const chKey = `${att.subject}_${chId}`;
            const chData = att.chapter_breakdown[chId];
            if (!chapterAggregates[chKey]) {
              chapterAggregates[chKey] = {
                subject: att.subject,
                chapterId: chId,
                name: chData.name || `Chapter ${chId}`,
                total: 0,
                correct: 0,
                incorrect: 0,
                unanswered: 0
              };
            }
            chapterAggregates[chKey].total += Number(chData.total) || 0;
            chapterAggregates[chKey].correct += Number(chData.correct) || 0;
            chapterAggregates[chKey].incorrect += Number(chData.incorrect) || 0;
            chapterAggregates[chKey].unanswered += Number(chData.unanswered) || 0;
          });
        }
      });

      // Overall accuracy formula: round((totalCorrect / totalQuestions) * 100)
      const overallAccuracy = totalQuestions > 0 ? Number(((totalCorrect * 100.0) / totalQuestions).toFixed(2)) : 0;

      // Subject accuracy
      if (subjectStats.economics.total > 0) {
        subjectStats.economics.accuracy = Math.round((subjectStats.economics.correct / subjectStats.economics.total) * 100);
      } else {
        subjectStats.economics.accuracy = 0;
      }

      if (subjectStats.quantitative.total > 0) {
        subjectStats.quantitative.accuracy = Math.round((subjectStats.quantitative.correct / subjectStats.quantitative.total) * 100);
      } else {
        subjectStats.quantitative.accuracy = 0;
      }

      // Calculate chapter accuracy and identify real weak chapters
      // Criteria for weak chapter: attempted at least 3 questions AND accuracy < 65%
      const weakChapters = [];
      Object.keys(chapterAggregates).forEach((k) => {
        const item = chapterAggregates[k];
        item.accuracy = item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0;
        if (item.total >= 3 && item.accuracy < 65) {
          weakChapters.push(item);
        }
      });

      // Sort weak chapters by accuracy ascending (lowest accuracy first)
      weakChapters.sort((a, b) => a.accuracy - b.accuracy);

      return {
        success: true,
        isEmpty: false,
        totalQuizzes: attempts.length,
        totalQuestions,
        totalCorrect,
        totalIncorrect,
        totalUnanswered,
        overallAccuracy,
        subjectStats,
        chapterStats: chapterAggregates,
        weakChapters,
        attempts // list of historical attempts
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  function onAuthChange(callback) {
    if (typeof callback === "function") {
      AuthState.authListeners.push(callback);
    }
  }

  function notifyAuthListeners(event) {
    AuthState.authListeners.forEach((fn) => {
      try {
        fn({
          event,
          user: AuthState.user,
          profile: AuthState.profile,
          session: AuthState.session
        });
      } catch (e) {
        console.error("Auth listener error:", e);
      }
    });
  }

  // Export to window
  window.EcoAuth = {
    init: initSupabase,
    register: registerStudent,
    login: loginStudent,
    logout: logoutStudent,
    resetPassword: resetStudentPassword,
    saveQuizAttempt,
    fetchDashboardData: fetchStudentDashboardData,
    onAuthChange,
    getUser: () => AuthState.user,
    getProfile: () => AuthState.profile,
    getSession: () => AuthState.session,
    getFailedAttemptBuffer: () => AuthState.failedAttemptBuffer
  };

  // Auto-init when DOM is ready
  document.addEventListener("DOMContentLoaded", () => {
    initSupabase();
  });
})();

