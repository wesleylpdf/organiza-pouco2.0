# Quick Guide - Organiza Pouco v2.0

## Getting Started in 5 Minutes

### 1. Quick Setup

```bash
# Clone and install
git clone https://github.com/wesleylpdf/organiza-pouco2.0.git
cd organiza-pouco
npm install

# Configure Supabase
cp .env.example .env
# Edit .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# Run the schema in Supabase SQL Editor
# Paste contents of supabase/schema.sql and execute

# Start the application
npm run dev
```

### 2. First Access

1. Open http://localhost:5173
2. Click "Don't have an account? Sign up"
3. Fill in email and password (minimum 6 characters)
4. Confirm email (if enabled in Supabase)
5. Log in

### 3. Adding Transactions

1. **Amount**: Enter the value (e.g., 150.50) -- must be greater than zero
2. **Date**: Select the date (default: today)
3. **Type**: Choose Income (+) or Expense (-)
4. **Category**: Select from 9 available categories
5. **Fixed?**: Check if it's recurring (rent, salary, etc.)
6. **Description**: Add a description (max 100 characters)
7. Click "Save"

> Data is validated in real time. Invalid fields show a red border; valid fields show a green border.

### 4. Navigating Between Cycles

- **Financial cycle**: 9th of the month to the 8th of the next month
- **"Previous" and "Next" buttons**: Navigate between cycles
- **Displayed date**: Shows the current cycle period in the header

### 5. Fixed Transactions

Fixed transactions are those that repeat every month (rent, salary, etc.)

**Apply fixed from previous cycle:**
1. Click the "Apply fixed from previous cycle" button
2. Confirm the action
3. Fixed transactions will be duplicated with adjusted date (+1 month)
4. A green toast confirms the number of applied transactions

**Filter only fixed:**
- Check "Show only Fixed" at the top of the list

### 6. Distribution Chart

The pie chart shows expense distribution by category:
- Only expenses (outflows) are counted
- 9 distinct colors per category
- Tooltips show amount and percentage

### 7. Dark/Light Mode

- Click the theme button in the header
- Preference is automatically saved to localStorage

### 8. Editing/Deleting Transactions

- **Edit**: Click "Edit" next to the transaction -- the form is auto-filled
- **Delete**: Click "Delete" -- a confirmation is requested before deletion

## Visual Feedback

The app uses a **toast** notification system for visual feedback:

| Type | Color | When it appears |
|------|-------|-----------------|
| Success | Green | Transaction created/updated/deleted |
| Error | Red | Operation failure or validation error |
| Warning | Yellow | Unusual situations |
| Info | Blue | General information (e.g., no fixed found) |

Toasts appear in the upper right corner and auto-dismiss (3s for success, 5s for errors). Click to close.

### Loading States

- **Buttons disabled** during operations (save, apply fixed)
- **Button text** changes to "Saving..." or "Applying..." during the operation
- **Fixed checkbox** disabled while loading

### Real-Time Validation

Form fields show visual feedback via CSS:
- **Green border**: valid field
- **Red border**: invalid field (e.g., negative value, wrong date format)

Validation errors also appear as red toasts with specific messages like:
- "Amount must be greater than zero"
- "Date must be in YYYY-MM-DD format"
- "Description must be at most 100 characters"

## Tips

### Better Organization

1. **Use consistent categories** -- Avoid variations within the same category
2. **Mark fixed transactions** -- Enables automatic monthly application
3. **Review weekly** -- Keeps tracking up to date
4. **Use clear descriptions** -- Makes future identification easier

### Available Categories

| Icon | Category | Typical use |
|------|----------|-------------|
| 💰 | Salary | Income |
| 🍕 | Food | Meals, groceries |
| 🏠 | Housing | Rent, utility bills |
| 🚗 | Transport | Fuel, maintenance |
| 🎮 | Leisure | Entertainment |
| 🏥 | Health | Doctors, pharmacy |
| 📚 | Education | Courses, materials |
| 📈 | Investments | Financial applications |
| ✨ | Others | Other expenses/income |

## Common Issues

### "I can't log in"
- Check if your email is confirmed in Supabase
- Use "Forgot my password" to reset
- Confirm `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct in `.env`

### "Transactions don't appear"
- Check if you're in the correct cycle (navigate with the buttons)
- Confirm the schema `supabase/schema.sql` was executed in Supabase SQL Editor
- Check that RLS policies are active on the `transacoes` table

### "Chart doesn't update"
- Add expense transactions first (chart only shows outflows)
- The chart updates automatically on save/delete

### "Error connecting to Supabase"
- Check your internet connection
- Confirm the Supabase project is active
- Check credentials in `.env`

## Data Migration (from Google Sheets)

If you have data from the previous version (Google Sheets):

1. Export data to JSON (format in `data-export.example.json`)
2. Save as `data-export.json` in the project root
3. Configure Supabase environment variables in `.env`
4. Get a Supabase session token:
   ```bash
   # Log in via API and capture the access_token
   curl -X POST "https://your-project.supabase.co/auth/v1/token?grant_type=password" \
     -H "apikey: YOUR_ANON_KEY" \
     -d '{"email":"your@email.com","password":"your-password"}'
   ```
5. Run the migration:
   ```bash
   export SUPABASE_SESSION_TOKEN=<access_token>
   npx tsx scripts/migrate-data.ts
   ```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Starts dev server (localhost:5173) |
| `npm run build` | Produces production build in `dist/` |
| `npm run preview` | Preview production build |
| `npm test` | Runs unit tests (Vitest) |
| `npm run test:e2e` | Runs E2E tests (Playwright) |

## Project Structure

```
src/
├── components/     # DOM components (AuthForm, Header, TransacaoForm, etc.)
├── hooks/          # Business logic (useAuth, useTransacoes)
├── stores/         # Global state (AppState - singleton)
├── services/       # Supabase integration (transacoes)
├── utils/          # Utilities (ciclo, format, chart, validation, toast, logger)
├── lib/            # Supabase client
├── types/          # TypeScript types
├── main.ts         # Entry point
└── styles.css      # Custom styles (animations, loading, a11y)

supabase/
└── schema.sql      # PostgreSQL schema + RLS + triggers

scripts/
└── migrate-data.ts # Google Sheets -> Supabase migration script
```

## Tech Stack

- **TypeScript** + **Vite** -- Build tool
- **Supabase** -- Auth + PostgreSQL + Row Level Security
- **Chart.js** -- Pie chart
- **Tailwind CSS** (CDN) -- Styling
- **Vitest** -- Unit tests
- **Playwright** -- E2E tests

## Support

- **Tests**: `npm test` (18 unit tests) and `npm run test:e2e`
- **Issues**: Open on the GitHub repository
