This is a [Next.js](https://nextjs.org) project for business management (employees, invoices, inventory, transactions) with Supabase backend.

## ⚠️ IMPORTANT: Backend Setup Required

**Your data won't persist until you set up Supabase!**

👉 **Follow the setup guide: [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)**

The main step is running the SQL schema in your Supabase dashboard (takes 2 minutes).

## Getting Started

First, install dependencies:

```bash
npm install
```

Then run the development server:

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser.

## Project Structure

- `app/` - Next.js pages and routes
  - `dashboard/` - Overview with charts
  - `attendance/` - Employee attendance
  - `invoices/` - Invoice management
  - `expenses/` - Transaction tracking
  - `inventory/` - Stock management
  - `settings/` - User preferences
- `components/` - Reusable UI components
- `lib/` - Core logic
  - `appStore.tsx` - State management & Supabase integration
  - `supabase.ts` - Supabase client
- `supabase/schema.sql` - Database schema

## Features

✅ User authentication  
✅ Employee management & attendance tracking  
✅ Invoice generation with PDF export  
✅ Income/Expense transactions  
✅ Inventory management  
✅ Dashboard with charts  
✅ Dark/Light theme  
✅ Excel export

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Icons:** Lucide React

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
