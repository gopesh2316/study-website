import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BorderBeam } from 'border-beam';

/**
 * FollowUpSendButton component
 * Wrapped in BorderBeam from 'border-beam'.
 * When isGenerating is true:
 *   - BorderBeam is active with colorVariant="colorful", strength=0.85, size="sm"
 *   - Displays rounded square stop icon (as seen in image)
 * When isGenerating is false:
 *   - BorderBeam is inactive
 *   - Displays simple arrow up button
 */
export function FollowUpSendButton({
  isGenerating = false,
  disabled = false,
  theme = 'dark',
  onSend,
  onStop,
  title = 'Send follow-up question'
}) {
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isGenerating) {
      if (typeof onStop === 'function') onStop();
    } else {
      if (!disabled && typeof onSend === 'function') onSend();
    }
  };

  return (
    <BorderBeam
      size="sm"
      colorVariant="colorful"
      strength={1}
      brightness={1.8}
      saturation={1.4}
      active={isGenerating}
      borderRadius={17}
      theme="dark"
      className="btn-followup-beam-container"
    >
      <button
        type="button"
        className={`btn-followup-send ${isGenerating ? 'is-generating' : ''}`}
        disabled={disabled && !isGenerating}
        onClick={handleClick}
        title={isGenerating ? 'Stop generating' : title}
        aria-label={isGenerating ? 'Stop generating' : title}
      >
        {isGenerating ? (
          <svg
            className="followup-stop-icon"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="2.5" y="2.5" width="15" height="15" rx="3.5" />
          </svg>
        ) : (
          <svg
            className="followup-arrow-icon"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        )}
      </button>
    </BorderBeam>
  );
}

/**
 * Controller to mount and manage FollowUpSendButton from vanilla JavaScript
 */
export function createFollowUpButton(mountEl, initialOptions = {}) {
  if (!mountEl) return null;

  const root = createRoot(mountEl);
  let state = {
    isGenerating: false,
    disabled: false,
    theme: resolveTheme(),
    ...initialOptions
  };

  function resolveTheme() {
    if (document.querySelector('.live-test-theme-dark') || document.body.classList.contains('live-test-theme-dark')) {
      return 'dark';
    }
    return 'light';
  }

  function render() {
    root.render(
      <FollowUpSendButton
        isGenerating={state.isGenerating}
        disabled={state.disabled}
        theme={state.theme || resolveTheme()}
        title={state.title}
        onSend={() => {
          if (typeof state.onSend === 'function') state.onSend();
        }}
        onStop={() => {
          if (typeof state.onStop === 'function') state.onStop();
        }}
      />
    );
  }

  render();

  return {
    setGenerating(isGenerating) {
      state.isGenerating = Boolean(isGenerating);
      state.theme = resolveTheme();
      render();
    },
    setDisabled(disabled) {
      state.disabled = Boolean(disabled);
      render();
    },
    setTheme(theme) {
      state.theme = theme;
      render();
    },
    destroy() {
      try {
        root.unmount();
      } catch (e) {
        // ignore unmount errors
      }
    }
  };
}

// Global window exposure
if (typeof window !== 'undefined') {
  window.BorderBeam = BorderBeam;
  window.FollowUpSendButton = FollowUpSendButton;
  window.createFollowUpButton = createFollowUpButton;
}

