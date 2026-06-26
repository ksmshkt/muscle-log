# muscle-log

A minimalist workout logger built with vanilla JS and Supabase — no framework, no build step.

**[Live demo →](https://muscle-log-lilac.vercel.app/)**

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

## Local development

No build step required — just serve the files.

```bash
npx serve .
# or
python3 -m http.server
```

Then open `http://localhost:3000` (or whichever port your server uses).

To use your own Supabase project, replace the `createClient` credentials in `app.js` with your own project URL and anon key, and apply the schema below.

## Database schema

```sql
create table exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  category text,
  is_preset boolean default false
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  date date not null
);

create table sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions not null,
  exercise_id uuid references exercises not null,
  weight numeric,
  reps integer,
  duration integer,
  unit text
);

create table body_weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  date date not null,
  weight numeric not null,
  unit text,
  unique (user_id, date)
);
```

Enable Row Level Security on all tables and add policies so users can only access their own rows.
