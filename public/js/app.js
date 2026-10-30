/**
 * EcoMatrix Main Application Script - Sidebar Navigation, View Switching, Interactive Quizzes & Graph Controllers
 */

document.addEventListener("DOMContentLoaded", () => {
  // Dismiss Skeleton Overlay
  const skeletonOverlay = document.getElementById("skeleton-overlay");
  if (skeletonOverlay) {
    setTimeout(() => {
      skeletonOverlay.classList.add("fade-out");
      setTimeout(() => skeletonOverlay.remove(), 400);
    }, 600);
  }

  // Element References
  const sidebarItems = document.querySelectorAll(".sidebar-item[data-view]");
  const appViews = document.querySelectorAll(".app-view");
  const currentViewTitle = document.getElementById("current-view-title");
  const mobileSidebarToggle = document.getElementById("mobile-sidebar-toggle");
  const appSidebar = document.getElementById("app-sidebar");

  // Mobile Sidebar Toggle
  if (mobileSidebarToggle && appSidebar) {
    mobileSidebarToggle.addEventListener("click", () => {
      appSidebar.classList.toggle("open");
    });
  }

  // Sidebar Navigation & Direct Graph Switching Controller
  // Sidebar Navigation & Direct Graph Switching Controller
  function navigateToView(targetViewId, targetGraphId, parentTabId) {
    if (!targetViewId) return;

    // Scroll main content area to top
    const mainContentArea = document.querySelector(".main-content-area");
    if (mainContentArea) {
      mainContentArea.scrollTop = 0;
    }

    // Update active sidebar link
    sidebarItems.forEach((btn) => {
      const v = btn.getAttribute("data-view");
      const g = btn.getAttribute("data-graph");
      if (v === targetViewId && (!targetGraphId || g === targetGraphId)) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Switch Main View
    appViews.forEach((view) => view.classList.remove("active"));
    const targetView = document.getElementById(`view-${targetViewId}`);
    if (targetView) {
      targetView.classList.add("active");
    }

    if (targetViewId === "dashboard" && window.EcoDashboard && typeof window.EcoDashboard.renderDashboard === "function") {
      window.EcoDashboard.renderDashboard();
    }

    // Toggle Focus Mode (Hide sidebar on full-page test views)
    const appLayout = document.querySelector(".app-layout");
    if (appLayout) {
      appLayout.setAttribute("data-active-view", targetViewId);
      if (targetViewId === "test-economics" || targetViewId === "test-quantitative") {
        appLayout.classList.add("focus-mode");
      } else {
        appLayout.classList.remove("focus-mode");
      }
    }

    // Update Top Bar View Title
    const activeBtn = document.querySelector(`.sidebar-item.active`);
    if (currentViewTitle && activeBtn) {
      const itemTitle = activeBtn.querySelector("span") ? activeBtn.querySelector("span").textContent : "EcoMatrix";
      currentViewTitle.textContent = itemTitle;
    }

    // Close mobile sidebar if open
    if (appSidebar) {
      appSidebar.classList.remove("open");
    }

    // Handle Direct Graph Activation inside Graph Workspace
    if (targetViewId === "graph-workspace" && targetGraphId && parentTabId) {
      activateSpecificGraph(parentTabId, targetGraphId);
    }

    // Update URL hash for page reload persistence
    let hashVal = targetViewId;
    if (targetGraphId) hashVal += `?graph=${targetGraphId}&tab=${parentTabId}`;
    if (window.location.hash !== `#${hashVal}`) {
      history.replaceState(null, "", `#${hashVal}`);
    }

    window.dispatchEvent(new Event("resize"));
  }

  sidebarItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      const targetViewId = item.getAttribute("data-view");
      const targetGraphId = item.getAttribute("data-graph");
      const parentTabId = item.getAttribute("data-parent-tab");
      navigateToView(targetViewId, targetGraphId, parentTabId);
    });
  });

  // URL Hash Navigation Restoration on Page Load / Reload
  function restoreViewFromHash() {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;

    let viewId = hash;
    let graphId = null;
    let parentTabId = null;

    if (hash.includes("?")) {
      const parts = hash.split("?");
      viewId = parts[0];
      const params = new URLSearchParams(parts[1]);
      graphId = params.get("graph");
      parentTabId = params.get("tab");
    }

    const matchingSidebarItem = Array.from(sidebarItems).find((btn) => {
      const v = btn.getAttribute("data-view");
      const g = btn.getAttribute("data-graph");
      return v === viewId && (!graphId || g === graphId);
    });

    if (matchingSidebarItem) {
      matchingSidebarItem.click();
    } else {
      const defaultViewItem = document.querySelector(`.sidebar-item[data-view="${viewId}"]`);
      if (defaultViewItem) defaultViewItem.click();
    }
  }

  window.addEventListener("hashchange", restoreViewFromHash);
  restoreViewFromHash();

  // Helper to activate specific Graph Tab & Subpanel
  function activateSpecificGraph(parentTabId, subpanelId) {
    const tabContents = document.querySelectorAll("#view-graph-workspace .tab-content");
    tabContents.forEach((tc) => tc.classList.remove("active"));

    const targetTab = document.getElementById(parentTabId);
    if (targetTab) {
      targetTab.classList.add("active");

      // Activate subpanel inside this tab if exists
      targetTab.querySelectorAll(".sub-tab-panel").forEach((panel) => {
        if (panel.getAttribute("data-subpanel") === subpanelId) {
          panel.classList.add("active");
        } else {
          panel.classList.remove("active");
        }
      });
    }

    // Trigger Chart.js recalculation & animation updates
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
      triggerGraphUpdate(subpanelId, parentTabId);
    });
  }

  function triggerGraphUpdate(subpanelId, parentTabId) {
    if (typeof EconomicsCharts === "undefined") return;

    if (subpanelId === "sub-prod-shortrun") updateProduction(true);
    else if (subpanelId === "sub-prod-cobb") updateCobb(true);
    else if (subpanelId === "sub-cost-total" || subpanelId === "sub-cost-unit") updateCost(true);
    else if (subpanelId === "sub-rev-total" || subpanelId === "sub-rev-marginal") updateRevenueProfit(true);
    else if (parentTabId === "tab-market" || subpanelId === "sub-market") updateMarket(true);
    else if (parentTabId === "tab-macro" || subpanelId === "sub-macro") updateMacro(true);
  }

  // Explore Cards Quick Navigation
  const exploreCards = document.querySelectorAll(".explore-card[data-navigate]");
  exploreCards.forEach((card) => {
    card.addEventListener("click", () => {
      const navTarget = card.getAttribute("data-navigate");
      const targetGraph = card.getAttribute("data-target-graph");

      if (navTarget === "graph-workspace" && targetGraph) {
        const matchingSidebarItem = document.querySelector(`.sidebar-item[data-graph="${targetGraph}"]`);
        if (matchingSidebarItem) {
          matchingSidebarItem.click();
          return;
        }
      }

      const matchingSidebarItem = document.querySelector(`.sidebar-item[data-view="${navTarget}"]`);
      if (matchingSidebarItem) {
        matchingSidebarItem.click();
      }
    });
  });

  // Formula Accordion Toggles
  const formulaHeaders = document.querySelectorAll(".formula-header");
  formulaHeaders.forEach((header) => {
    header.addEventListener("click", () => {
      const box = header.closest(".formula-box");
      if (box) box.classList.toggle("open");
    });
  });

  // Helper for input sync with progress bars
  function bindInputSync(sliderId, valDisplayId, callback) {
    const slider = document.getElementById(sliderId);
    const valDisplay = document.getElementById(valDisplayId);
    if (!slider) return;

    const group = slider.closest(".custom-slider-group");
    const progress = group ? group.querySelector(".slider-progress") : null;

    function handleUpdate(val) {
      const numVal = parseFloat(val);
      if (isNaN(numVal)) return;

      slider.value = numVal;
      if (valDisplay) valDisplay.textContent = numVal;

      const min = parseFloat(slider.min) || 0;
      const max = parseFloat(slider.max) || 100;
      if (progress) {
        const pct = Math.max(0, Math.min(100, ((numVal - min) / (max - min)) * 100));
        progress.style.width = pct + "%";
      }

      if (callback) callback();
    }

    slider.addEventListener("input", (e) => handleUpdate(e.target.value));
    handleUpdate(slider.value);
  }

  function setElemText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  /* ==========================================================================
     1. PRODUCTION CONTROLLER
     ========================================================================== */
  function updateProduction(animateFromX = false) {
    const prodA = document.getElementById("prod-a");
    if (!prodA) return;
    const a = parseFloat(prodA.value);
    const b = parseFloat(document.getElementById("prod-b").value);
    const c = parseFloat(document.getElementById("prod-c").value);
    const toggleBtn = document.getElementById("toggle-stages");
    const showStages = toggleBtn ? toggleBtn.checked : true;

    const data = EconomicsEngine.getProductionData({ a, b, c, maxLabor: 20, step: 0.5 });
    data.showStages = showStages;
    EconomicsCharts.updateProductionChart(data, animateFromX);
  }

  function updateCobb(animateFromX = false) {
    const cobbA = document.getElementById("cobb-A");
    if (!cobbA) return;
    const A = parseFloat(cobbA.value);
    const K = parseFloat(document.getElementById("cobb-K").value);
    const alpha = parseFloat(document.getElementById("cobb-alpha").value);
    const beta = parseFloat(document.getElementById("cobb-beta").value);

    const data = EconomicsEngine.getCobbDouglasData({ A, K, alpha, beta, maxLabor: 30, step: 1 });
    EconomicsCharts.updateCobbChart(data, animateFromX);
  }

  // Initialize Production Charts
  const ctxProdEl = document.getElementById("chart-production");
  if (ctxProdEl) {
    const ctxProd = ctxProdEl.getContext("2d");
    const initialProdData = EconomicsEngine.getProductionData({ a: 12, b: 1.5, c: 0.08, maxLabor: 20, step: 0.5 });
    initialProdData.showStages = true;
    EconomicsCharts.initProductionChart(ctxProd, initialProdData);
  }

  const ctxCobbEl = document.getElementById("chart-cobb");
  if (ctxCobbEl) {
    const ctxCobb = ctxCobbEl.getContext("2d");
    const initialCobbData = EconomicsEngine.getCobbDouglasData({ A: 10, K: 10, alpha: 0.5, beta: 0.5, maxLabor: 30, step: 1 });
    EconomicsCharts.initCobbChart(ctxCobb, initialCobbData);
  }

  bindInputSync("prod-a", "val-prod-a", updateProduction);
  bindInputSync("prod-b", "val-prod-b", updateProduction);
  bindInputSync("prod-c", "val-prod-c", updateProduction);

  const toggleStages = document.getElementById("toggle-stages");
  if (toggleStages) toggleStages.addEventListener("change", updateProduction);

  bindInputSync("cobb-A", "val-cobb-A", updateCobb);
  bindInputSync("cobb-K", "val-cobb-K", updateCobb);
  bindInputSync("cobb-alpha", "val-cobb-alpha", updateCobb);
  bindInputSync("cobb-beta", "val-cobb-beta", updateCobb);

  /* ==========================================================================
     2. COST CONTROLLER
     ========================================================================== */
  function updateCost(animateFromX = false) {
    const costFc = document.getElementById("cost-fc");
    if (!costFc) return;
    const FC = parseFloat(costFc.value);
    const v1 = parseFloat(document.getElementById("cost-v1").value);
    const v2 = parseFloat(document.getElementById("cost-v2").value);
    const v3 = parseFloat(document.getElementById("cost-v3").value);

    const data = EconomicsEngine.getCostData({ FC, v1, v2, v3, maxQ: 25, step: 0.5 });
    EconomicsCharts.updateCostCharts(data, animateFromX);
  }

  const ctxCostTotalEl = document.getElementById("chart-cost-total");
  const ctxCostUnitEl = document.getElementById("chart-cost-unit");
  if (ctxCostTotalEl && ctxCostUnitEl) {
    const initialCostData = EconomicsEngine.getCostData({ FC: 100, wage: 20, v1: 20, v2: -1.5, v3: 0.08, maxQ: 25, step: 0.5 });
    EconomicsCharts.initCostCharts(ctxCostTotalEl.getContext("2d"), ctxCostUnitEl.getContext("2d"), initialCostData);
  }

  bindInputSync("cost-fc", "val-cost-fc", updateCost);
  bindInputSync("cost-v1", "val-cost-v1", updateCost);
  bindInputSync("cost-v2", "val-cost-v2", updateCost);
  bindInputSync("cost-v3", "val-cost-v3", updateCost);

  /* ==========================================================================
     3. REVENUE CONTROLLER
     ========================================================================== */
  function updateRevenueProfit(animateFromX = false) {
    const revPmax = document.getElementById("rev-pmax");
    if (!revPmax) return;
    const priceMax = parseFloat(revPmax.value);
    const slope = parseFloat(document.getElementById("rev-slope").value);
    const FC = parseFloat(document.getElementById("rev-fc").value);
    const c1 = parseFloat(document.getElementById("rev-c1").value);
    const c2 = parseFloat(document.getElementById("rev-c2").value);

    const data = EconomicsEngine.getRevenueProfitData({ priceMax, slope, FC, c1, c2, maxQ: 35, step: 1 });
    EconomicsCharts.updateRevenueProfitCharts(data, animateFromX);
  }

  const ctxRevTotalEl = document.getElementById("chart-rev-total");
  const ctxRevMarginalEl = document.getElementById("chart-rev-marginal");
  if (ctxRevTotalEl && ctxRevMarginalEl) {
    const initialRevData = EconomicsEngine.getRevenueProfitData({ priceMax: 100, slope: 2, FC: 150, c1: 10, c2: 1.2, maxQ: 35, step: 1 });
    EconomicsCharts.initRevenueProfitCharts(ctxRevTotalEl.getContext("2d"), ctxRevMarginalEl.getContext("2d"), initialRevData);
  }

  bindInputSync("rev-pmax", "val-rev-pmax", updateRevenueProfit);
  bindInputSync("rev-slope", "val-rev-slope", updateRevenueProfit);
  bindInputSync("rev-fc", "val-rev-fc", updateRevenueProfit);
  bindInputSync("rev-c1", "val-rev-c1", updateRevenueProfit);
  bindInputSync("rev-c2", "val-rev-c2", updateRevenueProfit);

  /* ==========================================================================
     4. MARKET EQUILIBRIUM CONTROLLER
     ========================================================================== */
  function updateMarket(animateFromX = false) {
    const mktA = document.getElementById("mkt-a");
    if (!mktA) return;
    const demandIntercept = parseFloat(mktA.value);
    const demandSlope = parseFloat(document.getElementById("mkt-b").value);
    const supplyIntercept = parseFloat(document.getElementById("mkt-c").value);
    const supplySlope = parseFloat(document.getElementById("mkt-d").value);
    const tax = parseFloat(document.getElementById("mkt-tax").value);
    const priceControl = document.getElementById("mkt-control-type").value;
    const controlPrice = parseFloat(document.getElementById("mkt-control-price").value);

    const data = EconomicsEngine.getMarketEquilibriumData({
      demandIntercept, demandSlope, supplyIntercept, supplySlope, tax, priceControl, controlPrice, maxQ: 35, step: 1
    });

    EconomicsCharts.updateMarketChart(data, animateFromX);
  }

  const ctxMarketEl = document.getElementById("chart-market");
  if (ctxMarketEl) {
    const initialMarketData = EconomicsEngine.getMarketEquilibriumData({
      demandIntercept: 100, demandSlope: 2, supplyIntercept: 10, supplySlope: 1.5, tax: 0, priceControl: "none", controlPrice: 40, maxQ: 35, step: 1
    });
    EconomicsCharts.initMarketChart(ctxMarketEl.getContext("2d"), initialMarketData);
  }

  bindInputSync("mkt-a", "val-mkt-a", updateMarket);
  bindInputSync("mkt-b", "val-mkt-b", updateMarket);
  bindInputSync("mkt-c", "val-mkt-c", updateMarket);
  bindInputSync("mkt-d", "val-mkt-d", updateMarket);
  bindInputSync("mkt-tax", "val-mkt-tax", updateMarket);
  bindInputSync("mkt-control-price", "val-mkt-control-price", updateMarket);

  const mktCtrlType = document.getElementById("mkt-control-type");
  if (mktCtrlType) mktCtrlType.addEventListener("change", updateMarket);

  /* ==========================================================================
     5. MACROECONOMICS CONTROLLER
     ========================================================================== */
  function updateMacro(animateFromX = false) {
    const macC0 = document.getElementById("mac-c0");
    if (!macC0) return;
    const C0 = parseFloat(macC0.value);
    const MPC = parseFloat(document.getElementById("mac-mpc").value);
    const I = parseFloat(document.getElementById("mac-i").value);
    const G = parseFloat(document.getElementById("mac-g").value);
    const NX = parseFloat(document.getElementById("mac-nx").value);
    const taxRate = parseFloat(document.getElementById("mac-t").value);

    const data = EconomicsEngine.getKeynesianData({ C0, MPC, I, G, NX, taxRate, maxOutput: 3000, step: 100 });
    EconomicsCharts.updateMacroChart(data, animateFromX);
  }

  const ctxMacroEl = document.getElementById("chart-macro");
  if (ctxMacroEl) {
    const initialMacroData = EconomicsEngine.getKeynesianData({
      C0: 100, MPC: 0.8, I: 150, G: 200, NX: -20, taxRate: 0.15, maxOutput: 3000, step: 100
    });
    EconomicsCharts.initMacroChart(ctxMacroEl.getContext("2d"), initialMacroData);
  }

  bindInputSync("mac-c0", "val-mac-c0", updateMacro);
  bindInputSync("mac-mpc", "val-mac-mpc", updateMacro);
  bindInputSync("mac-i", "val-mac-i", updateMacro);
  bindInputSync("mac-g", "val-mac-g", updateMacro);
  bindInputSync("mac-nx", "val-mac-nx", updateMacro);
  bindInputSync("mac-t", "val-mac-t", updateMacro);

  /* ==========================================================================
     6. INTERACTIVE "QUIZ OF THE DAY" LOGIC
     ========================================================================== */
  const dailyQuizQuestions = [
    {
      question: "When Marginal Cost (MC) is less than Average Total Cost (ATC), what is the behavior of Average Total Cost as output increases?",
      difficulty: "Intermediate",
      options: [
        { text: "ATC is decreasing", correct: true },
        { text: "ATC is increasing", correct: false },
        { text: "ATC remains constant at its minimum", correct: false },
        { text: "ATC is negative", correct: false }
      ],
      explanation: "Whenever MC < ATC, each additional unit costs less than the average, dragging the average total cost downwards. MC intersects ATC at its minimum!"
    },
    {
      question: "In the Keynesian Cross Model, if the Marginal Propensity to Consume (MPC) is 0.80 and tax rate is 0, what is the Expenditure Multiplier?",
      difficulty: "Hard",
      options: [
        { text: "2.0x", correct: false },
        { text: "4.0x", correct: false },
        { text: "5.0x", correct: true },
        { text: "8.0x", correct: false }
      ],
      explanation: "The expenditure multiplier formula is k = 1 / (1 - MPC). For MPC = 0.80, k = 1 / (1 - 0.80) = 1 / 0.20 = 5.0x!"
    },
    {
      question: "In a Cobb-Douglas production function Y = A · K^α · L^β, if α = 0.6 and β = 0.5, what type of Returns to Scale does the firm exhibit?",
      difficulty: "Intermediate",
      options: [
        { text: "Constant Returns to Scale (CRS)", correct: false },
        { text: "Increasing Returns to Scale (IRS)", correct: true },
        { text: "Decreasing Returns to Scale (DRS)", correct: false },
        { text: "Negative Returns to Scale", correct: false }
      ],
      explanation: "Sum of elasticities α + β = 0.6 + 0.5 = 1.1 > 1.0. When α + β > 1, the production function exhibits Increasing Returns to Scale (IRS)."
    }
  ];

  let currentQuizIndex = 0;

  function renderDailyQuiz(index) {
    const qData = dailyQuizQuestions[index];
    if (!qData) return;

    setElemText("daily-quiz-question", qData.question);
    setElemText("daily-quiz-difficulty", qData.difficulty);

    const feedbackBox = document.getElementById("daily-quiz-feedback");
    if (feedbackBox) feedbackBox.classList.add("hidden");

    const optionsContainer = document.getElementById("daily-quiz-options");
    if (!optionsContainer) return;

    optionsContainer.innerHTML = "";
    const prefixes = ["A", "B", "C", "D"];

    qData.options.forEach((opt, idx) => {
      const btn = document.createElement("button");
      btn.className = "quiz-option-btn";
      btn.innerHTML = `
        <span class="opt-prefix">${prefixes[idx]}</span>
        <span>${opt.text}</span>
      `;

      btn.addEventListener("click", () => {
        // Disable options
        optionsContainer.querySelectorAll(".quiz-option-btn").forEach((b) => (b.style.pointerEvents = "none"));

        if (opt.correct) {
          btn.classList.add("selected-correct");
          setElemText("quiz-feedback-status", "✓ Correct Answer!");
          document.getElementById("quiz-feedback-status").className = "feedback-status correct";
        } else {
          btn.classList.add("selected-wrong");
          setElemText("quiz-feedback-status", "✗ Incorrect Answer");
          document.getElementById("quiz-feedback-status").className = "feedback-status wrong";
        }

        setElemText("quiz-feedback-explanation", qData.explanation);
        if (feedbackBox) feedbackBox.classList.remove("hidden");
      });

      optionsContainer.appendChild(btn);
    });
  }

  renderDailyQuiz(0);

  const nextQuizBtn = document.getElementById("next-quiz-btn");
  if (nextQuizBtn) {
    nextQuizBtn.addEventListener("click", () => {
      currentQuizIndex = (currentQuizIndex + 1) % dailyQuizQuestions.length;
      renderDailyQuiz(currentQuizIndex);
    });
  }

  /* ==========================================================================
     7. ECONOMICS & QUANTITATIVE PRACTICE WIZARD & TEST CONTROLLER
     ========================================================================== */
  const practiceWizardCard = document.getElementById("econ-practice-wizard");
  const testSessionContainer = document.getElementById("econ-test-session");

  if (practiceWizardCard && testSessionContainer) {
    // QUESTION BANK BY CHAPTER
    const QUESTION_BANK = {
      1: [
        { q: "If the price elasticity of demand for a good is -2.5, a 10% increase in price will result in:", opts: ["25% increase in quantity demanded", "25% decrease in quantity demanded", "2.5% decrease in quantity demanded", "10% decrease in quantity demanded"], correct: 1, exp: "Price elasticity %ΔQd / %ΔP = -2.5. Therefore %ΔQd = -2.5 × 10% = -25%." },
        { q: "An increase in consumer income for a normal good causes the demand curve to:", opts: ["Shift to the right", "Shift to the left", "Move downward along the curve", "Remain unchanged"], correct: 0, exp: "For normal goods, higher income increases demand at every price level, shifting the demand curve to the right." },
        { q: "Consumer surplus is graphically represented as the area:", opts: ["Below the price line and above supply curve", "Above the price line and below demand curve", "Below the supply curve", "Between demand and supply curves"], correct: 1, exp: "Consumer surplus is the area below the demand curve and above the market equilibrium price line." }
      ],
      2: [
        { q: "Which monetary policy tool directly alters the cash percentage banks must maintain with RBI?", opts: ["Statutory Liquidity Ratio (SLR)", "Cash Reserve Ratio (CRR)", "Repo Rate", "Reverse Repo Rate"], correct: 1, exp: "CRR is the mandatory percentage of net demand and time liabilities (NDTL) that commercial banks must maintain as cash with RBI." },
        { q: "Broad Money (M3) in India includes M1 plus:", opts: ["Post office savings deposits", "Time deposits with commercial banks", "Total post office deposits", "National Savings Certificates"], correct: 1, exp: "M3 = M1 + Time Deposits with commercial banks." }
      ],
      3: [
        { q: "According to David Ricardo's theory of Comparative Advantage, international trade is beneficial when countries differ in:", opts: ["Absolute production costs", "Opportunity costs of production", "Wage rates only", "Tariff structures"], correct: 1, exp: "Comparative advantage relies on relative opportunity cost differences between nations." },
        { q: "A tariff imposed on imported goods will typically:", opts: ["Lower domestic price", "Raise domestic price and protect domestic producers", "Increase import volume", "Eliminate government revenue"], correct: 1, exp: "Tariffs raise import prices, benefiting domestic producers while raising prices for consumers." }
      ],
      4: [
        { q: "Which premier policy think tank replaced the Planning Commission of India in 2015?", opts: ["NITI Aayog", "Finance Commission", "National Development Council", "RBI Monetary Policy Committee"], correct: 0, exp: "NITI Aayog (National Institution for Transforming India) replaced the Planning Commission on January 1, 2015." },
        { q: "Headline inflation in India is officially measured using which index?", opts: ["Wholesale Price Index (WPI)", "Consumer Price Index (CPI-Combined)", "GDP Deflator", "Industrial Production Index"], correct: 1, exp: "RBI officially adopted CPI-Combined (Base 2012) as the key metric for inflation targeting." }
      ],
      5: [
        { q: "Business Economics is best described as:", opts: ["Pure macroeconomics without practical application", "Integration of economic theory with business practice for decision making", "Descriptive study of primitive economies", "Branch of pure mathematics"], correct: 1, exp: "Business Economics applies microeconomic and macroeconomic concepts to managerial decision making." },
        { q: "Statements expressing value judgments or 'what ought to be' are classified as:", opts: ["Positive Economics", "Normative Economics", "Empirical Economics", "Quantitative Economics"], correct: 1, exp: "Normative economics deals with ethical evaluations, value judgments, and policy recommendations." }
      ],
      6: [
        { q: "Fiscal Deficit is calculated as:", opts: ["Total Expenditure - Revenue Receipts", "Total Expenditure - (Revenue Receipts + Non-debt Capital Receipts)", "Revenue Expenditure - Revenue Receipts", "Primary Deficit + Interest Payments"], correct: 1, exp: "Fiscal deficit represents government borrowing requirement = Total Expenditure minus Total Non-Debt Receipts." },
        { q: "A progressive tax structure means that as income rises, the tax rate:", opts: ["Decreases", "Remains constant", "Increases", "Falls to zero"], correct: 2, exp: "Progressive taxation levies a higher percentage tax rate on higher income levels to promote social equity." }
      ],
      7: [
        { q: "Under Perfect Competition, an individual firm's demand curve is:", opts: ["Downward sloping", "Horizontal (perfectly elastic)", "Vertical (perfectly inelastic)", "U-shaped"], correct: 1, exp: "Firms in perfect competition are price takers facing a horizontal demand curve where P = AR = MR." },
        { q: "Price Discrimination is possible and profitable only when:", opts: ["Sub-markets have differing price elasticities of demand", "Firms produce identical goods", "Buyers can easily resell products", "Elasticity of demand is identical everywhere"], correct: 0, exp: "Price discrimination requires market power, sub-market separation, and differing demand elasticities." }
      ],
      8: [
        { q: "The peak of a business cycle represents:", opts: ["Lowest point of output", "Upper turning point where expansion reaches maximum activity", "Phase of declining prices", "Trough of depression"], correct: 1, exp: "The Peak is the highest activity turning point of a business cycle before contraction begins." },
        { q: "Which of the following is considered a LEADING economic indicator?", opts: ["Unemployment rate", "Stock market prices & building permits", "Bank loan defaults", "Consumer Price Index"], correct: 1, exp: "Leading indicators change direction before the overall economy turns." }
      ],
      9: [
        { q: "In a 2-sector economy, if Marginal Propensity to Consume (MPC) is 0.8, the Investment Multiplier (K) is:", opts: ["2", "4", "5", "10"], correct: 2, exp: "Investment Multiplier K = 1 / (1 - MPC) = 1 / (1 - 0.8) = 5." },
        { q: "Gross Domestic Product at Market Price (GDP_MP) equals GDP at Factor Cost (GDP_FC) plus:", opts: ["Net Factor Income from Abroad", "Depreciation", "Net Indirect Taxes (Indirect Taxes - Subsidies)", "Transfer Payments"], correct: 2, exp: "GDP_MP = GDP_FC + Net Indirect Taxes." }
      ],
      10: [
        { q: "In Stage II of production (Law of Variable Proportions), what happens to Marginal Product (MP) and Average Product (AP)?", opts: ["MP and AP both rise", "MP and AP both fall, with MP > 0", "MP is negative while AP is rising", "AP is at its maximum"], correct: 1, exp: "In Stage II, TP continues rising at a diminishing rate. Both MP and AP decline, MP is positive (MP > 0)." },
        { q: "The short-run Average Total Cost (ATC) curve is U-shaped due to:", opts: ["Law of Variable Proportions", "Economies of Scale", "Constant Returns to Scale", "Decreasing Marginal Utility"], correct: 0, exp: "In the short run with fixed inputs, cost curves are U-shaped because of the Law of Variable Proportions." }
      ]
    };

    // State Variables
    let currentStep = 1; // 1 to 6
    let selectedChapters = new Set();
    let preferenceState = {
      difficulty: "mix",
      qcount: 10,
      language: "english",
      mode: "practice",
      theme: "light"
    };

    const CHAPTER_NAMES = {
      1: "Theory of Demand and Supply",
      2: "Money Market",
      3: "International Trade",
      4: "Indian Economy",
      5: "Nature and Scope of Business Economics",
      6: "Public Finance",
      7: "Price Determination in Different Markets",
      8: "Business Cycles",
      9: "Determination of National Income",
      10: "Theory of Production and Cost"
    };

    const STEP_TITLES = {
      1: "Step 1: Select Chapters",
      2: "Step 2: Level of Difficulty",
      3: "Step 3: Select Question Count",
      4: "Step 4: Select Language",
      5: "Step 5: Select Test Mode",
      6: "Step 6: Review Summary & Start Test"
    };

    // DOM Nodes
    const sliderTrack = document.getElementById("wizard-slider-track");
    const btnPrev = document.getElementById("wizard-btn-prev");
    const btnNext = document.getElementById("wizard-btn-next");
    const btnStartCta = document.getElementById("btn-start-test-cta");
    const chapterCounter = document.getElementById("chapter-counter");
    const toggleAllBtn = document.getElementById("chapter-toggle-all");
    const chapterCards = document.querySelectorAll(".chapter-card");

    // Exit Focus View Buttons
    const btnExitEcon = document.getElementById("btn-exit-econ-focus");
    if (btnExitEcon) {
      btnExitEcon.addEventListener("click", () => navigateToView("home"));
    }

    let econTitleBlurTimeout = null;

    function setBtnTextSmooth(btn, targetText) {
      if (!btn) return;
      if (btn.textContent.trim() !== targetText.trim()) {
        btn.classList.add("text-blurring");
        setTimeout(() => {
          btn.textContent = targetText;
          btn.classList.remove("text-blurring");
        }, 100);
      } else {
        btn.textContent = targetText;
      }
    }

    // Update Wizard Stepper & Panels
    function updateWizardUI(shouldScroll = false) {
      // Scroll page up to top only when changing wizard step
      if (shouldScroll) {
        const mainContentArea = document.querySelector(".main-content-area");
        if (mainContentArea) {
          mainContentArea.scrollTop = 0;
        }
      }

      // Update slider track class for smooth sliding transition
      if (sliderTrack) {
        sliderTrack.className = `wizard-slider-track slide-step-${currentStep}`;
      }

      // Squeezed Header Titles
      const stepTitleEl = document.getElementById("econ-step-title");
      const stepBadgeEl = document.getElementById("econ-step-badge");
      const newTitle = STEP_TITLES[currentStep] || `Step ${currentStep}`;
      const newBadge = `${currentStep} of 6`;

      if (stepTitleEl) {
        const squeezeInfo = stepTitleEl.closest(".stepper-squeeze-info");
        if (squeezeInfo && stepTitleEl.textContent !== newTitle) {
          squeezeInfo.classList.remove("is-animating");
          stepTitleEl.textContent = newTitle;
          if (stepBadgeEl) stepBadgeEl.textContent = newBadge;
          void squeezeInfo.offsetWidth;
          squeezeInfo.classList.add("is-animating");
        } else {
          stepTitleEl.textContent = newTitle;
          if (stepBadgeEl) stepBadgeEl.textContent = newBadge;
        }
      }

      // Divided Segmented Progress Bar Updates
      const econProgressBar = document.getElementById("econ-progress-bar");
      if (econProgressBar) {
        const segments = econProgressBar.querySelectorAll(".progress-segment");
        segments.forEach((seg, idx) => {
          const segNum = idx + 1;
          if (segNum < currentStep) {
            seg.className = "progress-segment completed";
          } else if (segNum === currentStep) {
            seg.className = "progress-segment active";
          } else {
            seg.className = "progress-segment";
          }
        });
      }

      // Panels Active Slide State
      [1, 2, 3, 4, 5, 6].forEach((s) => {
        const panel = document.getElementById(`wizard-step-${s}`);
        if (panel) {
          if (s === currentStep) {
            panel.classList.add("active-slide");
          } else {
            panel.classList.remove("active-slide");
          }
        }
      });

      // Sticky Centered Footer & Action Buttons Visibility
      // Sticky Centered Footer & Action Buttons Visibility
      const wizardFooter = document.querySelector("#econ-practice-wizard .wizard-footer");

      if (currentStep === 1) {
        btnPrev.style.display = "inline-flex";
        btnPrev.classList.add("btn-hidden");
        btnNext.style.display = "inline-flex";
        btnNext.classList.remove("btn-hidden");
        setBtnTextSmooth(btnNext, "Next");
        if (selectedChapters.size > 0) {
          btnNext.disabled = false;
          btnNext.style.opacity = "1";
          btnNext.style.pointerEvents = "auto";
        } else {
          btnNext.disabled = true;
          btnNext.style.opacity = "0.35";
          btnNext.style.pointerEvents = "none";
        }
      } else if (currentStep < 6) {
        btnPrev.style.display = "inline-flex";
        btnPrev.classList.remove("btn-hidden");
        btnNext.style.display = "inline-flex";
        btnNext.classList.remove("btn-hidden");
        btnNext.disabled = false;
        btnNext.style.opacity = "1";
        btnNext.style.pointerEvents = "auto";
        setBtnTextSmooth(btnNext, "Next");
      } else if (currentStep === 6) {
        btnPrev.style.display = "inline-flex";
        btnPrev.classList.remove("btn-hidden");
        btnNext.style.display = "inline-flex";
        btnNext.classList.remove("btn-hidden");
        btnNext.disabled = false;
        btnNext.style.opacity = "1";
        btnNext.style.pointerEvents = "auto";
        setBtnTextSmooth(btnNext, "Start now");
        renderSummaryStep();
      }

      if (wizardFooter) {
        wizardFooter.style.display = "flex";
        wizardFooter.classList.toggle("single-btn", currentStep === 1);
        wizardFooter.classList.remove("animating");
        void wizardFooter.offsetWidth;
        wizardFooter.classList.add("animating");
      }
    }

    function renderSummaryStep() {
      const qCountEl = document.getElementById("summary-qcount");
      const diffEl = document.getElementById("summary-difficulty");
      const modeEl = document.getElementById("summary-mode");
      const langEl = document.getElementById("summary-language");
      const timeEl = document.getElementById("summary-time");
      const chCountLbl = document.getElementById("summary-chapters-count-lbl");
      const chTagsContainer = document.getElementById("summary-chapters-tags");

      const DIFF_SUMMARY_NAMES = { easy: "Easy", medium: "Medium", hard: "Hard", mix: "Mix Questions" };
      if (qCountEl) qCountEl.textContent = `${preferenceState.qcount} Questions`;
      if (diffEl) diffEl.textContent = DIFF_SUMMARY_NAMES[preferenceState.difficulty] || "Mix Questions";
      if (modeEl) modeEl.textContent = preferenceState.mode === "exam" ? "Exam Mode" : "Practice Mode";
      if (langEl) langEl.textContent = preferenceState.language.charAt(0).toUpperCase() + preferenceState.language.slice(1);
      if (timeEl) timeEl.textContent = `~${Math.ceil(preferenceState.qcount * 1)} Mins`;

      if (chCountLbl) chCountLbl.textContent = `Selected Chapters (${selectedChapters.size})`;

      if (chTagsContainer) {
        chTagsContainer.innerHTML = "";
        Array.from(selectedChapters).sort((a, b) => a - b).forEach((chId) => {
          const tag = document.createElement("span");
          tag.className = "chapter-tag";
          tag.textContent = `Ch ${chId}: ${CHAPTER_NAMES[chId] || "Chapter " + chId}`;
          chTagsContainer.appendChild(tag);
        });
      }
    }

    // Chapter Counter Update
    function updateChapterCounter() {
      if (chapterCounter) {
        chapterCounter.textContent = `${selectedChapters.size}/10 Selected`;
      }
      if (toggleAllBtn) {
        toggleAllBtn.textContent = selectedChapters.size === 10 ? "Deselect All" : "Select All";
      }
      updateWizardUI();
    }

    chapterCards.forEach((card) => {
      const checkbox = card.querySelector(".chapter-checkbox");
      const chapterId = parseInt(card.getAttribute("data-chapter-id"));

      card.addEventListener("click", (e) => {
        e.preventDefault();
        checkbox.checked = !checkbox.checked;
        if (checkbox.checked) {
          selectedChapters.add(chapterId);
          card.classList.add("selected");
        } else {
          selectedChapters.delete(chapterId);
          card.classList.remove("selected");
        }
        updateChapterCounter();
      });
    });

    // Select All Toggle
    if (toggleAllBtn) {
      toggleAllBtn.addEventListener("click", () => {
        const selectAll = selectedChapters.size < 10;
        chapterCards.forEach((card) => {
          const checkbox = card.querySelector(".chapter-checkbox");
          const chapterId = parseInt(card.getAttribute("data-chapter-id"));
          checkbox.checked = selectAll;
          if (selectAll) {
            selectedChapters.add(chapterId);
            card.classList.add("selected");
          } else {
            selectedChapters.delete(chapterId);
            card.classList.remove("selected");
          }
        });
        updateChapterCounter();
      });
    }

    // Preference Option Buttons
    function setupPrefButtonGroup(containerId, stateKey) {
      const container = document.getElementById(containerId);
      if (!container) return;
      const btns = container.querySelectorAll(".pref-btn, .mode-card");

      btns.forEach((btn) => {
        btn.addEventListener("click", () => {
          if (btn.disabled || btn.classList.contains("disabled")) return;
          btns.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          const val = btn.getAttribute("data-value");

          if (val === "custom" && stateKey === "qcount") {
            const wrap = document.getElementById("custom-qcount-wrap");
            if (wrap) wrap.classList.remove("hidden");
          } else if (stateKey === "qcount") {
            const wrap = document.getElementById("custom-qcount-wrap");
            if (wrap) wrap.classList.add("hidden");
            preferenceState.qcount = parseInt(val) || 10;
          } else {
            preferenceState[stateKey] = val;
          }
        });
      });
    }

    // Difficulty Slider Logic
    const DIFF_SLIDER_CONFIG = {
      1: { key: "easy", label: "Easy", icon: "fa-seedling", desc: "Fundamental questions to build core confidence", class: "diff-easy" },
      2: { key: "medium", label: "Medium", icon: "fa-gauge-simple-high", desc: "Standard examination difficulty problems", class: "diff-medium" },
      3: { key: "hard", label: "Hard", icon: "fa-fire", desc: "Complex high-level conceptual questions", class: "diff-hard" },
      4: { key: "mix", label: "Mix Ques.", icon: "fa-layer-group", desc: "Balanced combination of all difficulty levels", class: "diff-mix" }
    };

    function setupDifficultySlider(sliderId, fillId, badgeId, labelId, descId, ticksId, stateObj) {
      const slider = document.getElementById(sliderId);
      const fill = document.getElementById(fillId);
      const badge = document.getElementById(badgeId);
      const desc = document.getElementById(descId);
      const ticksContainer = document.getElementById(ticksId);

      if (!slider) return;

      let blurTimeout = null;
      let lastStageKey = null;

      function updateSliderUI(val, isInitial = false) {
        const floatVal = Math.max(0, Math.min(100, parseFloat(val) || 0));

        let stageKey = 4;
        if (floatVal <= 25) stageKey = 1;
        else if (floatVal <= 55) stageKey = 2;
        else if (floatVal <= 80) stageKey = 3;
        else stageKey = 4;

        const config = DIFF_SLIDER_CONFIG[stageKey];
        const isStageChanged = stageKey !== lastStageKey;
        lastStageKey = stageKey;

        if (fill) {
          fill.style.width = `${floatVal}%`;
          fill.className = `fat-slider-track-fill ${config.class}`;
        }

        slider.className = `difficulty-fat-slider ${config.class}`;

        const knobLabel = ticksContainer?.querySelector(".knob-floating-label");
        if (knobLabel) {
          knobLabel.style.left = `${floatVal}%`;
          knobLabel.style.transform = `translateX(-${floatVal}%)`;
        }

        const statusDisplay = slider.closest(".difficulty-slider-container")?.querySelector(".difficulty-status-display");

        function updateBadgeContent() {
          if (badge) {
            const startWidth = badge.getBoundingClientRect().width;
            if (startWidth > 0) {
              badge.style.width = `${startWidth}px`;
            }

            badge.className = `diff-badge-pill ${config.class}`;
            badge.innerHTML = `<i class="fa-solid ${config.icon}"></i> <span>${config.label}</span>`;

            badge.style.width = "auto";
            const endWidth = badge.getBoundingClientRect().width;

            if (startWidth > 0 && endWidth > 0) {
              badge.style.width = `${startWidth}px`;
              void badge.offsetWidth;
              badge.style.width = `${endWidth}px`;
            }
          }
          if (desc) desc.textContent = config.desc;
          if (knobLabel) {
            knobLabel.className = `knob-floating-label ${config.class}`;
            knobLabel.textContent = config.label;
          }
        }

        if (isInitial) {
          updateBadgeContent();
        } else if (isStageChanged) {
          if (statusDisplay) statusDisplay.classList.add("text-blurring");
          if (knobLabel) knobLabel.classList.add("label-blurring");
          if (blurTimeout) clearTimeout(blurTimeout);

          blurTimeout = setTimeout(() => {
            updateBadgeContent();
            if (statusDisplay) statusDisplay.classList.remove("text-blurring");
            if (knobLabel) knobLabel.classList.remove("label-blurring");
          }, 90);
        }

        stateObj.difficulty = config.key;
      }

      slider.addEventListener("input", (e) => {
        updateSliderUI(e.target.value);
      });

      updateSliderUI(slider.value, true);
    }

    setupDifficultySlider("econ-difficulty-slider", "econ-slider-track-fill", "econ-diff-badge", "econ-diff-label", "econ-diff-desc", "econ-diff-ticks", preferenceState);
    setupPrefButtonGroup("pref-qcount", "qcount");
    setupPrefButtonGroup("pref-language", "language");
    setupPrefButtonGroup("pref-mode", "mode");
    setupPrefButtonGroup("pref-theme", "theme");

    const customInput = document.getElementById("custom-qcount-input");
    if (customInput) {
      customInput.addEventListener("input", () => {
        let val = parseInt(customInput.value) || 10;
        val = Math.max(5, Math.min(100, val));
        preferenceState.qcount = val;
      });
    }

    // FULL WHITE BLUR START TEST COUNTDOWN OVERLAY
    function runStartTestCountdown(onComplete) {
      const overlay = document.getElementById("test-start-countdown-overlay");
      const numEl = document.getElementById("countdown-number");
      const subtextEl = document.getElementById("countdown-subtext");
      const appLayout = document.querySelector(".app-layout");

      if (!overlay || !numEl) {
        if (typeof onComplete === "function") onComplete();
        return;
      }

      if (overlay.classList.contains("active")) return;

      if (subtextEl) subtextEl.textContent = "GET READY...";

      // Screen full white blur transition
      overlay.classList.add("active");
      if (appLayout) appLayout.classList.add("screen-blurred");

      const numbers = ["3", "2", "1"];
      let idx = 0;

      // Wait for screen blur & white overlay to settle (400ms)
      setTimeout(() => {
        function showNextNumber() {
          if (idx < numbers.length) {
            numEl.textContent = numbers[idx];
            numEl.className = "countdown-number anim-blur-in";
            idx++;

            // Blur out number after hold
            setTimeout(() => {
              numEl.className = "countdown-number anim-blur-out";
            }, 450);

            // Proceed to next number
            setTimeout(() => {
              showNextNumber();
            }, 780);
          } else {
            if (typeof onComplete === "function") onComplete();
            overlay.classList.remove("active");
            if (appLayout) appLayout.classList.remove("screen-blurred");
          }
        }

        showNextNumber();
      }, 400);
    }

    // Wizard Navigation Buttons
    btnNext.addEventListener("click", () => {
      if (currentStep < 6) {
        if (currentStep === 1 && selectedChapters.size === 0) return;
        currentStep++;
        updateWizardUI(true);
      } else if (currentStep === 6) {
        runStartTestCountdown(() => {
          startPracticeTestSession();
        });
      }
    });

    btnPrev.addEventListener("click", () => {
      if (currentStep > 1) {
        currentStep--;
        updateWizardUI(true);
      }
    });

    if (btnStartCta) {
      btnStartCta.addEventListener("click", () => {
        runStartTestCountdown(() => {
          startPracticeTestSession();
        });
      });
    }

    // Initialize UI on load
    updateWizardUI(); updateWizardUI();

    // START TEST SESSION
    let activeTestQuestions = [];
    let currentQIndex = 0;
    let userAnswers = {};
    let visitedQuestions = new Set();
    let testTimerInterval = null;
    let secondsRemaining = 0;
    let econSessionStartTime = Date.now();

    function getChapterName(chId, isQuant = false) {
      const stepId = isQuant ? "quant-wizard-step-1" : "wizard-step-1";
      const card = document.querySelector(`#${stepId} .chapter-card[data-chapter-id="${chId}"] .chapter-title`);
      return card ? card.textContent.trim() : (isQuant ? "Quantitative Aptitude" : "Business Economics");
    }

    function startPracticeTestSession() {
      // Gather questions from selected chapters
      activeTestQuestions = [];
      const chList = Array.from(selectedChapters);

      chList.forEach((chId) => {
        if (QUESTION_BANK[chId]) {
          const chName = getChapterName(chId, false);
          QUESTION_BANK[chId].forEach((q) => {
            activeTestQuestions.push({
              ...q,
              chId: chId,
              chName: chName
            });
          });
        }
      });

      // Shuffle and slice to desired question count
      activeTestQuestions.sort(() => Math.random() - 0.5);
      const targetCount = Math.min(preferenceState.qcount, activeTestQuestions.length);
      activeTestQuestions = activeTestQuestions.slice(0, Math.max(targetCount, 2));

      currentQIndex = 0;
      userAnswers = {};
      visitedQuestions = new Set();
      visitedQuestions.add(0);

      // Hide wizard and focus header, show session
      practiceWizardCard.classList.add("hidden");
      testSessionContainer.classList.remove("hidden");
      document.querySelector(".main-content-area")?.classList.add("in-test-session");
      const econFocusHeader = document.querySelector("#view-test-economics .test-focus-header");
      if (econFocusHeader) econFocusHeader.classList.add("hidden");

      secondsRemaining = activeTestQuestions.length * 60; // 1 min per Q
      econSessionStartTime = Date.now();
      startExamTimer();

      renderCurrentQuestion();
    }

    function formatTime(totalSecs) {
      const mins = Math.floor(Math.max(0, totalSecs) / 60);
      const secs = Math.max(0, totalSecs) % 60;
      return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    }

    function startExamTimer() {
      if (testTimerInterval) clearInterval(testTimerInterval);
      testTimerInterval = setInterval(() => {
        const prevTimeStr = formatTime(secondsRemaining);
        secondsRemaining--;
        const currTimeStr = formatTime(secondsRemaining);
        const timerEl = document.getElementById("test-timer-val");
        if (timerEl) {
          timerEl.innerHTML = renderTimeDigitGroupHtml(currTimeStr, prevTimeStr, true);
        }
        if (secondsRemaining <= 0) {
          clearInterval(testTimerInterval);
          finishTestSession();
        }
      }, 1000);
    }

    function renderDigitGroupHtml(numVal, shouldAnimate = true) {
      const numStr = String(numVal);
      const digits = numStr.split("");
      const animClass = shouldAnimate ? " is-animating" : "";
      return `<span class="t-digit-group${animClass}">${digits.map((d, i) => `<span class="t-digit" data-stagger="${i + 1}">${d}</span>`).join("")}</span>`;
    }

    function renderTimeDigitGroupHtml(currTimeStr, prevTimeStr = null, shouldAnimate = true) {
      const currChars = String(currTimeStr).split("");
      const prevChars = prevTimeStr ? String(prevTimeStr).split("") : [];

      return `<span class="t-digit-group">${currChars
        .map((c, i) => {
          if (c === ":") return `<span class="t-colon">:</span>`;

          const changed = !prevTimeStr || i >= prevChars.length || c !== prevChars[i];
          const animClass = (shouldAnimate && changed) ? " is-animating" : "";

          return `<span class="t-digit${animClass}" data-stagger="${i + 1}">${c}</span>`;
        })
        .join("")}</span>`;
    }

    let shouldAnimateEconSwitch = true;

    function renderCurrentQuestion() {
      const qData = activeTestQuestions[currentQIndex];
      const isExam = preferenceState.mode === "exam";
      const totalQ = activeTestQuestions.length;
      visitedQuestions.add(currentQIndex);

      const doAnim = shouldAnimateEconSwitch;
      shouldAnimateEconSwitch = false;

      let answeredCount = 0;
      let skippedCount = 0;
      let notVisitedCount = 0;

      for (let i = 0; i < totalQ; i++) {
        if (userAnswers[i] !== undefined) {
          answeredCount++;
        } else if (visitedQuestions.has(i)) {
          skippedCount++;
        } else {
          notVisitedCount++;
        }
      }

      const isDarkTheme = preferenceState.theme === "dark";
      const wrapperClass = "live-test-wrapper" + (isDarkTheme ? " live-test-theme-dark" : "");

      let html = `
        <div class="${wrapperClass}">
          <div class="live-test-body">
            <!-- LEFT COLUMN (25%) -->
            <div class="live-test-left-col">
              <div class="live-q-badge-box">
                <span class="live-q-label">Question</span>
                <span class="live-q-big-num">${renderDigitGroupHtml(currentQIndex + 1, doAnim)}</span>
              </div>
              <div class="live-test-left-footer">
                <div class="live-test-timer-badge">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 6V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.24 16.24L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  <span id="test-timer-val">${renderTimeDigitGroupHtml(formatTime(secondsRemaining), false)}</span>
                </div>
                <button class="btn-toggle-live-theme" id="test-theme-toggle-btn" title="Toggle Light/Dark Theme">
                  ${isDarkTheme
                    ? `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`
                    : `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`}
                  <span>${isDarkTheme ? "Light" : "Dark"}</span>
                </button>
                <button class="btn-leave-test" id="test-exit-btn"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.8105 2C22.3973 8.57225 22.3973 15.4277 20.8105 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 11.95H2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.20081 16.8999L2.59082 13.3899C2.40292 13.2115 2.25331 12.9966 2.15106 12.7585C2.04881 12.5204 1.99609 12.264 1.99609 12.0049C1.99609 11.7458 2.04881 11.4893 2.15106 11.2512C2.25331 11.0131 2.40292 10.7983 2.59082 10.6199L6.20081 7.09985" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Leave</button>
              </div>
            </div>

            <!-- MIDDLE COLUMN (50%) -->
            <div class="live-test-main-col">
              <div class="live-q-text ${doAnim ? "q-animating" : ""}">${qData.q}</div>

              <div class="live-options-list ${doAnim ? "is-animating" : ""}">
                ${qData.opts.map((opt, idx) => {
                  const selectedIdx = userAnswers[currentQIndex];
                  const isSelected = selectedIdx === idx;
                  let optionClass = "live-option-card" + (isSelected ? " selected" : "");
                  if (selectedIdx !== undefined && !isExam) {
                    if (idx === qData.correct) optionClass += " option-correct";
                    else if (isSelected) optionClass += " option-wrong";
                  }

                  return `
                    <div class="${optionClass}" data-opt-idx="${idx}">
                      <div class="live-option-num">${String.fromCharCode(65 + idx)}</div>
                      <div class="live-option-text">${opt}</div>
                      <div class="live-option-radio">
                        <span class="radio-outer"><span class="radio-inner"></span></span>
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>

              ${!isExam && userAnswers[currentQIndex] !== undefined ? `
                <div class="live-feedback-box ${userAnswers[currentQIndex] === qData.correct ? "correct" : "wrong"}">
                  <strong>${userAnswers[currentQIndex] === qData.correct ? "✓ Correct Answer!" : "✗ Incorrect"}</strong>
                  <p style="margin-top: 4px;">${qData.exp}</p>
                </div>
              ` : ""}

              <div class="live-test-footer">
                <button class="btn-instant-help" id="test-btn-instant-help" type="button" title="Get Instant Help">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2L9.5 8.5 3 11l6.5 2.5L12 20l2.5-6.5L21 11l-6.5-2.5z"/>
                  </svg>
                  <span>Get Instant Help</span>
                </button>
                <button class="btn-wizard btn-prev btn-live-prev" id="test-btn-prev" ${currentQIndex === 0 ? "disabled" : ""}>Previous</button>
                <button class="btn-wizard btn-next btn-live-next" id="test-btn-next">${currentQIndex === totalQ - 1 ? "Submit & View Results" : "Save & Next"}</button>
              </div>
            </div>

            <!-- RIGHT COLUMN (25%) -->
            <div class="live-test-sidebar">

              <div class="palette-summary-box">
                <div class="palette-status-pill answered">
                  <span class="status-num">${answeredCount}</span>
                  <span>Answered</span>
                </div>
                <div class="palette-status-pill skipped">
                  <span class="status-num">${skippedCount}</span>
                  <span>Skipped</span>
                </div>
                <div class="palette-status-pill not-visited">
                  <span class="status-num">${notVisitedCount}</span>
                  <span>Not Visited</span>
                </div>
              </div>

              <div class="palette-grid-container">
                ${Array.from({ length: totalQ }, (_, i) => {
                  let btnClass = "palette-grid-btn";
                  if (i === currentQIndex) btnClass += " active-current";
                  if (userAnswers[i] !== undefined) btnClass += " status-answered";
                  else if (visitedQuestions.has(i)) btnClass += " status-skipped";
                  else btnClass += " status-not-visited";

                  return `
                    <button class="${btnClass}" data-q-idx="${i}">
                      <span class="palette-btn-num">${i + 1}</span>
                      <span class="palette-btn-dot"></span>
                    </button>
                  `;
                }).join("")}
              </div>
            </div>
          </div>
        </div>
      `;

      testSessionContainer.innerHTML = html;

      if (isDarkTheme) {
        testSessionContainer.classList.add("live-test-theme-dark");
        document.querySelector(".main-content-area")?.classList.add("live-test-theme-dark");
      } else {
        testSessionContainer.classList.remove("live-test-theme-dark");
        document.querySelector(".main-content-area")?.classList.remove("live-test-theme-dark");
      }

      // Event Listeners for Session Controls
      const themeToggleBtn = document.getElementById("test-theme-toggle-btn");
      if (themeToggleBtn) {
        themeToggleBtn.addEventListener("click", () => {
          preferenceState.theme = preferenceState.theme === "dark" ? "light" : "dark";
          renderCurrentQuestion();
        });
      }

      const exitBtn = document.getElementById("test-exit-btn");
      if (exitBtn) {
        exitBtn.addEventListener("click", exitTestSession);
        exitBtn.addEventListener("mouseenter", () => {
          document.querySelector(".live-test-body")?.classList.add("leave-hover-active");
          document.querySelector(".main-content-area")?.classList.add("leave-hover-active");
        });
        exitBtn.addEventListener("mouseleave", () => {
          document.querySelector(".live-test-body")?.classList.remove("leave-hover-active");
          document.querySelector(".main-content-area")?.classList.remove("leave-hover-active");
        });
      }

      const optBtns = testSessionContainer.querySelectorAll(".live-option-card");
      optBtns.forEach((card) => {
        card.addEventListener("click", () => {
          if (!isExam && userAnswers[currentQIndex] !== undefined) return;
          const optIdx = parseInt(card.getAttribute("data-opt-idx"));
          userAnswers[currentQIndex] = optIdx;
          shouldAnimateEconSwitch = false;
          renderCurrentQuestion();
        });
      });

      const paletteBtns = testSessionContainer.querySelectorAll(".palette-grid-btn");
      paletteBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          const qIdx = parseInt(btn.getAttribute("data-q-idx"));
          if (currentQIndex !== qIdx) {
            currentQIndex = qIdx;
            visitedQuestions.add(currentQIndex);
            shouldAnimateEconSwitch = true;
            renderCurrentQuestion();
          }
        });
      });

      const navPrev = document.getElementById("test-btn-prev");
      if (navPrev) {
        navPrev.addEventListener("click", () => {
          if (currentQIndex > 0) {
            currentQIndex--;
            visitedQuestions.add(currentQIndex);
            shouldAnimateEconSwitch = true;
            renderCurrentQuestion();
          }
        });
      }

      const navNext = document.getElementById("test-btn-next");
      if (navNext) {
        navNext.addEventListener("click", () => {
          if (currentQIndex < totalQ - 1) {
            currentQIndex++;
            visitedQuestions.add(currentQIndex);
            shouldAnimateEconSwitch = true;
            renderCurrentQuestion();
          } else {
            finishTestSession();
          }
        });
      }

      const helpBtn = document.getElementById("test-btn-instant-help");
      if (helpBtn) {
        helpBtn.addEventListener("click", () => {
          if (typeof window.openInstantHelpModal === "function") {
            window.openInstantHelpModal({
              question: qData.q,
              options: qData.opts,
              subject: "Business Economics",
              chapter: qData.chName || getChapterName(qData.chId, false),
              selectedOptionIndex: userAnswers[currentQIndex],
              selectedOptionText: userAnswers[currentQIndex] !== undefined ? qData.opts[userAnswers[currentQIndex]] : null,
              mode: preferenceState.mode,
              qNum: currentQIndex + 1,
              totalQ: totalQ
            });
          }
        });
      }
    }

    function exitTestSession() {
      if (testTimerInterval) clearInterval(testTimerInterval);
      document.querySelector(".main-content-area")?.classList.remove("in-test-session", "live-test-theme-dark");
      testSessionContainer.classList.remove("live-test-theme-dark");
      testSessionContainer.classList.add("hidden");
      practiceWizardCard.classList.remove("hidden");
      const econFocusHeader = document.querySelector("#view-test-economics .test-focus-header");
      if (econFocusHeader) econFocusHeader.classList.remove("hidden");
    }

    function finishTestSession() {
      if (testTimerInterval) clearInterval(testTimerInterval);
      let correctCount = 0;
      let incorrectCount = 0;
      let unansweredCount = 0;
      const chapterBreakdown = {};

      activeTestQuestions.forEach((q, idx) => {
        const chId = q.chId || 1;
        if (!chapterBreakdown[chId]) {
          chapterBreakdown[chId] = {
            name: q.chName || `Chapter ${chId}`,
            total: 0,
            correct: 0,
            incorrect: 0,
            unanswered: 0
          };
        }
        chapterBreakdown[chId].total++;

        const ans = userAnswers[idx];
        if (ans === undefined) {
          unansweredCount++;
          chapterBreakdown[chId].unanswered++;
        } else if (ans === q.correct) {
          correctCount++;
          chapterBreakdown[chId].correct++;
        } else {
          incorrectCount++;
          chapterBreakdown[chId].incorrect++;
        }
      });

      const totalQ = activeTestQuestions.length;
      const pct = totalQ > 0 ? Number(((correctCount * 100.0) / totalQ).toFixed(2)) : 0;
      const durationSecs = Math.max(1, Math.round((Date.now() - econSessionStartTime) / 1000));

      testSessionContainer.innerHTML = `
        <div class="test-results-card">
          <div class="results-score-circle">
            <div class="score-num">${pct}%</div>
            <div class="score-total">${correctCount}/${totalQ} Correct</div>
          </div>
          <h2 class="results-title">${pct >= 70 ? "Great Job! Practice Completed 🎉" : "Practice Session Completed"}</h2>
          <p class="results-desc">You scored ${correctCount} out of ${totalQ} questions correctly (${unansweredCount} unanswered) across ${selectedChapters.size} selected chapter(s).</p>
          
          <!-- Save status feedback box -->
          <div id="econ-save-status-box" class="save-status-box"></div>

          <div class="results-actions">
            <button class="btn-wizard btn-prev" id="results-restart-btn"><i class="fa-solid fa-rotate-right"></i> Start New Practice</button>
          </div>
        </div>
      `;

      document.getElementById("results-restart-btn").addEventListener("click", exitTestSession);

      // Async save to Student Dashboard via Supabase
      if (window.EcoDashboard && typeof window.EcoDashboard.handleQuizSave === "function") {
        window.EcoDashboard.handleQuizSave("econ-save-status-box", {
          subject: "economics",
          selected_chapters: Array.from(selectedChapters),
          total_questions: totalQ,
          correct_answers: correctCount,
          incorrect_answers: incorrectCount,
          unanswered_questions: unansweredCount,
          accuracy_percentage: pct,
          duration_seconds: durationSecs,
          difficulty: preferenceState.difficulty,
          mode: preferenceState.mode,
          chapter_breakdown: chapterBreakdown,
          sessionStartTime: econSessionStartTime
        });
      }
    }

    // Initial Wizard Setup Call
    updateWizardUI();
  }

  /* ==========================================================================
     7B. QUANTITATIVE APTITUDE PRACTICE WIZARD & TEST CONTROLLER
     ========================================================================== */
  const quantPracticeWizardCard = document.getElementById("quant-practice-wizard");
  const quantTestSessionContainer = document.getElementById("quant-test-session");

  if (quantPracticeWizardCard && quantTestSessionContainer) {
    const QUANT_QUESTION_BANK = {
      1: [
        { q: "The ratio of two numbers is 3:4. If 6 is added to each number, the ratio becomes 4:5. Find the numbers.", opts: ["12 and 16", "18 and 24", "15 and 20", "21 and 28"], correct: 1, exp: "Let numbers be 3x and 4x. (3x + 6) / (4x + 6) = 4 / 5 ==> 15x + 30 = 16x + 24 ==> x = 6. Numbers are 18 and 24." },
        { q: "What is the value of log₂ 64?", opts: ["4", "5", "6", "8"], correct: 2, exp: "Since 2⁶ = 64, by definition log₂ 64 = 6." }
      ],
      2: [
        { q: "If the roots of the quadratic equation 2x² - 8x + k = 0 are equal, find the value of k.", opts: ["4", "8", "16", "32"], correct: 1, exp: "For equal roots, Discriminant D = b² - 4ac = 0. (-8)² - 4(2)(k) = 0 ==> 64 - 8k = 0 ==> k = 8." },
        { q: "Find the sum of roots of the quadratic equation 3x² - 12x + 5 = 0.", opts: ["3", "4", "5/3", "-4"], correct: 1, exp: "Sum of roots = -b / a = -(-12) / 3 = 4." }
      ],
      3: [
        { q: "Solve the linear inequality for x ∈ ℝ: 3x - 5 < 7.", opts: ["x < 4", "x > 4", "x < 2", "x > 2"], correct: 0, exp: "3x - 5 < 7 ==> 3x < 12 ==> x < 4." }
      ],
      4: [
        { q: "Calculate the compound interest on ₹10,000 for 2 years at 10% p.a. compounded annually.", opts: ["₹2,000", "₹2,100", "₹2,200", "₹1,200"], correct: 1, exp: "Amount A = P(1 + r/100)ⁿ = 10,000 × (1.10)² = ₹12,100. CI = A - P = ₹12,100 - ₹10,000 = ₹2,100." },
        { q: "The simple interest on ₹5,000 at 8% per annum for 3 years is:", opts: ["₹1,000", "₹1,200", "₹1,500", "₹1,800"], correct: 1, exp: "SI = (P × R × T) / 100 = (5000 × 8 × 3) / 100 = ₹1,200." }
      ],
      5: [
        { q: "In how many ways can the letters of the word 'MATHS' be arranged?", opts: ["24", "60", "120", "720"], correct: 2, exp: "Total letters = 5 (all distinct). Number of arrangements = 5! = 5 × 4 × 3 × 2 × 1 = 120." },
        { q: "What is the value of ⁵C₃?", opts: ["5", "10", "15", "20"], correct: 1, exp: "⁵C₃ = 5! / (3! × 2!) = (5 × 4) / 2 = 10." }
      ],
      6: [
        { q: "Find the 10th term of the Arithmetic Progression (AP): 2, 5, 8, 11...", opts: ["27", "29", "31", "33"], correct: 1, exp: "First term a = 2, common difference d = 3. T₁₀ = a + 9d = 2 + 9(3) = 2 + 27 = 29." },
        { q: "Find the sum of the infinite Geometric Progression (GP): 1, 1/2, 1/4, 1/8...", opts: ["1.5", "2", "2.5", "3"], correct: 1, exp: "First term a = 1, common ratio r = 1/2. Sum of infinite GP = a / (1 - r) = 1 / (1 - 0.5) = 2." }
      ],
      7: [
        { q: "If n(A) = 20, n(B) = 30, and n(A ∩ B) = 10, find n(A ∪ B).", opts: ["30", "40", "50", "60"], correct: 1, exp: "n(A ∪ B) = n(A) + n(B) - n(A ∩ B) = 20 + 30 - 10 = 40." }
      ],
      8: [
        { q: "The mean of the first 5 positive integers (1, 2, 3, 4, 5) is:", opts: ["2.5", "3", "3.5", "4"], correct: 1, exp: "Sum = 1 + 2 + 3 + 4 + 5 = 15. Mean = 15 / 5 = 3." },
        { q: "The standard deviation of a dataset is always:", opts: ["Negative", "Non-negative (≥ 0)", "Zero always", "Greater than variance always"], correct: 1, exp: "Standard deviation is defined as the positive square root of variance, hence SD ≥ 0." }
      ],
      9: [
        { q: "If the Karl Pearson correlation coefficient r = 0.80, what is the Coefficient of Determination?", opts: ["0.40", "0.64", "0.80", "1.60"], correct: 1, exp: "Coefficient of Determination = r² = (0.80)² = 0.64 (or 64%)." }
      ],
      10: [
        { q: "A fair 6-sided die is rolled. What is the probability of rolling an even number?", opts: ["1/6", "1/3", "1/2", "2/3"], correct: 2, exp: "Even numbers on a die: {2, 4, 6} (3 outcomes). Total outcomes = 6. Probability = 3 / 6 = 1/2." }
      ]
    };

    let quantCurrentStep = 1;
    let quantSelectedChapters = new Set();
    let quantPrefState = {
      difficulty: "mix",
      qcount: 10,
      language: "english",
      mode: "practice",
      theme: "light"
    };

    const QUANT_CHAPTER_NAMES = {
      1: "Ratio & Proportion, Indices, Logarithms",
      2: "Equations & Quadratic Functions",
      3: "Linear Inequalities",
      4: "Time Value of Money (Compound Interest & Annuity)",
      5: "Permutations and Combinations",
      6: "Sequence and Series (AP & GP)",
      7: "Sets, Relations and Functions",
      8: "Measures of Central Tendency & Dispersion",
      9: "Correlation and Regression",
      10: "Probability & Theoretical Distributions"
    };

    const quantSliderTrack = document.getElementById("quant-wizard-slider-track");
    const quantStepNodes = {
      1: document.getElementById("quant-step-node-1"),
      2: document.getElementById("quant-step-node-2"),
      3: document.getElementById("quant-step-node-3")
    };
    const quantStepLines = {
      1: document.getElementById("quant-step-line-1"),
      2: document.getElementById("quant-step-line-2")
    };
    const quantStepPanels = {
      1: document.getElementById("quant-wizard-step-1"),
      2: document.getElementById("quant-wizard-step-2"),
      3: document.getElementById("quant-wizard-step-3")
    };
    const quantBtnPrev = document.getElementById("quant-wizard-btn-prev");
    const quantBtnNext = document.getElementById("quant-wizard-btn-next");
    const quantBtnStartCta = document.getElementById("quant-btn-start-test-cta");
    const quantChapterCounter = document.getElementById("quant-chapter-counter");
    const quantToggleAllBtn = document.getElementById("quant-chapter-toggle-all");
    const quantChapterCards = document.querySelectorAll(".quant-chapter-card");

    const quantBtnExit = document.getElementById("btn-exit-quant-focus");
    if (quantBtnExit) {
      quantBtnExit.addEventListener("click", () => navigateToView("home"));
    }

    let quantTitleBlurTimeout = null;

    function updateQuantWizardUI(shouldScroll = false) {
      // Scroll page up to top only when changing quant wizard step
      if (shouldScroll) {
        const mainContentArea = document.querySelector(".main-content-area");
        if (mainContentArea) {
          mainContentArea.scrollTop = 0;
        }
      }

      if (quantSliderTrack) {
        quantSliderTrack.className = `wizard-slider-track slide-step-${quantCurrentStep}`;
      }

      // Squeezed Header Titles
      const stepTitleEl = document.getElementById("quant-step-title");
      const stepBadgeEl = document.getElementById("quant-step-badge");
      const newTitle = STEP_TITLES[quantCurrentStep] || `Step ${quantCurrentStep}`;
      const newBadge = `${quantCurrentStep} of 6`;

      if (stepTitleEl) {
        const squeezeInfo = stepTitleEl.closest(".stepper-squeeze-info");
        if (squeezeInfo && stepTitleEl.textContent !== newTitle) {
          squeezeInfo.classList.remove("is-animating");
          stepTitleEl.textContent = newTitle;
          if (stepBadgeEl) stepBadgeEl.textContent = newBadge;
          void squeezeInfo.offsetWidth;
          squeezeInfo.classList.add("is-animating");
        } else {
          stepTitleEl.textContent = newTitle;
          if (stepBadgeEl) stepBadgeEl.textContent = newBadge;
        }
      }

      // Divided Segmented Progress Bar Updates
      const quantProgressBar = document.getElementById("quant-progress-bar");
      if (quantProgressBar) {
        const segments = quantProgressBar.querySelectorAll(".progress-segment");
        segments.forEach((seg, idx) => {
          const segNum = idx + 1;
          if (segNum < quantCurrentStep) {
            seg.className = "progress-segment completed";
          } else if (segNum === quantCurrentStep) {
            seg.className = "progress-segment active";
          } else {
            seg.className = "progress-segment";
          }
        });
      }

      // Panels Active Slide State
      [1, 2, 3, 4, 5, 6].forEach((s) => {
        const panel = document.getElementById(`quant-wizard-step-${s}`);
        if (panel) {
          if (s === quantCurrentStep) {
            panel.classList.add("active-slide");
          } else {
            panel.classList.remove("active-slide");
          }
        }
      });

      // Sticky Centered Footer & Action Buttons Visibility
      const wizardFooter = document.querySelector("#quant-practice-wizard .wizard-footer");

      if (quantCurrentStep === 1) {
        quantBtnPrev.style.display = "inline-flex";
        quantBtnPrev.classList.add("btn-hidden");
        quantBtnNext.style.display = "inline-flex";
        quantBtnNext.classList.remove("btn-hidden");
        setBtnTextSmooth(quantBtnNext, "Next");
        if (quantSelectedChapters.size > 0) {
          quantBtnNext.disabled = false;
          quantBtnNext.style.opacity = "1";
          quantBtnNext.style.pointerEvents = "auto";
        } else {
          quantBtnNext.disabled = true;
          quantBtnNext.style.opacity = "0.35";
          quantBtnNext.style.pointerEvents = "none";
        }
      } else if (quantCurrentStep < 6) {
        quantBtnPrev.style.display = "inline-flex";
        quantBtnPrev.classList.remove("btn-hidden");
        quantBtnNext.style.display = "inline-flex";
        quantBtnNext.classList.remove("btn-hidden");
        quantBtnNext.disabled = false;
        quantBtnNext.style.opacity = "1";
        quantBtnNext.style.pointerEvents = "auto";
        setBtnTextSmooth(quantBtnNext, "Next");
      } else if (quantCurrentStep === 6) {
        quantBtnPrev.style.display = "inline-flex";
        quantBtnPrev.classList.remove("btn-hidden");
        quantBtnNext.style.display = "inline-flex";
        quantBtnNext.classList.remove("btn-hidden");
        quantBtnNext.disabled = false;
        quantBtnNext.style.opacity = "1";
        quantBtnNext.style.pointerEvents = "auto";
        setBtnTextSmooth(quantBtnNext, "Start now");
        renderQuantSummaryStep();
      }

      if (wizardFooter) {
        wizardFooter.style.display = "flex";
        wizardFooter.classList.toggle("single-btn", quantCurrentStep === 1);
        wizardFooter.classList.remove("animating");
        void wizardFooter.offsetWidth;
        wizardFooter.classList.add("animating");
      }
    }

    function renderQuantSummaryStep() {
      const qCountEl = document.getElementById("quant-summary-qcount");
      const diffEl = document.getElementById("quant-summary-difficulty");
      const modeEl = document.getElementById("quant-summary-mode");
      const langEl = document.getElementById("quant-summary-language");
      const timeEl = document.getElementById("quant-summary-time");
      const chCountLbl = document.getElementById("quant-summary-chapters-count-lbl");
      const chTagsContainer = document.getElementById("quant-summary-chapters-tags");

      const DIFF_SUMMARY_NAMES = { easy: "Easy", medium: "Medium", hard: "Hard", mix: "Mix Questions" };
      if (qCountEl) qCountEl.textContent = `${quantPrefState.qcount} Questions`;
      if (diffEl) diffEl.textContent = DIFF_SUMMARY_NAMES[quantPrefState.difficulty] || "Mix Questions";
      if (modeEl) modeEl.textContent = quantPrefState.mode === "exam" ? "Exam Mode" : "Practice Mode";
      if (langEl) langEl.textContent = quantPrefState.language.charAt(0).toUpperCase() + quantPrefState.language.slice(1);
      if (timeEl) timeEl.textContent = `~${Math.ceil(quantPrefState.qcount * 1.5)} Mins`;

      if (chCountLbl) chCountLbl.textContent = `Selected Chapters (${quantSelectedChapters.size})`;

      if (chTagsContainer) {
        chTagsContainer.innerHTML = "";
        Array.from(quantSelectedChapters).sort((a, b) => a - b).forEach((chId) => {
          const tag = document.createElement("span");
          tag.className = "chapter-tag";
          tag.textContent = `Ch ${chId}: ${QUANT_CHAPTER_NAMES[chId] || "Chapter " + chId}`;
          chTagsContainer.appendChild(tag);
        });
      }
    }

    quantChapterCards.forEach((card) => {
      const checkbox = card.querySelector(".chapter-checkbox");
      const chapterId = parseInt(card.getAttribute("data-chapter-id"));

      card.addEventListener("click", (e) => {
        e.preventDefault();
        checkbox.checked = !checkbox.checked;
        if (checkbox.checked) {
          quantSelectedChapters.add(chapterId);
          card.classList.add("selected");
        } else {
          quantSelectedChapters.delete(chapterId);
          card.classList.remove("selected");
        }
        updateQuantChapterCounter();
      });
    });

    function updateQuantChapterCounter() {
      if (quantChapterCounter) {
        quantChapterCounter.textContent = `${quantSelectedChapters.size}/10 Selected`;
      }
      if (quantToggleAllBtn) {
        quantToggleAllBtn.textContent = quantSelectedChapters.size === 10 ? "Deselect All" : "Select All";
      }
      updateQuantWizardUI();
    }

    if (quantToggleAllBtn) {
      quantToggleAllBtn.addEventListener("click", () => {
        const selectAll = quantSelectedChapters.size < 10;
        quantChapterCards.forEach((card) => {
          const checkbox = card.querySelector(".chapter-checkbox");
          const chapterId = parseInt(card.getAttribute("data-chapter-id"));
          checkbox.checked = selectAll;
          if (selectAll) {
            quantSelectedChapters.add(chapterId);
            card.classList.add("selected");
          } else {
            quantSelectedChapters.delete(chapterId);
            card.classList.remove("selected");
          }
        });
        updateQuantChapterCounter();
      });
    }

    function setupQuantPrefGroup(containerId, stateKey) {
      const container = document.getElementById(containerId);
      if (!container) return;
      const btns = container.querySelectorAll(".pref-btn, .mode-card");

      btns.forEach((btn) => {
        btn.addEventListener("click", () => {
          if (btn.disabled || btn.classList.contains("disabled")) return;
          btns.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          const val = btn.getAttribute("data-value");

          if (val === "custom" && stateKey === "qcount") {
            const wrap = document.getElementById("quant-custom-qcount-wrap");
            if (wrap) wrap.classList.remove("hidden");
          } else if (stateKey === "qcount") {
            const wrap = document.getElementById("quant-custom-qcount-wrap");
            if (wrap) wrap.classList.add("hidden");
            quantPrefState.qcount = parseInt(val) || 10;
          } else {
            quantPrefState[stateKey] = val;
          }
        });
      });
    }

    setupDifficultySlider("quant-difficulty-slider", "quant-slider-track-fill", "quant-diff-badge", "quant-diff-label", "quant-diff-desc", "quant-diff-ticks", quantPrefState);
    setupQuantPrefGroup("quant-pref-qcount", "qcount");
    setupQuantPrefGroup("quant-pref-language", "language");
    setupQuantPrefGroup("quant-pref-mode", "mode");
    setupQuantPrefGroup("quant-pref-theme", "theme");

    const quantCustomInput = document.getElementById("quant-custom-qcount-input");
    if (quantCustomInput) {
      quantCustomInput.addEventListener("input", () => {
        let val = parseInt(quantCustomInput.value) || 10;
        val = Math.max(5, Math.min(100, val));
        quantPrefState.qcount = val;
      });
    }

    quantBtnNext.addEventListener("click", () => {
      if (quantCurrentStep < 6) {
        if (quantCurrentStep === 1 && quantSelectedChapters.size === 0) return;
        quantCurrentStep++;
        updateQuantWizardUI(true);
      } else if (quantCurrentStep === 6) {
        runStartTestCountdown(() => {
          startQuantPracticeTestSession();
        });
      }
    });

    quantBtnPrev.addEventListener("click", () => {
      if (quantCurrentStep > 1) {
        quantCurrentStep--;
        updateQuantWizardUI(true);
      }
    });

    if (quantBtnStartCta) {
      quantBtnStartCta.addEventListener("click", () => {
        runStartTestCountdown(() => {
          startQuantPracticeTestSession();
        });
      });
    }

    updateQuantWizardUI();

    updateQuantWizardUI();

    // START QUANT TEST SESSION
    let activeQuantQuestions = [];
    let quantCurrentQIndex = 0;
    let quantUserAnswers = {};
    let quantVisitedQuestions = new Set();
    let quantTimerInterval = null;
    let quantSecondsRemaining = 0;
    let quantSessionStartTime = Date.now();

    function startQuantPracticeTestSession() {
      activeQuantQuestions = [];
      const chList = Array.from(quantSelectedChapters);

      chList.forEach((chId) => {
        if (QUANT_QUESTION_BANK[chId]) {
          const chName = getChapterName(chId, true);
          QUANT_QUESTION_BANK[chId].forEach((q) => {
            activeQuantQuestions.push({
              ...q,
              chId: chId,
              chName: chName
            });
          });
        }
      });

      activeQuantQuestions.sort(() => Math.random() - 0.5);
      const targetCount = Math.min(quantPrefState.qcount, activeQuantQuestions.length);
      activeQuantQuestions = activeQuantQuestions.slice(0, Math.max(targetCount, 2));

      quantCurrentQIndex = 0;
      quantUserAnswers = {};
      quantVisitedQuestions = new Set();
      quantVisitedQuestions.add(0);

      quantSessionStartTime = Date.now();
      quantPracticeWizardCard.classList.add("hidden");
      quantTestSessionContainer.classList.remove("hidden");
      document.querySelector(".main-content-area")?.classList.add("in-test-session");
      const quantFocusHeader = document.querySelector("#view-test-quantitative .test-focus-header");
      if (quantFocusHeader) quantFocusHeader.classList.add("hidden");

      quantSecondsRemaining = activeQuantQuestions.length * 90; // 1.5 min per math Q
      startQuantExamTimer();

      renderQuantCurrentQuestion();
    }

    function startQuantExamTimer() {
      if (quantTimerInterval) clearInterval(quantTimerInterval);
      quantTimerInterval = setInterval(() => {
        const prevTimeStr = formatTime(quantSecondsRemaining);
        quantSecondsRemaining--;
        const currTimeStr = formatTime(quantSecondsRemaining);
        const timerEl = document.getElementById("quant-test-timer-val");
        if (timerEl) {
          timerEl.innerHTML = renderTimeDigitGroupHtml(currTimeStr, prevTimeStr, true);
        }
        if (quantSecondsRemaining <= 0) {
          clearInterval(quantTimerInterval);
          finishQuantTestSession();
        }
      }, 1000);
    }

    let shouldAnimateQuantSwitch = true;

    function renderQuantCurrentQuestion() {
      const qData = activeQuantQuestions[quantCurrentQIndex];
      const isExam = quantPrefState.mode === "exam";
      const totalQ = activeQuantQuestions.length;
      quantVisitedQuestions.add(quantCurrentQIndex);

      const doAnim = shouldAnimateQuantSwitch;
      shouldAnimateQuantSwitch = false;

      let answeredCount = 0;
      let skippedCount = 0;
      let notVisitedCount = 0;

      for (let i = 0; i < totalQ; i++) {
        if (quantUserAnswers[i] !== undefined) {
          answeredCount++;
        } else if (quantVisitedQuestions.has(i)) {
          skippedCount++;
        } else {
          notVisitedCount++;
        }
      }

      let html = `
        <div class="live-test-wrapper">
          <div class="live-test-body">
            <!-- LEFT COLUMN (25%) -->
            <div class="live-test-left-col">
              <div class="live-q-badge-box">
                <span class="live-q-label">Question</span>
                <span class="live-q-big-num" style="color:#b3b3b3;">${renderDigitGroupHtml(quantCurrentQIndex + 1, doAnim)}</span>
              </div>
              <div class="live-test-left-footer">
                <div class="live-test-timer-badge">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 6V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.24 16.24L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  <span id="quant-test-timer-val">${renderTimeDigitGroupHtml(formatTime(quantSecondsRemaining), false)}</span>
                </div>
                <button class="btn-toggle-live-theme" id="quant-test-theme-toggle-btn" title="Toggle Light/Dark Theme">
                  ${quantPrefState.theme === "dark"
                    ? `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`
                    : `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`}
                  <span>${quantPrefState.theme === "dark" ? "Light" : "Dark"}</span>
                </button>
                <button class="btn-leave-test" id="quant-test-exit-btn"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.8105 2C22.3973 8.57225 22.3973 15.4277 20.8105 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 11.95H2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.20081 16.8999L2.59082 13.3899C2.40292 13.2115 2.25331 12.9966 2.15106 12.7585C2.04881 12.5204 1.99609 12.264 1.99609 12.0049C1.99609 11.7458 2.04881 11.4893 2.15106 11.2512C2.25331 11.0131 2.40292 10.7983 2.59082 10.6199L6.20081 7.09985" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Leave</button>
              </div>
            </div>

            <!-- MIDDLE COLUMN (50%) -->
            <div class="live-test-main-col">
              <div class="live-q-text ${doAnim ? "q-animating" : ""}">${qData.q}</div>

              <div class="live-options-list ${doAnim ? "is-animating" : ""}">
                ${qData.opts.map((opt, idx) => {
                  const selectedIdx = quantUserAnswers[quantCurrentQIndex];
                  const isSelected = selectedIdx === idx;
                  let optionClass = "live-option-card" + (isSelected ? " selected" : "");
                  if (selectedIdx !== undefined && !isExam) {
                    if (idx === qData.correct) optionClass += " option-correct";
                    else if (isSelected) optionClass += " option-wrong";
                  }

                  return `
                    <div class="${optionClass}" data-opt-idx="${idx}">
                      <div class="live-option-num">${String.fromCharCode(65 + idx)}</div>
                      <div class="live-option-text">${opt}</div>
                      <div class="live-option-radio">
                        <span class="radio-outer"><span class="radio-inner"></span></span>
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>

              ${!isExam && quantUserAnswers[quantCurrentQIndex] !== undefined ? `
                <div class="live-feedback-box ${quantUserAnswers[quantCurrentQIndex] === qData.correct ? "correct" : "wrong"}">
                  <strong>${quantUserAnswers[quantCurrentQIndex] === qData.correct ? "✓ Correct Answer!" : "✗ Incorrect"}</strong>
                  <p style="margin-top: 4px;">${qData.exp}</p>
                </div>
              ` : ""}

              <div class="live-test-footer">
                <button class="btn-instant-help" id="quant-test-btn-instant-help" type="button" title="Get Instant Help">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2L9.5 8.5 3 11l6.5 2.5L12 20l2.5-6.5L21 11l-6.5-2.5z"/>
                  </svg>
                  <span>Get Instant Help</span>
                </button>
                <button class="btn-wizard btn-prev btn-live-prev" id="quant-test-btn-prev" ${quantCurrentQIndex === 0 ? "disabled" : ""}>Previous</button>
                <button class="btn-wizard btn-next btn-live-next" id="quant-test-btn-next">${quantCurrentQIndex === totalQ - 1 ? "Submit & View Results" : "Save & Next"}</button>
              </div>
            </div>

            <!-- RIGHT COLUMN (25%) -->
            <div class="live-test-sidebar">

              <div class="palette-summary-box">
                <div class="palette-status-pill answered">
                  <span class="status-num">${answeredCount}</span>
                  <span>Answered</span>
                </div>
                <div class="palette-status-pill skipped">
                  <span class="status-num" style="background:#2563eb;">${skippedCount}</span>
                  <span>Skipped</span>
                </div>
                <div class="palette-status-pill not-visited">
                  <span class="status-num">${notVisitedCount}</span>
                  <span>Not Visited</span>
                </div>
              </div>

              <div class="palette-grid-container">
                ${Array.from({ length: totalQ }, (_, i) => {
                  let btnClass = "palette-grid-btn";
                  if (i === quantCurrentQIndex) btnClass += " active-current";
                  if (quantUserAnswers[i] !== undefined) btnClass += " status-answered";
                  else if (quantVisitedQuestions.has(i)) btnClass += " status-skipped";
                  else btnClass += " status-not-visited";

                  return `
                    <button class="${btnClass}" data-q-idx="${i}">
                      <span class="palette-btn-num">${i + 1}</span>
                      <span class="palette-btn-dot" ${quantVisitedQuestions.has(i) && quantUserAnswers[i] === undefined ? 'style="background:#2563eb;"' : ""}></span>
                    </button>
                  `;
                }).join("")}
              </div>
            </div>
          </div>
        </div>
      `;

      quantTestSessionContainer.innerHTML = html;

      if (quantPrefState.theme === "dark") {
        quantTestSessionContainer.classList.add("live-test-theme-dark");
        document.querySelector(".main-content-area")?.classList.add("live-test-theme-dark");
      } else {
        quantTestSessionContainer.classList.remove("live-test-theme-dark");
        document.querySelector(".main-content-area")?.classList.remove("live-test-theme-dark");
      }

      const quantThemeToggleBtn = document.getElementById("quant-test-theme-toggle-btn");
      if (quantThemeToggleBtn) {
        quantThemeToggleBtn.addEventListener("click", () => {
          quantPrefState.theme = quantPrefState.theme === "dark" ? "light" : "dark";
          renderQuantCurrentQuestion();
        });
      }

      const exitBtn = document.getElementById("quant-test-exit-btn");
      if (exitBtn) {
        exitBtn.addEventListener("click", exitQuantTestSession);
        exitBtn.addEventListener("mouseenter", () => {
          document.querySelector(".live-test-body")?.classList.add("leave-hover-active");
          document.querySelector(".main-content-area")?.classList.add("leave-hover-active");
        });
        exitBtn.addEventListener("mouseleave", () => {
          document.querySelector(".live-test-body")?.classList.remove("leave-hover-active");
          document.querySelector(".main-content-area")?.classList.remove("leave-hover-active");
        });
      }

      const optBtns = quantTestSessionContainer.querySelectorAll(".live-option-card");
      optBtns.forEach((card) => {
        card.addEventListener("click", () => {
          if (!isExam && quantUserAnswers[quantCurrentQIndex] !== undefined) return;
          const optIdx = parseInt(card.getAttribute("data-opt-idx"));
          quantUserAnswers[quantCurrentQIndex] = optIdx;
          shouldAnimateQuantSwitch = false;
          renderQuantCurrentQuestion();
        });
      });

      const paletteBtns = quantTestSessionContainer.querySelectorAll(".palette-grid-btn");
      paletteBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          const qIdx = parseInt(btn.getAttribute("data-q-idx"));
          if (quantCurrentQIndex !== qIdx) {
            quantCurrentQIndex = qIdx;
            quantVisitedQuestions.add(quantCurrentQIndex);
            shouldAnimateQuantSwitch = true;
            renderQuantCurrentQuestion();
          }
        });
      });

      const navPrev = document.getElementById("quant-test-btn-prev");
      if (navPrev) {
        navPrev.addEventListener("click", () => {
          if (quantCurrentQIndex > 0) {
            quantCurrentQIndex--;
            quantVisitedQuestions.add(quantCurrentQIndex);
            shouldAnimateQuantSwitch = true;
            renderQuantCurrentQuestion();
          }
        });
      }

      const navNext = document.getElementById("quant-test-btn-next");
      if (navNext) {
        navNext.addEventListener("click", () => {
          if (quantCurrentQIndex < totalQ - 1) {
            quantCurrentQIndex++;
            quantVisitedQuestions.add(quantCurrentQIndex);
            shouldAnimateQuantSwitch = true;
            renderQuantCurrentQuestion();
          } else {
            finishQuantTestSession();
          }
        });
      }

      const quantHelpBtn = document.getElementById("quant-test-btn-instant-help");
      if (quantHelpBtn) {
        quantHelpBtn.addEventListener("click", () => {
          if (typeof window.openInstantHelpModal === "function") {
            window.openInstantHelpModal({
              question: qData.q,
              options: qData.opts,
              subject: "Quantitative Aptitude",
              chapter: qData.chName || getChapterName(qData.chId, true),
              selectedOptionIndex: quantUserAnswers[quantCurrentQIndex],
              selectedOptionText: quantUserAnswers[quantCurrentQIndex] !== undefined ? qData.opts[quantUserAnswers[quantCurrentQIndex]] : null,
              mode: quantPrefState.mode,
              qNum: quantCurrentQIndex + 1,
              totalQ: totalQ
            });
          }
        });
      }
    }

    function exitQuantTestSession() {
      if (quantTimerInterval) clearInterval(quantTimerInterval);
      document.querySelector(".main-content-area")?.classList.remove("in-test-session", "live-test-theme-dark");
      quantTestSessionContainer.classList.remove("live-test-theme-dark");
      quantTestSessionContainer.classList.add("hidden");
      quantPracticeWizardCard.classList.remove("hidden");
      const quantFocusHeader = document.querySelector("#view-test-quantitative .test-focus-header");
      if (quantFocusHeader) quantFocusHeader.classList.remove("hidden");
    }

    function finishQuantTestSession() {
      if (quantTimerInterval) clearInterval(quantTimerInterval);
      let correctCount = 0;
      let incorrectCount = 0;
      let unansweredCount = 0;
      const chapterBreakdown = {};

      activeQuantQuestions.forEach((q, idx) => {
        const chId = q.chId || 1;
        if (!chapterBreakdown[chId]) {
          chapterBreakdown[chId] = {
            name: q.chName || `Chapter ${chId}`,
            total: 0,
            correct: 0,
            incorrect: 0,
            unanswered: 0
          };
        }
        chapterBreakdown[chId].total++;

        const ans = quantUserAnswers[idx];
        if (ans === undefined) {
          unansweredCount++;
          chapterBreakdown[chId].unanswered++;
        } else if (ans === q.correct) {
          correctCount++;
          chapterBreakdown[chId].correct++;
        } else {
          incorrectCount++;
          chapterBreakdown[chId].incorrect++;
        }
      });

      const totalQ = activeQuantQuestions.length;
      const pct = totalQ > 0 ? Number(((correctCount * 100.0) / totalQ).toFixed(2)) : 0;
      const durationSecs = Math.max(1, Math.round((Date.now() - quantSessionStartTime) / 1000));

      quantTestSessionContainer.innerHTML = `
        <div class="test-results-card">
          <div class="results-score-circle" style="border-color:#2563eb; color:#2563eb;">
            <div class="score-num" style="color:#2563eb;">${pct}%</div>
            <div class="score-total">${correctCount}/${totalQ} Correct</div>
          </div>
          <h2 class="results-title">${pct >= 70 ? "Excellent Math Performance! 🎉" : "Math Practice Session Completed"}</h2>
          <p class="results-desc">You scored ${correctCount} out of ${totalQ} questions correctly (${unansweredCount} unanswered) across ${quantSelectedChapters.size} selected chapter(s).</p>
          
          <!-- Save status feedback box -->
          <div id="quant-save-status-box" class="save-status-box"></div>

          <div class="results-actions">
            <button class="btn-wizard btn-prev" id="quant-results-restart-btn"><i class="fa-solid fa-rotate-right"></i> Start New Math Practice</button>
          </div>
        </div>
      `;

      document.getElementById("quant-results-restart-btn").addEventListener("click", exitQuantTestSession);

      // Async save to Student Dashboard via Supabase
      if (window.EcoDashboard && typeof window.EcoDashboard.handleQuizSave === "function") {
        window.EcoDashboard.handleQuizSave("quant-save-status-box", {
          subject: "quantitative",
          selected_chapters: Array.from(quantSelectedChapters),
          total_questions: totalQ,
          correct_answers: correctCount,
          incorrect_answers: incorrectCount,
          unanswered_questions: unansweredCount,
          accuracy_percentage: pct,
          duration_seconds: durationSecs,
          difficulty: quantPrefState.difficulty,
          mode: quantPrefState.mode,
          chapter_breakdown: chapterBreakdown,
          sessionStartTime: quantSessionStartTime
        });
      }
    }
  }

  const quantContainer = document.getElementById("quant-problems-container");
  if (quantContainer) {
    const quantProblems = [
      {
        title: "1. Marginal Cost Derivative",
        desc: "Given Total Cost function: TC(Q) = 100 + 20Q - 1.5Q² + 0.08Q³. Find Marginal Cost equation MC(Q).",
        formula: "MC(Q) = d(TC)/dQ = 20 - 3.0Q + 0.24Q²",
        solution: "Differentiating TC with respect to Q gives: d(100)/dQ = 0, d(20Q)/dQ = 20, d(-1.5Q²)/dQ = -3.0Q, d(0.08Q³)/dQ = 0.24Q². Thus MC = 20 - 3Q + 0.24Q²."
      },
      {
        title: "2. Market Equilibrium & Price Control Shortage",
        desc: "Demand P = 100 - 2Q, Supply P = 10 + 1.5Q. If government sets Price Ceiling Pc = $40, calculate Quantity Shortage.",
        formula: "Qd = (100 - 40)/2 = 30, Qs = (40 - 10)/1.5 = 20  ==>  Shortage = 10 Units",
        solution: "At Pc = 40, Qd = 30 units, Qs = 20 units. Excess Demand (Housing Shortage) = Qd - Qs = 30 - 20 = 10 units."
      }
    ];

    quantProblems.forEach((qp) => {
      const qEl = document.createElement("div");
      qEl.className = "quant-item-card";
      qEl.innerHTML = `
        <div class="quant-problem-title">${qp.title}</div>
        <p style="font-size:0.88rem; color:var(--text-muted);">${qp.desc}</p>
        <div class="quant-math-formula">${qp.formula}</div>
        <button class="btn btn-secondary toggle-sol-btn" style="width:fit-content;">Show Step-by-Step Solution</button>
        <div class="quant-solution-box">${qp.solution}</div>
      `;

      const btn = qEl.querySelector(".toggle-sol-btn");
      const sol = qEl.querySelector(".quant-solution-box");
      btn.addEventListener("click", () => {
        sol.classList.toggle("open");
        btn.textContent = sol.classList.contains("open") ? "Hide Solution" : "Show Step-by-Step Solution";
      });

      quantContainer.appendChild(qEl);
    });
  }

  /* ==========================================================================
     8. PRESETS LAB LOGIC
     ========================================================================== */
  const presetsContainer = document.getElementById("presets-grid-container");
  if (presetsContainer && typeof EconomicPresets !== "undefined") {
    EconomicPresets.scenarios.forEach((scenario) => {
      const card = document.createElement("div");
      card.className = "preset-card";
      card.innerHTML = `
        <div class="preset-title">${scenario.title}</div>
        <div class="preset-desc">${scenario.description}</div>
      `;

      card.addEventListener("click", () => {
        if (scenario.category === "market") {
          document.getElementById("mkt-a").value = scenario.params.demandIntercept;
          document.getElementById("mkt-b").value = scenario.params.demandSlope;
          document.getElementById("mkt-c").value = scenario.params.supplyIntercept;
          document.getElementById("mkt-d").value = scenario.params.supplySlope;
          document.getElementById("mkt-tax").value = scenario.params.tax;
          document.getElementById("mkt-control-type").value = scenario.params.priceControl;
          document.getElementById("mkt-control-price").value = scenario.params.controlPrice;

          const link = document.querySelector('.sidebar-item[data-graph="sub-market"]');
          if (link) link.click();
          updateMarket();
        } else if (scenario.category === "revenue") {
          document.getElementById("rev-pmax").value = scenario.params.priceMax;
          document.getElementById("rev-slope").value = scenario.params.slope;
          document.getElementById("rev-fc").value = scenario.params.FC;
          document.getElementById("rev-c1").value = scenario.params.c1;
          document.getElementById("rev-c2").value = scenario.params.c2;

          const link = document.querySelector('.sidebar-item[data-graph="sub-rev-total"]');
          if (link) link.click();
          updateRevenueProfit();
        } else if (scenario.category === "production") {
          document.getElementById("prod-a").value = scenario.params.a;
          document.getElementById("prod-b").value = scenario.params.b;
          document.getElementById("prod-c").value = scenario.params.c;

          const link = document.querySelector('.sidebar-item[data-graph="sub-prod-shortrun"]');
          if (link) link.click();
          updateProduction();
        } else if (scenario.category === "macro") {
          document.getElementById("mac-c0").value = scenario.params.C0;
          document.getElementById("mac-mpc").value = scenario.params.MPC;
          document.getElementById("mac-i").value = scenario.params.I;
          document.getElementById("mac-g").value = scenario.params.G;
          document.getElementById("mac-nx").value = scenario.params.NX;
          document.getElementById("mac-t").value = scenario.params.taxRate;

          const link = document.querySelector('.sidebar-item[data-graph="sub-macro"]');
          if (link) link.click();
          updateMacro();
        }
      });

      presetsContainer.appendChild(card);
    });
  }

  // About Modal Logic
  const aboutBtn = document.getElementById("about-btn");
  const sidebarAboutBtn = document.getElementById("sidebar-about-btn");
  const aboutModal = document.getElementById("about-modal");
  const closeAboutModalBtn = document.getElementById("close-about-modal");

  const openAboutModal = () => {
    if (aboutModal) {
      aboutModal.classList.add("active");
      aboutModal.setAttribute("aria-hidden", "false");
    }
  };

  const closeModal = () => {
    if (aboutModal) {
      aboutModal.classList.remove("active");
      aboutModal.setAttribute("aria-hidden", "true");
    }
  };

  if (aboutBtn) aboutBtn.addEventListener("click", openAboutModal);
  if (sidebarAboutBtn) sidebarAboutBtn.addEventListener("click", openAboutModal);
  if (closeAboutModalBtn) closeAboutModalBtn.addEventListener("click", closeModal);

  if (aboutModal) {
    aboutModal.addEventListener("click", (e) => {
      if (e.target === aboutModal) closeModal();
    });
  }

  // Initial Update Runs
  updateProduction();
  updateCobb();
  updateCost();
  updateRevenueProfit();
  updateMarket();
  updateMacro();

  // Initial load complete cleanup
  setTimeout(() => {
    document.body.classList.remove("initial-load");
  }, 500);
});


    const refreshDashBtn = document.getElementById("btn-refresh-dashboard");
    if (refreshDashBtn) {
      refreshDashBtn.addEventListener("click", () => {
        if (window.EcoDashboard && typeof window.EcoDashboard.renderDashboard === "function") {
          window.EcoDashboard.renderDashboard();
        }
      });
    }
