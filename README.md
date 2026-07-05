# Neat Team 1943 — Finance

Money-management platform for an FRC team. React + Vite front end, Supabase (Postgres + Auth + Storage + Edge Functions) back end, deployed free to GitHub Pages. Bilingual Hebrew/English, RTL by default.

## What it does

- **Ledger** with four transaction types: income, expense, transfer, and in-kind (a sponsor buying you something — counts toward that sponsor's contribution and the category acquired, but never touches a cash account).
- **Accounts** as buckets: bank, school-held, store credit, city fund, cash. Store-credit balances fill from income (sponsor) or a transfer (bank).
- **Per-season** with full history — nothing is deleted, everything filters by season.
- **Dashboard** with income/expense-by-month, spend-by-category, income-by-source, and live account balances.
- **Transactions table** with filters (type / account / category / source / date range), search, and column sort.
- **Budgets** per season and per category, with burn-down bars (green → orange → red as you approach and exceed the limit).
- **Shopping / wish list** with links, מק״ט (SKU), your own priority levels, status, and planned funding account. A **Buy** action turns an item straight into an expense and links it back.
- **Excel export** of whatever's currently filtered — multi-sheet: transactions, by-category, by-source, balances.
- **Receipts (קבלה)** uploaded to private storage, opened via short-lived signed URLs.
- **Roles**: mentor (full), editor (add/edit ledger + shopping), viewer (read-only). Mentors can **invite teammates by email** from the app.

## 1. Supabase

1. Create a project. In Authentication → Providers → Email, turn **off** "Allow new users to sign up".
2. Run the SQL migrations in order in the SQL editor:
   - `01_foundation.sql` — schema, RLS, receipts storage, balances view
   - `02_budgets.sql` — budgets table + RLS
   - `03_seed.sql` — *optional* starter season / accounts / categories / priority levels
3. Create your own auth user (Authentication → Users), copy the UID, and run the bootstrap insert at the bottom of `01_foundation.sql` to make yourself a `mentor`.
4. Deploy the invite function (needs the Supabase CLI):
   ```bash
   supabase functions deploy invite_member
   ```
   Invites use Supabase's email service — for production volume, configure SMTP under Authentication → Emails. The function reads the auto-injected `SUPABASE_SERVICE_ROLE_KEY`; no extra secret needed.

## 2. Local dev

```bash
npm install
cp .env.example .env.local   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

## 3. Deploy to GitHub Pages

1. Push to a GitHub repo (`main` branch).
2. Repo → Settings → Secrets and variables → Actions → add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Repo → Settings → Pages → Source = **GitHub Actions**.
4. Every push to `main` builds and deploys. The app uses `HashRouter` + relative asset paths, so it works on any Pages URL without 404s on deep links.

> The anon key ships in the client bundle — that's expected. RLS is the only wall, so keep signup off and keep the `members` table tight.

## Members

- **Invite by email** (mentor): Settings → Members → Invite member. Creates the auth user and the members row in one step via the `invite_member` Edge Function.
- **Manual** fallback: create the user in the Supabase dashboard, copy the UID, and add a members row with it.

## Stack notes

- `account_balances` is a DB view (all-time, in-kind excluded). Season "net" is computed client-side.
- Budgets count expense + in-kind against each category; the "Overall" budget tracks all spend for the season.
- Pages are lazy-loaded, so recharts (dashboard) and xlsx (export) only download on the route that uses them. Initial load ≈ 86 kB gzipped.
