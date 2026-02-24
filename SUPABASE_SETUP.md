# 🔧 Supabase Backend Setup

## Problem
Your website data is being lost on refresh because it's only stored in browser memory. The backend database (Supabase) needs to be configured to persist data.

---

## ✅ Quick Fix (5 minutes)

### Step 1: Check Your Supabase Project

1. Go to https://supabase.com/dashboard
2. Look for a project with URL: **nljtrilrephwybtakaxc.supabase.co**
   - ✅ If you see it, click on it to open
   - ❌ If not found, **you need to create a new Supabase project** (see below)

### Step 2: Apply Database Schema (CRITICAL!)

This is the most important step - it creates all the tables where your data will be stored.

1. In Supabase Dashboard, click **SQL Editor** in the left sidebar
2. Click  **New query** button
3. Open the file `supabase/schema.sql` in your code editor
4. **Copy ALL the SQL** (it's about 180 lines)
5. **Paste into the Supabase SQL Editor**
6. Click **Run** button (bottom right) or press `Ctrl+Enter`

You should see: **Success. No rows returned**

This creates 8 tables:
- ✅ profiles
- ✅ employees  
- ✅ attendance
- ✅ invoices
- ✅ invoice_items
- ✅ transactions
- ✅ inventory
- ✅ support_requests

### Step 3: Configure Authentication

1. Go to **Authentication** → **Providers**
2. Ensure **Email** provider is enabled (toggle switch ON)
3. For easier development testing:
   - Go to **Authentication** → **URL Configuration** 
   - Change "Site URL" if needed
   - Go to **Authentication** → **Email Templates**
   - Optionally disable "Confirm email" for development

### Step 4: Test It!

1. **Restart your dev server:**
   ```bash
   npm run dev
   ```

2. **Sign up a new user** in your app (http://localhost:3001)

3. **Complete onboarding** with business details

4. **Add some data:**
   - Create an employee
   - Add a transaction
   - Create an invoice

5. **Refresh the page** - your data should still be there! ✨

6. **Verify in Supabase:**
   - Go to Supabase Dashboard → **Table Editor**
   - Click on "profiles", "employees", "transactions" etc.
   - You should see your data!

---

## 🆕 If You Need to Create a New Supabase Project

1. Go to https://supabase.com
2. Sign in or create account
3. Click **New Project**
4. Fill in:
   - Name: "Demo App" (or anything)
   - Database Password: (save this somewhere)
   - Region: Choose closest to you
5. Click **Create new project** (takes ~2 minutes)
6. Once ready, go to **Settings** → **API**
7. Copy:
   - **Project URL**
   - **anon/public key**
8. Update `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```
9. Then follow Steps 2-4 above

---

## 🐛 Troubleshooting

### Error: "Acquiring an exclusive Navigator LockManager lock timed out"
This is a browser lock conflict, usually from multiple tabs or stale storage.

**Quick Fix - Option 1 (Easiest):**
1. Visit: http://localhost:3001/clear-storage.html
2. Click "Clear Storage & Reload"
3. You'll be redirected to the home page

**Quick Fix - Option 2 (Manual):**
1. Close ALL tabs/windows with your app open
2. Open browser DevTools (F12) → Console tab
3. Run this command:
   ```javascript
   localStorage.clear(); sessionStorage.clear(); location.reload();
   ```
4. Or manually: Browser settings → Clear browsing data → Cookies and site data
5. Reopen your app in a single tab only

**Prevent this:**
- Don't open the app in multiple tabs simultaneously
- If you need multiple tabs, use incognito/private windows instead

### Error: "relation 'profiles' does not exist"
**Fix:** You haven't run the schema SQL. Go back to Step 2.

### Cannot connect / Network error
**Possible causes:**
- Supabase project is paused (free tier) - open it to resume
- Wrong credentials in `.env.local`
- Check you're online

**Fix:** 
1. Check Supabase Dashboard - is the project active?
2. Verify `.env.local` has correct URL and key
3. Get fresh credentials: Dashboard → Settings → API

### Data showing in browser console but not website
**Fix:** Open browser DevTools (F12) → Console tab → look for red errors
- Most common: Row Level Security blocking queries
- Schema should have proper RLS policies set up

### Email confirmation required (can't log in)
**Fix:** In Supabase Dashboard:
- Authentication → Email Auth
- Uncheck "Enable email confirmations"

### Still not working?
1. Open browser console (F12)
2. Look for errors when you add data
3. Check Supabase Dashboard → Table Editor → Click each table
4. If no data appears in the tables, the inserts are failing
5. Common reasons:
   - Schema not applied correctly
   - RLS policies too restrictive
   - Wrong user_id in inserts
