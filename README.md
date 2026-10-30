# EcoMatrix - Interactive Economics & Graph Simulator

An interactive web simulator for microeconomics and macroeconomics with live dynamic graphs for production, cost curves, revenue, market equilibrium, taxes, and Keynesian multiplier.

Configured and optimized for **Cloudflare Workers** with Static Assets, Student Authentication, and Progress Tracking via **Supabase**.

---

## ⚡ Architecture Overview

- **Frontend**: Plain HTML5, CSS3, Vanilla JavaScript (ES6+), Chart.js (CDN), FontAwesome (CDN), Geom & Inter Google Fonts.
- **Edge Runtime**: Cloudflare Workers Static Assets (`env.ASSETS`) with edge API routes & security headers.
- **Authentication & Database**: Supabase (PostgreSQL with Row Level Security, email/password auth, append-only immutable test history).

---

## 🔐 Supabase Configuration Guide

### 1. Database Setup (SQL Schema)
Run the complete SQL schema in the **Supabase Dashboard $\rightarrow$ SQL Editor**:
- Creates `public.profiles` (with immutable ID/email trigger checks).
- Creates `public.quiz_attempts` (with internal consistency constraints: `correct + incorrect + unanswered = total`).
- Enables Row Level Security (RLS) on all tables (strict `auth.uid() = student_id`).
- Creates high-performance compound indexes for dashboard queries.

### 2. Disable Email Confirmation in Supabase
In **Supabase Dashboard $\rightarrow$ Authentication $\rightarrow$ Providers $\rightarrow$ Email**:
- Toggle **"Confirm email"** to **OFF** (disabled).
- This allows students to register and sign in immediately with persistent sessions.

### 3. Configure Frontend Credentials Safely
Copy [`js/config.example.js`](file:///c:/Users/GOPES/OneDrive/Desktop/study_website/js/config.example.js) to `js/config.js` and insert your Supabase project credentials:

```javascript
window.ECO_CONFIG = {
  SUPABASE_URL: "https://your-project.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-publishable-key"
};
```

> **Note**: `js/config.js` is automatically excluded in `.gitignore` so your project URL and keys are **never pushed to GitHub**. The `anon` key is safe for browser use because Row Level Security (RLS) enforces access control at the database level.

---

## 🚀 Running & Testing Locally

### 1. Run with Cloudflare Workers Dev Server
```bash
npm run dev
# or
npx wrangler dev
```
Local development server will run at **`http://localhost:8787`** (and port 8000).

### 2. Run the Unit Test Suite
Verify internal consistency math, accuracy formulas, idempotency keys, and chapter diagnostic logic:
```bash
node scripts/test_suite.js
```

---

## 📊 Features & Security Highlights

1. **Strict Save Reliability**:
   - Never displays a success message until Supabase confirms the insert.
   - If a network error occurs, preserves the completed quiz in memory and presents a one-click retry button with the identical idempotency key to prevent duplicates.
2. **Immutable Test History**:
   - Students cannot update or modify historical quiz results (append-only via RLS).
3. **Genuine Chapter Diagnostics**:
   - Accurately tracks chapter-specific performance from `chapter_breakdown` JSONB; unattempted chapters are never fabricated.
4. **Guest Mode Preserved**:
   - Students can practice all quizzes without signing in; guest results offer an optional prompt to sign in and save to their dashboard.
