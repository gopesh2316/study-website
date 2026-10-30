/**
 * Instant Help AI Modal Module
 * Provides lightweight, contextual AI-powered conceptual assistance during live tests.
 * 
 * Features:
 * - Student-Friendly Source Viewer with expandable passage drawer
 * - Interactive multi-turn follow-up chat in the same popup ("STILL HAVE A DOUBT?")
 * - Automatic preservation of question, passage, source, and context
 * - Free guest access without requiring authentication
 * - Strict Exam Mode protections across all turns
 * - Does not pause, reset, or interfere with test timer or answers
 * - Temporary popup memory (no database persistence)
 */

(function () {
  'use strict';

  let isInitialRequestInFlight = false;

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Derives human-friendly source card information from AI search results and metadata.
   */
  function formatSourceCardInfo(data) {
    const sourceRef = (data && data.source) ? String(data.source).trim() : '';
    const hasPassage = Boolean(
      data &&
      data.passage &&
      typeof data.passage === 'string' &&
      data.passage.trim().length > 0 &&
      !sourceRef.includes('General Conceptual Knowledge')
    );

    if (!hasPassage) {
      return {
        hasPassage: false,
        title: 'Standard Curriculum Guidance',
        description: 'No linked textbook passage was found for this specific question in the index. The explanation above is drawn from standard CA Foundation curriculum principles.',
        filename: null,
        passage: null
      };
    }

    const details = data.sourceDetails || {};
    let friendlyTitle = details.title || null;
    let filename = details.filename || null;

    if (!friendlyTitle && sourceRef.includes('—')) {
      friendlyTitle = sourceRef;
    } else if (!friendlyTitle) {
      friendlyTitle = sourceRef;
    }

    // Handle case where title is just a raw markdown file name e.g. "unit2-demand.md"
    if (friendlyTitle && friendlyTitle.endsWith('.md')) {
      filename = friendlyTitle;
      friendlyTitle = 'Theory of Demand & Supply Study Material';
    } else if (!filename && sourceRef.endsWith('.md')) {
      filename = sourceRef;
    }

    let description = 'Relevant study material excerpt retrieved from index.';
    if (details.chapter) {
      description = `Chapter: ${details.chapter}`;
    }

    return {
      hasPassage: true,
      title: friendlyTitle || 'Indexed Study Material',
      description,
      filename,
      passage: String(data.passage).trim()
    };
  }

  function openInstantHelpModal(context) {
    // Prevent duplicate modal instances or concurrent initial requests
    if (document.getElementById('instant-help-modal') || isInitialRequestInFlight) {
      return;
    }

    const {
      question = '',
      options = [],
      subject = 'Business Economics',
      chapter = 'General',
      selectedOptionIndex,
      selectedOptionText,
      mode = 'practice',
      qNum = 1,
      totalQ = 10
    } = context || {};

    const isExam = mode === 'exam';

    // Temporary popup session state
    const popupSession = {
      question,
      options,
      subject,
      chapter,
      selectedOptionIndex,
      selectedOptionText,
      mode,
      initialData: null,
      retrievedPassage: null,
      sourceReference: null,
      conversationHistory: [], // [{ role: 'assistant', content: ... }, ...]
      userTurnsCount: 0,
      maxUserTurns: 3,
      isFollowUpInFlight: false
    };

    // 1. Create Modal Container
    const overlay = document.createElement('div');
    overlay.id = 'instant-help-modal';
    overlay.className = 'instant-help-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'instant-help-title');

    // 2. Build Base Skeleton
    overlay.innerHTML = `
      <div class="instant-help-dialog">
        <!-- Dialog Header -->
        <div class="instant-help-header">
          <div class="instant-help-title-group">
            <div class="instant-help-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L9.5 8.5 3 11l6.5 2.5L12 20l2.5-6.5L21 11l-6.5-2.5z"/>
              </svg>
            </div>
            <div>
              <h3 class="instant-help-title" id="instant-help-title">Instant Help</h3>
              <span class="instant-help-badge ${isExam ? 'badge-exam' : 'badge-practice'}">
                ${isExam ? 'Exam Mode • Conceptual Hints' : 'Practice Mode • Concept Guide'}
              </span>
            </div>
          </div>
          <button class="instant-help-close-btn" id="instant-help-x-btn" aria-label="Close instant help">&times;</button>
        </div>

        <!-- Scrollable Inner Content Area -->
        <div class="instant-help-content-scroll" id="instant-help-content-scroll">
          <!-- Question Reference Box -->
          <div class="instant-help-q-box">
            <div class="instant-help-q-meta">
              <span class="q-meta-pill">Q${escapeHtml(qNum)} of ${escapeHtml(totalQ)}</span>
              <span class="q-meta-subject">${escapeHtml(subject)} &bull; ${escapeHtml(chapter)}</span>
            </div>
            <p class="instant-help-q-text">${escapeHtml(question)}</p>

            ${Array.isArray(options) && options.length > 0 ? `
              <div class="instant-help-q-options">
                ${options.map((opt, idx) => {
                  const isSelected = selectedOptionIndex === idx;
                  const letter = String.fromCharCode(65 + idx);
                  return `
                    <div class="instant-help-q-opt-item ${isSelected ? 'opt-selected' : ''}">
                      <span class="opt-letter">${letter}</span>
                      <span class="opt-label">${escapeHtml(opt)}</span>
                      ${isSelected ? `<span class="opt-tag">Selected</span>` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            ` : ''}
          </div>

          <!-- Dynamic Body Area -->
          <div class="instant-help-body" id="instant-help-dynamic-body">
            <!-- Populated by JS -->
          </div>
        </div>

        <!-- Dialog Footer -->
        <div class="instant-help-footer">
          <div class="instant-help-timer-status">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>Test timer is running normally</span>
          </div>
          <button class="btn-instant-help-close" id="instant-help-footer-close-btn" type="button">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const dynamicBody = overlay.querySelector('#instant-help-dynamic-body');
    const scrollContainer = overlay.querySelector('#instant-help-content-scroll');
    const closeXBtn = overlay.querySelector('#instant-help-x-btn');
    const closeFooterBtn = overlay.querySelector('#instant-help-footer-close-btn');

    // 3. Close Handler
    function closeModal() {
      isInitialRequestInFlight = false;
      popupSession.isFollowUpInFlight = false;
      overlay.remove();
      document.removeEventListener('keydown', handleKeyDown);
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        const passagePanel = overlay.querySelector('#instant-help-passage-panel');
        if (passagePanel && !passagePanel.hidden) {
          closePassagePanel();
          return;
        }
        closeModal();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    closeXBtn.addEventListener('click', closeModal);
    closeFooterBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });

    // 4. Render Loading State
    function renderLoading() {
      dynamicBody.innerHTML = `
        <div class="instant-help-loading-state">
          <div class="instant-help-spinner"></div>
          <p class="loading-main-text">Consulting AI Tutor...</p>
          <p class="loading-sub-text">Analyzing the core concept and preparing student guidance</p>
        </div>
      `;
    }

    // Close helper for passage viewer panel
    function closePassagePanel() {
      const passagePanel = overlay.querySelector('#instant-help-passage-panel');
      const toggleBtn = overlay.querySelector('#btn-toggle-passage');
      if (passagePanel) {
        passagePanel.hidden = true;
      }
      if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
          </svg>
          <span>Read Relevant Section</span>
        `;
        toggleBtn.focus();
      }
    }

    // Open helper for passage viewer panel
    function openPassagePanel() {
      const passagePanel = overlay.querySelector('#instant-help-passage-panel');
      const toggleBtn = overlay.querySelector('#btn-toggle-passage');
      const closePassageBtn = overlay.querySelector('#btn-close-passage');
      if (passagePanel) {
        passagePanel.hidden = false;
      }
      if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', 'true');
        toggleBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          <span>Hide Section</span>
        `;
      }
      if (closePassageBtn) {
        closePassageBtn.focus();
      }
    }

    // 5. Render Success State with Feature 1 (Source Card) and Feature 2 (Follow-up Chat)
    function renderSuccess(data) {
      popupSession.initialData = data;
      popupSession.retrievedPassage = data.passage || null;
      popupSession.sourceReference = data.source || null;
      popupSession.conversationHistory = [
        { role: 'assistant', content: data.explanation || '' }
      ];

      const sourceInfo = formatSourceCardInfo(data);

      dynamicBody.innerHTML = `
        <div class="instant-help-result-content">
          <!-- Explanation Section -->
          <div class="instant-help-sec">
            <div class="instant-help-sec-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>Conceptual Explanation</span>
            </div>
            <p class="instant-help-sec-text">${escapeHtml(data.explanation)}</p>
          </div>

          ${data.reasoning_example ? `
            <!-- Reasoning & Example Section -->
            <div class="instant-help-sec">
              <div class="instant-help-sec-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
                <span>Reasoning &amp; Example</span>
              </div>
              <p class="instant-help-sec-text">${escapeHtml(data.reasoning_example)}</p>
            </div>
          ` : ''}

          <!-- FEATURE 1: Student-Friendly Source Card -->
          <div class="instant-help-source-card" id="instant-help-source-card">
            <div class="source-card-top">
              <div class="source-card-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                <span>FROM YOUR STUDY MATERIAL</span>
              </div>
              ${sourceInfo.hasPassage ? `
                <button class="btn-read-passage" id="btn-toggle-passage" type="button" aria-expanded="false" aria-controls="instant-help-passage-panel">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                  </svg>
                  <span>Read Relevant Section</span>
                </button>
              ` : ''}
            </div>

            <div class="source-card-body">
              <h4 class="source-card-title">${escapeHtml(sourceInfo.title)}</h4>
              <p class="source-card-desc">${escapeHtml(sourceInfo.description)}</p>

              ${sourceInfo.filename ? `
                <div class="source-card-details">
                  <span class="source-details-label">Source details:</span>
                  <span class="source-details-filename" title="${escapeHtml(sourceInfo.filename)}">${escapeHtml(sourceInfo.filename)}</span>
                </div>
              ` : ''}
            </div>

            ${sourceInfo.hasPassage ? `
              <!-- Expandable Passage Viewer Panel -->
              <div class="instant-help-passage-panel" id="instant-help-passage-panel" hidden>
                <div class="passage-panel-header">
                  <div class="passage-panel-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                      <polyline points="9 11 12 14 22 4"></polyline>
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                    </svg>
                    <span>Retrieved Study Passage</span>
                  </div>
                  <button class="btn-close-passage" id="btn-close-passage" type="button" aria-label="Close passage viewer">&times;</button>
                </div>
                <div class="passage-panel-content">
                  <div class="passage-panel-text">${escapeHtml(sourceInfo.passage)}</div>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- FEATURE 2: Follow-Up Chat Thread Area -->
          <div class="instant-help-chat-section" id="instant-help-chat-section">
            <div class="instant-help-chat-thread" id="instant-help-chat-thread" aria-live="polite">
              <!-- Follow-up message pairs dynamically appended here -->
            </div>
          </div>

          <!-- FEATURE 2: Docked Follow-Up Input ("STILL HAVE A DOUBT?") -->
          <div class="instant-help-followup-dock" id="instant-help-followup-dock">
            <div class="followup-dock-header">
              <div class="followup-dock-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>STILL HAVE A DOUBT?</span>
              </div>
              <span class="followup-turn-badge" id="followup-turn-badge">3 follow-ups left</span>
            </div>

            <div class="followup-input-row">
              <textarea
                id="instant-help-followup-input"
                class="followup-textarea"
                placeholder="Ask a follow-up about this explanation..."
                rows="1"
                maxlength="1000"
                aria-label="Ask a follow-up about this explanation"
              ></textarea>
              <button
                id="instant-help-followup-send-btn"
                class="btn-followup-send"
                type="button"
                title="Send follow-up question"
                aria-label="Send follow-up question"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                <span>Send</span>
              </button>
            </div>

            <div class="followup-meta-row">
              <span class="followup-shortcut-hint">Enter to send &bull; Shift+Enter for new line</span>
              <span class="followup-char-count" id="followup-char-count">0 / 1000</span>
            </div>
          </div>
        </div>
      `;

      // Setup Source Card Passage Panel Toggles
      const togglePassageBtn = dynamicBody.querySelector('#btn-toggle-passage');
      const closePassageBtn = dynamicBody.querySelector('#btn-close-passage');
      const passagePanel = dynamicBody.querySelector('#instant-help-passage-panel');

      if (togglePassageBtn && passagePanel) {
        togglePassageBtn.addEventListener('click', () => {
          if (passagePanel.hidden) {
            openPassagePanel();
          } else {
            closePassagePanel();
          }
        });
      }

      if (closePassageBtn) {
        closePassageBtn.addEventListener('click', closePassagePanel);
      }

      // Setup Follow-Up Chat Interactions
      const chatThread = dynamicBody.querySelector('#instant-help-chat-thread');
      const followupInput = dynamicBody.querySelector('#instant-help-followup-input');
      const followupSendBtn = dynamicBody.querySelector('#instant-help-followup-send-btn');
      const charCountEl = dynamicBody.querySelector('#followup-char-count');
      const turnBadgeEl = dynamicBody.querySelector('#followup-turn-badge');

      // Auto-resize textarea on input
      if (followupInput && charCountEl) {
        followupInput.addEventListener('input', () => {
          followupInput.style.height = 'auto';
          followupInput.style.height = Math.min(followupInput.scrollHeight, 120) + 'px';
          charCountEl.textContent = `${followupInput.value.length} / 1000`;
        });

        followupInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            executeFollowUp();
          }
        });
      }

      if (followupSendBtn) {
        followupSendBtn.addEventListener('click', executeFollowUp);
      }

      // Execute Follow-Up Query
      async function executeFollowUp() {
        if (!followupInput || popupSession.isFollowUpInFlight) return;
        if (popupSession.userTurnsCount >= popupSession.maxUserTurns) return;

        const text = followupInput.value.trim();
        if (!text) return;

        popupSession.isFollowUpInFlight = true;
        followupInput.disabled = true;
        if (followupSendBtn) followupSendBtn.disabled = true;

        // 1. Append user message to chat thread
        const userMsgEl = document.createElement('div');
        userMsgEl.className = 'instant-help-chat-turn user-turn';
        userMsgEl.innerHTML = `
          <div class="chat-bubble user-bubble">
            <div class="chat-sender-tag">You</div>
            <p class="chat-text">${escapeHtml(text)}</p>
          </div>
        `;
        chatThread.appendChild(userMsgEl);

        // 2. Append loading indicator bubble
        const loadingBubble = document.createElement('div');
        loadingBubble.className = 'instant-help-chat-turn assistant-turn chat-turn-loading';
        loadingBubble.id = 'chat-turn-loading';
        loadingBubble.innerHTML = `
          <div class="chat-bubble assistant-bubble">
            <div class="chat-sender-tag">AI Tutor</div>
            <div class="chat-typing-dots">
              <span></span><span></span><span></span>
            </div>
            <span class="chat-loading-text">Thinking...</span>
          </div>
        `;
        chatThread.appendChild(loadingBubble);
        scrollContainer.scrollTop = scrollContainer.scrollHeight;

        // Clear input text
        followupInput.value = '';
        followupInput.style.height = 'auto';
        if (charCountEl) charCountEl.textContent = '0 / 1000';

        // Add user question to payload conversation history
        popupSession.conversationHistory.push({
          role: 'user',
          content: text
        });

        try {
          const endpoint = (typeof window !== 'undefined' && window.location && (window.location.port === '8000' || window.location.port === '5500' || window.location.port === '3000'))
            ? 'http://127.0.0.1:8787/api/instant-help'
            : '/api/instant-help';

          const reqHeaders = { 'Content-Type': 'application/json' };
          if (typeof window !== 'undefined' && window.EcoAuth && typeof window.EcoAuth.getSession === 'function') {
            const currentSession = window.EcoAuth.getSession();
            if (currentSession && currentSession.access_token) {
              reqHeaders['Authorization'] = 'Bearer ' + currentSession.access_token;
            }
          }

          const payload = {
            question: popupSession.question,
            options: popupSession.options,
            subject: popupSession.subject,
            chapter: popupSession.chapter,
            selectedOptionIndex: popupSession.selectedOptionIndex,
            selectedOptionText: popupSession.selectedOptionText,
            mode: popupSession.mode,
            passage: popupSession.retrievedPassage,
            sourceReference: popupSession.sourceReference,
            conversationHistory: popupSession.conversationHistory
          };

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: reqHeaders,
            body: JSON.stringify(payload)
          });

          const rawText = await res.text();
          let resData;
          try {
            resData = JSON.parse(rawText);
          } catch {
            throw new Error(res.status === 429
              ? 'Rate limit reached. Please wait a minute before sending another follow-up.'
              : 'Server returned an invalid response.');
          }

          if (!res.ok || !resData.success) {
            throw new Error(resData.error || ('Server returned HTTP status ' + res.status));
          }

          // Remove loading indicator
          loadingBubble.remove();

          // Increment successful turn count
          popupSession.userTurnsCount++;

          // Append assistant message
          const assistantMsgEl = document.createElement('div');
          assistantMsgEl.className = 'instant-help-chat-turn assistant-turn';
          assistantMsgEl.innerHTML = `
            <div class="chat-bubble assistant-bubble">
              <div class="chat-sender-tag">
                <span>AI Tutor</span>
                ${isExam ? '<span class="chat-exam-pill">Exam Mode</span>' : ''}
              </div>
              <p class="chat-text">${escapeHtml(resData.explanation)}</p>
              ${resData.reasoning_example ? `
                <div class="chat-example-box">
                  <span class="example-label">Reasoning &amp; Example:</span>
                  <p class="example-text">${escapeHtml(resData.reasoning_example)}</p>
                </div>
              ` : ''}
            </div>
          `;
          chatThread.appendChild(assistantMsgEl);

          // Add assistant response to history
          popupSession.conversationHistory.push({
            role: 'assistant',
            content: resData.explanation
          });

          // Update turn count badge
          const remaining = popupSession.maxUserTurns - popupSession.userTurnsCount;
          if (turnBadgeEl) {
            turnBadgeEl.textContent = remaining > 0
              ? `${remaining} follow-up${remaining > 1 ? 's' : ''} left`
              : 'Limit reached';
          }

          // Check if limit is reached
          if (remaining <= 0) {
            followupInput.disabled = true;
            followupInput.placeholder = 'Follow-up limit reached for this question.';
            if (followupSendBtn) followupSendBtn.disabled = true;

            const limitNotice = document.createElement('div');
            limitNotice.className = 'chat-limit-notice';
            limitNotice.innerHTML = `
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>You have used all 3 follow-ups for this question. If you still have doubts, feel free to start a fresh Instant Help consultation on another question!</span>
            `;
            chatThread.appendChild(limitNotice);
          } else {
            followupInput.disabled = false;
            if (followupSendBtn) followupSendBtn.disabled = false;
            followupInput.focus();
          }

          scrollContainer.scrollTop = scrollContainer.scrollHeight;

        } catch (err) {
          loadingBubble.remove();

          // Roll back user turn in history on network/server error
          popupSession.conversationHistory.pop();

          // Append error notice in chat thread (do NOT erase chat history)
          const errorNotice = document.createElement('div');
          errorNotice.className = 'chat-turn-error';
          errorNotice.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>${escapeHtml(err.message || 'Unable to get an answer. Please try again.')}</span>
          `;
          chatThread.appendChild(errorNotice);

          // Restore text in input so student does not lose their typed message
          followupInput.value = text;
          followupInput.disabled = false;
          if (followupSendBtn) followupSendBtn.disabled = false;
          followupInput.focus();
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        } finally {
          popupSession.isFollowUpInFlight = false;
        }
      }
    }

    // 6. Render Error State with Retry
    function renderError(errorMessage) {
      dynamicBody.innerHTML = `
        <div class="instant-help-error-state">
          <div class="error-icon-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <div class="error-message-wrap">
            <h4 class="error-title">Help Unavailable</h4>
            <p class="error-desc">${escapeHtml(errorMessage)}</p>
          </div>
          <div class="error-actions-wrap">
            <button class="btn-help-retry" id="instant-help-retry-btn" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
              <span>Try Again</span>
            </button>
            <button class="btn-help-dismiss" id="instant-help-err-close-btn" type="button">Dismiss</button>
          </div>
        </div>
      `;

      const retryBtn = dynamicBody.querySelector('#instant-help-retry-btn');
      if (retryBtn) {
        retryBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          executeInitialHelpRequest();
        });
      }

      const dismissBtn = dynamicBody.querySelector('#instant-help-err-close-btn');
      if (dismissBtn) {
        dismissBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          closeModal();
        });
      }
    }

    // 7. Execute Request to Cloudflare Worker
    async function executeInitialHelpRequest() {
      renderLoading();
      isInitialRequestInFlight = true;

      try {
        const payload = {
          question,
          options,
          subject,
          chapter,
          selectedOptionIndex,
          selectedOptionText,
          mode
        };

        const endpoint = (typeof window !== 'undefined' && window.location && (window.location.port === '8000' || window.location.port === '5500' || window.location.port === '3000'))
          ? 'http://127.0.0.1:8787/api/instant-help'
          : '/api/instant-help';

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: (() => {
            const h = { 'Content-Type': 'application/json' };
            if (typeof window !== 'undefined' && window.EcoAuth && typeof window.EcoAuth.getSession === 'function') {
              const s = window.EcoAuth.getSession();
              if (s && s.access_token) h['Authorization'] = 'Bearer ' + s.access_token;
            }
            return h;
          })(),
          body: JSON.stringify(payload)
        });

        const rawText = await res.text();
        let data;
        try {
          data = JSON.parse(rawText);
        } catch {
          if (!res.ok) {
            throw new Error('Server returned HTTP ' + res.status + '. If running locally, please open http://localhost:8787');
          }
          throw new Error('Received an unparseable response from the server.');
        }

        if (!res.ok || !data.success) {
          throw new Error(data.error || ('Server returned HTTP status ' + res.status));
        }

        renderSuccess(data);
      } catch (err) {
        renderError(err.message || 'Unable to connect to the instant help service.');
      } finally {
        isInitialRequestInFlight = false;
      }
    }

    // Start initial request immediately upon modal launch
    executeInitialHelpRequest();
  }

  // Expose function globally for live-test runners and unit testing
  window.openInstantHelpModal = openInstantHelpModal;
  window.openInstantHelpModal.formatSourceCardInfo = formatSourceCardInfo;
})();
