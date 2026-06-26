# muscle-log

A minimalist workout logger built with vanilla JS and Supabase — no framework, no build step.

**[Live demo →](https://muscle-log-lilac.vercel.app/)**

> Demo account: `demo@muscle-log.app` / `Demo1234!`

---

## Features

- **Calendar view** — tap any date to open a log modal; dots mark days with recorded workouts
- **Workout logging** — add exercises with sets (weight × reps or duration), delete, and save per date
- **Previous session hints** — weight/reps from your last session appear as placeholders so you can add sets without retyping
- **Copy from date** — pull a previous day's workout into the current date in one tap
- **Body weight tracking** — auto-saved on blur; plotted over time in Charts
- **Charts** — body weight trend, exercise progress (max weight), and workout frequency
- **kg / lbs toggle** — per-session unit switching
- **Auth** — email/password sign-up and sign-in via Supabase Auth

## Stack

| Layer | Tool |
|---|---|
| Frontend | Vanilla JS + HTML + CSS (no framework) |
| Backend / DB | [Supabase](https://supabase.com) (PostgreSQL + Auth) |
| Charts | [Chart.js](https://www.chartjs.org/) |
| Hosting | [Vercel](https://vercel.com) |
