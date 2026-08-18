# MockView AI

**AI-powered mock interviews + ATS resume analysis** — practice with a real-time voice agent, get scored feedback, and improve your resume for Applicant Tracking Systems.

🌐 **Live Demo:** [https://mock-view-six.vercel.app](https://mock-view-six.vercel.app/)  
📦 **Repo:** [github.com/kushank55/MockView](https://github.com/kushank55/MockView)

> Try the demo without signup from the landing page, or create an account to save interview history, goals, and resume analyses.

---

## Overview

MockView AI is a **full-stack, production-deployed** product — not a tutorial clone. It combines:

| Area | What I built |
|------|----------------|
| **AI / LLM** | Streaming interviews + structured evaluation with Google Gemini 2.5 Flash (Vercel AI SDK) |
| **Realtime UX** | Voice interviews via Web Speech API (speech-to-text + text-to-speech) |
| **Full stack** | Next.js App Router, 14+ API routes, Prisma + Supabase PostgreSQL |
| **Auth & data** | NextAuth (credentials), bcrypt hashing, per-user interviews / resumes / goals / streaks |
| **Deployment** | Live on Vercel with serverless + Postgres connection pooling |

---

## Features

### Voice mock interviews
- **3 interview types:** Behavioral · Technical · System Design  
- **3 difficulty levels:** Easy · Medium · Hard (persona-tuned prompts)  
- **Streaming AI responses** (Gemini) for natural conversation feel  
- Optional **resume-personalized questions** from an uploaded/saved PDF  
- Optional camera + mic controls for a realistic session UI  

### Live AI coach (during the session)
- Speaking pace (**WPM**)
- **Filler-word** detection
- Clarity / coaching tips while you answer  

### Post-interview evaluation
- Overall score **0–100**
- **4 weighted skill dimensions:**
  - Communication — 25%
  - Technical — 30%
  - Problem Solving — 25%
  - Confidence — 20%
- Actionable coach tips + full transcript review  
- **STAR-method rewriting** for stronger answers  

### ATS resume intelligence
- PDF text extraction (`pdf2json`)
- **0–100 ATS score**
- **6 section scores** (Contact, Summary, Experience, Skills, Education, Keywords)
- **10–15 role-critical keywords** (found / missing)
- **4–8 prioritized improvements** (critical → suggestion)

### Progress dashboard
- Interview history & replay  
- Streaks, goals, weekly score trends  
- Deep links from weak skills → practice setup  

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | **Next.js 16** (App Router), **React 19**, **TypeScript** |
| AI | **Google Gemini 2.5 Flash**, **Vercel AI SDK** (`ai`, `@ai-sdk/google`) |
| Auth | **NextAuth.js**, **bcryptjs**, Prisma adapter |
| Database | **PostgreSQL** (Supabase), **Prisma ORM** |
| Voice | **Web Speech API** (STT / TTS) |
| PDF | **pdf2json** |
| UI | CSS Modules, Framer Motion, Lucide icons |
| Deploy | **Vercel** (serverless) |

---

## Architecture (high level)

```text
┌─────────────────┐     Web Speech API      ┌──────────────────────┐
│  Browser Client │◄──── STT / TTS ────────►│  Interview UI         │
│  (React 19)     │                         │  + Live Coach Panel  │
└────────┬────────┘                         └──────────────────────┘
         │ HTTPS / streaming
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Next.js App Router (API routes)                                │
│  • /api/interview/generate   → stream Gemini questions          │
│  • /api/interview/evaluate   → 0–100 multi-dimension scoring    │
│  • /api/resume/analyze       → ATS score + keywords + tips      │
│  • /api/interviews/[id]/star → STAR answer rewrite              │
│  • /api/dashboard, /goals, /auth, /user, …                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
     Google Gemini 2.5 Flash        Supabase PostgreSQL
     (Vercel AI SDK)                (Prisma + pooler)
```

**Core data models:** `User`, `Interview`, `ResumeAnalysis`, `Goal`, `Streak` (+ NextAuth `Account` / `Session`).

---

## App routes

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/login`, `/signup` | Auth |
| `/dashboard` | Stats, streaks, goals, insights |
| `/interview` | Live AI voice interview |
| `/resume` | ATS resume analyzer |
| `/history`, `/history/[id]` | Past interviews + STAR rewrite |
| `/settings` | Profile & preferences |

---

## Getting started

### Prerequisites
- Node.js 18+
- A Supabase (or any Postgres) database
- Google AI Studio API key ([get one](https://aistudio.google.com/apikey))

### 1. Clone & install

```bash
git clone https://github.com/kushank55/MockView.git
cd MockView
npm install
```

### 2. Environment variables

Copy `.env.example` → `.env` and fill in:

```bash
# Supabase pooler URL (port 6543) — required for Vercel/serverless
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Direct URL for Prisma migrations
DIRECT_URL="postgresql://...:5432/postgres"

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

GOOGLE_GENERATIVE_AI_API_KEY="your-gemini-api-key"
```

### 3. Database

```bash
npx prisma db push
# optional:
npm run db:seed
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Production build

```bash
npm run build
npm start
```

---

## Project structure

```text
src/
├── app/
│   ├── (auth)/          # Login & signup
│   ├── api/             # REST + streaming AI endpoints
│   ├── dashboard/       # Progress & goals
│   ├── history/         # Interview replay + STAR
│   ├── interview/       # Live voice session
│   ├── resume/          # ATS analyzer UI
│   └── settings/
├── components/          # UI + layout + providers
├── hooks/               # useSpeech, useCamera
└── lib/                 # auth, db, goals, progress helpers
prisma/
└── schema.prisma        # Users, interviews, resumes, goals, streaks
```

---

## Key engineering decisions

- **Streaming over blocking chat** — interview turns use `streamText` so the UI feels conversational.
- **Structured AI outputs** — evaluate / resume / STAR endpoints return validated JSON (scores clamped 0–100).
- **Serverless-safe Postgres** — Supabase **pooler** (`DATABASE_URL`) for runtime; **direct** URL for migrations.
- **Resume reuse** — analyzed resume text is stored so interviews can personalize questions without re-upload.
- **Auth-gated AI routes** — generation, evaluation, and analysis require a NextAuth session.

---

## Screenshots

> Add screenshots here after capturing from the live app.

| Landing | Interview | Dashboard | Resume ATS |
|---------|-----------|-----------|------------|
| *TODO*  | *TODO*    | *TODO*    | *TODO*     |

Suggested captures: landing hero, live interview + coach panel, score breakdown, ATS keyword view.

---

## Author

**Kushank Garg**  
🎓 B.Tech CSE — LNMIIT  
🔗 [LinkedIn](https://www.linkedin.com/in/kushank123/) · [GitHub](https://github.com/kushank55) · [LeetCode](https://leetcode.com/u/kushank55/)

---

## License

Private / personal project — all rights reserved unless otherwise noted.
