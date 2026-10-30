/**
 * EcoMatrix Student Dashboard & Auth UI Controller
 */

(function () {
  let progressChartInstance = null;

  // Chapter Name Maps for Human-Readable Reporting
  const ECON_CHAPTER_NAMES = {
    1: "Price Elasticity & Demand",
    2: "Money, Banking & Monetary Policy",
    3: "National Income & Macro Aggregates",
    4: "Market Structures & Price Determination",
    5: "Theory of Production & Cost"
  };

  const QUANT_CHAPTER_NAMES = {
    1: "Ratio, Proportion & Logarithms",
    2: "Equations & Matrices",
    3: "Linear Inequalities",
    4: "Time Value of Money & Annuities",
    5: "Permutations & Combinations",
    6: "Sequence & Series (AP & GP)",
    7: "Sets, Relations & Functions",
    8: "Measures of Central Tendency & Dispersion",
    9: "Correlation & Regression Analysis",
    10: "Theoretical Probability Distributions"
  };

  /**
   * Helper to format human dates
   */
  function formatDate(isoStr) {
    if (!isoStr) return "Just now";
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return isoStr;
    }
  }

  /**
   * Render Auth Modal HTML dynamically if not already present
   */
  function setupAuthModal() {
    if (document.getElementById("auth-modal")) return;

    const modal = document.createElement("div");
    modal.id = "auth-modal";
    modal.className = "auth-modal-overlay hidden";
    modal.innerHTML = `
      <div class="auth-modal-card">
        <button class="auth-modal-close" id="auth-modal-close-btn" aria-label="Close">&times;</button>
        
        <div class="auth-header">
          <div class="auth-brand-icon"><i class="fa-solid fa-graduation-cap"></i></div>
          <h2 class="auth-title" id="auth-title">Student Portal</h2>
          <p class="auth-subtitle" id="auth-subtitle">Sign in to track your test progress and analytics</p>
        </div>

        <div class="auth-tabs">
          <button class="auth-tab-btn active" data-tab="login">Sign In</button>
          <button class="auth-tab-btn" data-tab="register">Register</button>
          <button class="auth-tab-btn" data-tab="forgot">Reset Password</button>
        </div>

        <!-- Alert Banner -->
        <div class="auth-alert hidden" id="auth-alert"></div>

        <!-- Tab 1: Login Form -->
        <form class="auth-form" id="auth-form-login">
          <div class="form-group">
            <label class="form-label" for="login-email">Email Address</label>
            <input type="email" id="login-email" class="form-input" placeholder="name@example.com" required autocomplete="email" />
          </div>
          <div class="form-group">
            <div class="form-label-row">
              <label class="form-label" for="login-password">Password</label>
              <a href="#" class="auth-link" id="goto-forgot-link">Forgot?</a>
            </div>
            <input type="password" id="login-password" class="form-input" placeholder="••••••••" required autocomplete="current-password" />
          </div>
          <button type="submit" class="auth-submit-btn" id="login-submit-btn">
            <span class="btn-text">Sign In</span>
            <i class="fa-solid fa-arrow-right"></i>
          </button>
        </form>

        <!-- Tab 2: Register Form -->
        <form class="auth-form hidden" id="auth-form-register">
          <div class="form-group">
            <label class="form-label" for="reg-name">Full Name</label>
            <input type="text" id="reg-name" class="form-input" placeholder="Your Name" required autocomplete="name" maxlength="80" />
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-email">Email Address</label>
            <input type="email" id="reg-email" class="form-input" placeholder="name@example.com" required autocomplete="email" />
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-password">Create Password</label>
            <input type="password" id="reg-password" class="form-input" placeholder="Minimum 6 characters" required minlength="6" autocomplete="new-password" />
          </div>
          <button type="submit" class="auth-submit-btn" id="reg-submit-btn">
            <span class="btn-text">Create Student Account</span>
            <i class="fa-solid fa-user-plus"></i>
          </button>
        </form>

        <!-- Tab 3: Forgot Password Form -->
        <form class="auth-form hidden" id="auth-form-forgot">
          <p class="auth-hint">Enter your email and we'll send you a password reset link.</p>
          <div class="form-group">
            <label class="form-label" for="forgot-email">Registered Email</label>
            <input type="email" id="forgot-email" class="form-input" placeholder="name@example.com" required autocomplete="email" />
          </div>
          <button type="submit" class="auth-submit-btn" id="forgot-submit-btn">
            <span class="btn-text">Send Reset Link</span>
            <i class="fa-solid fa-paper-plane"></i>
          </button>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Event Listeners for Modal
    const closeBtn = document.getElementById("auth-modal-close-btn");
    closeBtn.addEventListener("click", () => hideAuthModal());

    modal.addEventListener("click", (e) => {
      if (e.target === modal) hideAuthModal();
    });

    const tabBtns = modal.querySelectorAll(".auth-tab-btn");
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-tab");
        switchAuthTab(tab);
      });
    });

    const forgotLink = document.getElementById("goto-forgot-link");
    if (forgotLink) {
      forgotLink.addEventListener("click", (e) => {
        e.preventDefault();
        switchAuthTab("forgot");
      });
    }

    // Form Submissions
    const loginForm = document.getElementById("auth-form-login");
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email").value;
      const pass = document.getElementById("login-password").value;
      const submitBtn = document.getElementById("login-submit-btn");

      setBtnLoading(submitBtn, true, "Signing in...");
      clearAuthAlert();

      const res = await window.EcoAuth.login(email, pass);
      setBtnLoading(submitBtn, false, "Sign In");

      if (res.success) {
        showAuthAlert("Welcome back! Successfully logged in.", "success");
        setTimeout(() => {
          hideAuthModal();
          renderDashboard();
        }, 800);
      } else {
        showAuthAlert(res.error || "Login failed. Please check credentials.", "error");
      }
    });

    const regForm = document.getElementById("auth-form-register");
    regForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("reg-name").value;
      const email = document.getElementById("reg-email").value;
      const pass = document.getElementById("reg-password").value;
      const submitBtn = document.getElementById("reg-submit-btn");

      setBtnLoading(submitBtn, true, "Creating Account...");
      clearAuthAlert();

      const res = await window.EcoAuth.register(name, email, pass);
      setBtnLoading(submitBtn, false, "Create Student Account");

      if (res.success) {
        showAuthAlert("Account created successfully! Welcome to EcoMatrix.", "success");
        setTimeout(() => {
          hideAuthModal();
          renderDashboard();
        }, 900);
      } else {
        showAuthAlert(res.error || "Registration failed.", "error");
      }
    });

    const forgotForm = document.getElementById("auth-form-forgot");
    forgotForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("forgot-email").value;
      const submitBtn = document.getElementById("forgot-submit-btn");

      setBtnLoading(submitBtn, true, "Sending Link...");
      clearAuthAlert();

      const res = await window.EcoAuth.resetPassword(email);
      setBtnLoading(submitBtn, false, "Send Reset Link");

      if (res.success) {
        showAuthAlert(res.message, "success");
      } else {
        showAuthAlert(res.error || "Unable to send reset email.", "error");
      }
    });
  }

  function showAuthModal(defaultTab = "login") {
    setupAuthModal();
    const modal = document.getElementById("auth-modal");
    if (modal) {
      modal.classList.remove("hidden");
      switchAuthTab(defaultTab);
      clearAuthAlert();
    }
  }

  function hideAuthModal() {
    const modal = document.getElementById("auth-modal");
    if (modal) modal.classList.add("hidden");
  }

  function switchAuthTab(tab) {
    const modal = document.getElementById("auth-modal");
    if (!modal) return;

    modal.querySelectorAll(".auth-tab-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === tab);
    });

    const loginForm = document.getElementById("auth-form-login");
    const regForm = document.getElementById("auth-form-register");
    const forgotForm = document.getElementById("auth-form-forgot");

    loginForm.classList.toggle("hidden", tab !== "login");
    regForm.classList.toggle("hidden", tab !== "register");
    forgotForm.classList.toggle("hidden", tab !== "forgot");

    const title = document.getElementById("auth-title");
    const sub = document.getElementById("auth-subtitle");
    if (tab === "login") {
      title.textContent = "Student Sign In";
      sub.textContent = "Sign in to track your test progress and analytics";
    } else if (tab === "register") {
      title.textContent = "Create Student Profile";
      sub.textContent = "Join EcoMatrix to access personalized practice tracking";
    } else if (tab === "forgot") {
      title.textContent = "Reset Password";
      sub.textContent = "Receive a password recovery link to your registered email";
    }

    clearAuthAlert();
  }

  function showAuthAlert(msg, type = "error") {
    const alertBox = document.getElementById("auth-alert");
    if (alertBox) {
      alertBox.textContent = msg;
      alertBox.className = `auth-alert ${type}`;
      alertBox.classList.remove("hidden");
    }
  }

  function clearAuthAlert() {
    const alertBox = document.getElementById("auth-alert");
    if (alertBox) {
      alertBox.textContent = "";
      alertBox.className = "auth-alert hidden";
    }
  }

  function setBtnLoading(btn, isLoading, text) {
    if (!btn) return;
    btn.disabled = isLoading;
    const txtSpan = btn.querySelector(".btn-text");
    if (txtSpan) {
      txtSpan.textContent = text;
    }
    const icon = btn.querySelector("i");
    if (icon) {
      if (isLoading) {
        icon.className = "fa-solid fa-spinner fa-spin";
      } else {
        icon.className = btn.id.includes("login") ? "fa-solid fa-arrow-right" : btn.id.includes("reg") ? "fa-solid fa-user-plus" : "fa-solid fa-paper-plane";
      }
    }
  }

  /**
   * Update Sidebar User Info and Homepage Hero Greeting
   */
  function syncUserInterface(authState) {
    const user = authState?.user;
    const profile = authState?.profile;

    // Top Right Hero Auth Slot
    const heroAuthSlot = document.getElementById("hero-auth-slot");
    if (heroAuthSlot) {
      if (user) {
        const studentName = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Student";
        const initial = studentName.charAt(0).toUpperCase();

        heroAuthSlot.innerHTML = `
          <div class="hero-user-pill">
            <div class="hero-user-avatar">${initial}</div>
            <span class="hero-user-name" title="${studentName}">${studentName}</span>
            <button class="hero-user-dash-btn" id="hero-user-dash-btn" type="button">Dashboard</button>
            <button class="hero-user-logout-btn" id="hero-user-logout-btn" title="Sign Out" type="button">
              <i class="fa-solid fa-arrow-right-from-bracket"></i>
            </button>
          </div>
        `;

        document.getElementById("hero-user-dash-btn")?.addEventListener("click", () => {
          document.querySelector('.sidebar-item[data-view="dashboard"]')?.click();
        });

        document.getElementById("hero-user-logout-btn")?.addEventListener("click", async () => {
          await window.EcoAuth.logout();
        });
      } else {
        heroAuthSlot.innerHTML = `
          <button class="hero-top-login-btn" id="hero-top-login-btn" type="button">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
            <span>Student Login</span>
          </button>
        `;

        document.getElementById("hero-top-login-btn")?.addEventListener("click", () => {
          showAuthModal("login");
        });
      }
    }

    // Homepage Hero Greeting
    const heroGreeting = document.querySelector(".hero-greeting");
    if (heroGreeting) {
      if (user) {
        const studentName = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Student";
        heroGreeting.textContent = `Hello, ${studentName}! 👋`;
      } else {
        heroGreeting.textContent = "Hello Student! 👋";
      }
    }

    // Refresh Dashboard if currently on Dashboard view
    const dashboardView = document.getElementById("view-dashboard");
    if (dashboardView && dashboardView.classList.contains("active")) {
      renderDashboard();
    }
  }

  /**
   * Render the Student Dashboard
   */
  async function renderDashboard() {
    const container = document.getElementById("dashboard-content-area");
    if (!container) return;

    const user = window.EcoAuth.getUser();
    if (!user) {
      // Guest View: Show invitation to log in
      container.innerHTML = `
        <div class="dashboard-guest-card card">
          <div class="guest-card-icon"><i class="fa-solid fa-user-lock"></i></div>
          <h3>Student Authentication Required</h3>
          <p>Sign in or create a free student account to view your quiz history, track chapter mastery, and diagnose weak areas.</p>
          <div class="guest-actions">
            <button class="btn-primary" id="dash-guest-login-btn"><i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In</button>
            <button class="btn-secondary" id="dash-guest-reg-btn"><i class="fa-solid fa-user-plus"></i> Register Free</button>
          </div>
        </div>
      `;

      document.getElementById("dash-guest-login-btn")?.addEventListener("click", () => showAuthModal("login"));
      document.getElementById("dash-guest-reg-btn")?.addEventListener("click", () => showAuthModal("register"));
      return;
    }

    // Show loading skeleton
    container.innerHTML = `
      <div class="dash-loading-spinner">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>Loading your progress analytics...</span>
      </div>
    `;

    const res = await window.EcoAuth.fetchDashboardData();
    if (!res.success) {
      container.innerHTML = `
        <div class="card error-card">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <p>Could not load your dashboard: ${res.error}</p>
          <button class="btn-secondary" id="dash-retry-fetch"><i class="fa-solid fa-rotate-right"></i> Retry</button>
        </div>
      `;
      document.getElementById("dash-retry-fetch")?.addEventListener("click", renderDashboard);
      return;
    }

    if (res.isEmpty) {
      // Empty state for new students
      container.innerHTML = `
        <div class="dashboard-empty-card card">
          <div class="empty-art"><i class="fa-solid fa-chart-simple"></i></div>
          <h3>No Quizzes Attempted Yet</h3>
          <p>Complete your first Economics or Quantitative practice test to start tracking chapter-level accuracy and identifying weak areas!</p>
          <div class="empty-actions">
            <button class="btn-primary" id="empty-launch-econ"><i class="fa-solid fa-chart-pie"></i> Practice Economics</button>
            <button class="btn-secondary" id="empty-launch-quant"><i class="fa-solid fa-calculator"></i> Practice Quantitative</button>
          </div>
        </div>
      `;

      document.getElementById("empty-launch-econ")?.addEventListener("click", () => {
        document.querySelector('.sidebar-item[data-view="test-economics"]')?.click();
      });
      document.getElementById("empty-launch-quant")?.addEventListener("click", () => {
        document.querySelector('.sidebar-item[data-view="test-quantitative"]')?.click();
      });
      return;
    }

    // Build populated dashboard
    const profile = window.EcoAuth.getProfile();
    const studentName = profile?.full_name || user.email?.split("@")[0] || "Student";

    container.innerHTML = `
      <!-- Top Metrics Row -->
      <div class="dash-kpi-grid">
        <div class="kpi-card card">
          <div class="kpi-icon icon-purple"><i class="fa-solid fa-list-check"></i></div>
          <div class="kpi-info">
            <span class="kpi-val">${res.totalQuestions}</span>
            <span class="kpi-lbl">Questions Attempted</span>
          </div>
        </div>

        <div class="kpi-card card">
          <div class="kpi-icon icon-emerald"><i class="fa-solid fa-bullseye"></i></div>
          <div class="kpi-info">
            <span class="kpi-val">${res.overallAccuracy}%</span>
            <span class="kpi-lbl">Overall Accuracy</span>
          </div>
        </div>

        <div class="kpi-card card">
          <div class="kpi-icon icon-blue"><i class="fa-solid fa-award"></i></div>
          <div class="kpi-info">
            <span class="kpi-val">${res.totalQuizzes}</span>
            <span class="kpi-lbl">Completed Tests</span>
          </div>
        </div>

        <div class="kpi-card card">
          <div class="kpi-icon icon-amber"><i class="fa-solid fa-circle-check"></i></div>
          <div class="kpi-info">
            <span class="kpi-val">${res.totalCorrect} / ${res.totalQuestions}</span>
            <span class="kpi-lbl">Correct Answers</span>
          </div>
        </div>
      </div>

      <!-- Main Analytics Row: Progress Chart + Subject Comparison -->
      <div class="dash-charts-row">
        <div class="card dash-chart-card">
          <div class="card-header-row">
            <h4><i class="fa-solid fa-chart-line"></i> Accuracy Trend Over Time</h4>
            <span class="chart-subtitle">Last ${Math.min(res.attempts.length, 10)} sessions</span>
          </div>
          <div class="chart-wrapper">
            <canvas id="dash-accuracy-chart"></canvas>
          </div>
        </div>

        <div class="card dash-subjects-card">
          <div class="card-header-row">
            <h4><i class="fa-solid fa-scale-balanced"></i> Subject Performance</h4>
          </div>
          
          <div class="subject-bar-group">
            <div class="subject-bar-header">
              <span>Business Economics</span>
              <span class="subject-pct">${res.subjectStats.economics.accuracy}% (${res.subjectStats.economics.total} Qs)</span>
            </div>
            <div class="progress-bar-track">
              <div class="progress-bar-fill fill-econ" style="width: ${res.subjectStats.economics.accuracy}%;"></div>
            </div>
          </div>

          <div class="subject-bar-group">
            <div class="subject-bar-header">
              <span>Quantitative Aptitude</span>
              <span class="subject-pct">${res.subjectStats.quantitative.accuracy}% (${res.subjectStats.quantitative.total} Qs)</span>
            </div>
            <div class="progress-bar-track">
              <div class="progress-bar-fill fill-quant" style="width: ${res.subjectStats.quantitative.accuracy}%;"></div>
            </div>
          </div>

          <!-- Weak Areas / Diagnostic Warning -->
          <div class="diagnostic-box">
            <h5><i class="fa-solid fa-triangle-exclamation"></i> Chapter Focus Diagnostic</h5>
            <div id="diagnostic-content"></div>
          </div>
        </div>
      </div>

      <!-- Historical Attempts Table -->
      <div class="card dash-history-card">
        <div class="card-header-row">
          <h4><i class="fa-solid fa-clock-rotate-left"></i> Quiz History</h4>
          <span class="chart-subtitle">${res.attempts.length} recorded session(s)</span>
        </div>
        <div class="history-table-wrapper">
          <table class="history-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Subject</th>
                <th>Score</th>
                <th>Correct</th>
                <th>Incorrect</th>
                <th>Unanswered</th>
                <th>Accuracy</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="history-table-body"></tbody>
          </table>
        </div>
      </div>
    `;

    // Render Diagnostic Section
    const diagContainer = document.getElementById("diagnostic-content");
    if (diagContainer) {
      if (res.weakChapters.length === 0) {
        diagContainer.innerHTML = `
          <p class="diag-good"><i class="fa-solid fa-circle-check"></i> Great job! No critical weak chapters detected (all attempted chapters ≥ 65% accuracy).</p>
        `;
      } else {
        const topWeak = res.weakChapters.slice(0, 3);
        diagContainer.innerHTML = `
          <p class="diag-warn">The following chapters need revision based on your test results:</p>
          <ul class="weak-list">
            ${topWeak
              .map((item) => {
                const chName = item.subject === "economics" ? ECON_CHAPTER_NAMES[item.chapterId] || item.name : QUANT_CHAPTER_NAMES[item.chapterId] || item.name;
                const viewTarget = item.subject === "economics" ? "test-economics" : "test-quantitative";
                return `
                <li class="weak-item">
                  <div class="weak-info">
                    <span class="weak-name">${chName}</span>
                    <span class="weak-stat">${item.accuracy}% Accuracy (${item.correct}/${item.total} correct)</span>
                  </div>
                  <button class="btn-weak-practice" data-target="${viewTarget}" data-chapter="${item.chapterId}">
                    Practice
                  </button>
                </li>
              `;
              })
              .join("")}
          </ul>
        `;

        diagContainer.querySelectorAll(".btn-weak-practice").forEach((btn) => {
          btn.addEventListener("click", () => {
            const targetView = btn.getAttribute("data-target");
            document.querySelector(`.sidebar-item[data-view="${targetView}"]`)?.click();
          });
        });
      }
    }

    // Render History Table Body
    const tbody = document.getElementById("history-table-body");
    if (tbody) {
      tbody.innerHTML = res.attempts
        .map((att) => {
          const subjectLabel = att.subject === "economics" ? "Economics" : att.subject === "quantitative" ? "Quantitative" : "Daily Quiz";
          const subjectBadgeClass = att.subject === "economics" ? "badge-econ" : att.subject === "quantitative" ? "badge-quant" : "badge-daily";
          const acc = Number(att.accuracy_percentage) || 0;
          const statusBadge = acc >= 70 ? `<span class="badge badge-pass">Pass (${acc}%)</span>` : `<span class="badge badge-retry">Needs Review (${acc}%)</span>`;

          return `
            <tr>
              <td>${formatDate(att.completed_at)}</td>
              <td><span class="subject-badge ${subjectBadgeClass}">${subjectLabel}</span></td>
              <td><strong>${att.correct_answers}/${att.total_questions}</strong></td>
              <td class="text-emerald">${att.correct_answers}</td>
              <td class="text-rose">${att.incorrect_answers}</td>
              <td class="text-muted">${att.unanswered_questions || 0}</td>
              <td><strong>${acc}%</strong></td>
              <td>${statusBadge}</td>
            </tr>
          `;
        })
        .join("");
    }

    // Render Chart.js Trend Line
    renderAccuracyChart(res.attempts);
  }

  function renderAccuracyChart(attempts) {
    const canvas = document.getElementById("dash-accuracy-chart");
    if (!canvas || !window.Chart) return;

    // Take last 10 attempts in chronological order (oldest to newest)
    const chronological = [...attempts].reverse().slice(-10);

    const labels = chronological.map((att, i) => `#${i + 1}`);
    const dataPoints = chronological.map((att) => Number(att.accuracy_percentage) || 0);

    if (progressChartInstance) {
      progressChartInstance.destroy();
    }

    progressChartInstance = new window.Chart(canvas, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Accuracy %",
            data: dataPoints,
            borderColor: "#8b5cf6",
            backgroundColor: "rgba(139, 92, 246, 0.12)",
            borderWidth: 2,
            tension: 0.35,
            fill: true,
            pointBackgroundColor: "#8b5cf6",
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `Accuracy: ${ctx.parsed.y}%`
            }
          }
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: {
              color: "#a1a1aa",
              stepSize: 20,
              callback: (val) => `${val}%`
            },
            grid: {
              color: "rgba(255, 255, 255, 0.05)"
            }
          },
          x: {
            ticks: { color: "#a1a1aa" },
            grid: {
              color: "rgba(255, 255, 255, 0.03)"
            }
          }
        }
      }
    });
  }

  // Export functions to window
  
  /**
   * Handle Quiz Save with Feedback, Pending Spinner, and In-Memory Retry
   */
  async function handleQuizSave(containerId, payload) {
    const box = document.getElementById(containerId);
    if (!box) return;

    const user = window.EcoAuth.getUser();

    // 1. Guest flow
    if (!user) {
      box.innerHTML = `
        <div class="save-status guest-prompt">
          <i class="fa-solid fa-cloud-arrow-up"></i>
          <span>Want to track your progress? <a href="#" id="${containerId}-guest-login" class="guest-auth-link">Sign in or Register</a> to save this score to your student dashboard.</span>
        </div>
      `;
      document.getElementById(`${containerId}-guest-login`)?.addEventListener("click", (e) => {
        e.preventDefault();
        showAuthModal("login");
      });
      return;
    }

    // 2. Logged-in student: Show pending state FIRST (never premature success)
    box.innerHTML = `
      <div class="save-status pending">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>Saving quiz results to your dashboard...</span>
      </div>
    `;

    // Attempt insert
    const res = await window.EcoAuth.saveQuizAttempt(payload);

    if (res.success) {
      // Confirmed success by Supabase
      box.innerHTML = `
        <div class="save-status success">
          <i class="fa-solid fa-circle-check"></i>
          <span>✓ Results successfully saved to your Student Dashboard</span>
        </div>
      `;
    } else {
      // Failed: Show clear retry button using buffered payload with identical idempotency key
      const errMsg = res.error || "Network connection issue.";
      box.innerHTML = `
        <div class="save-status error">
          <div class="status-err-msg">
            <i class="fa-solid fa-circle-exclamation"></i>
            <span>Could not save to dashboard (${errMsg}). Your result is preserved in memory.</span>
          </div>
          <button class="btn-retry-save" id="${containerId}-retry-btn">
            <i class="fa-solid fa-rotate-right"></i> Retry Save
          </button>
        </div>
      `;

      document.getElementById(`${containerId}-retry-btn`)?.addEventListener("click", () => {
        const buffered = window.EcoAuth.getFailedAttemptBuffer() || payload;
        handleQuizSave(containerId, buffered);
      });
    }
  }

  window.EcoDashboard = {
    handleQuizSave,
    showAuthModal,
    hideAuthModal,
    renderDashboard,
    syncUserInterface,
    formatDate
  };

  // Wire auth state changes
  
  // Direct Link & Hash Route Support (#login, #register, ?login=1)
  function handleDirectAuthRoutes() {
    const hash = (window.location.hash || "").toLowerCase();
    const search = window.location.search || "";
    if (hash === "#login" || search.includes("login")) {
      showAuthModal("login");
    } else if (hash === "#register" || search.includes("register")) {
      showAuthModal("register");
    }
  }

  window.addEventListener("hashchange", handleDirectAuthRoutes);

  document.addEventListener("DOMContentLoaded", () => {
    handleDirectAuthRoutes();
    document.getElementById('hero-top-login-btn')?.addEventListener('click', () => showAuthModal('login'));
    setupAuthModal();
    if (window.EcoAuth && typeof window.EcoAuth.onAuthChange === "function") {
      window.EcoAuth.onAuthChange(syncUserInterface);
    }
  });
})();
