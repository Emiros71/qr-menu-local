# QR Menu SaaS Platform 🍽️🚀

A comprehensive, multi-tenant QR Menu Software as a Service (SaaS) platform built with modern web technologies. This project enables restaurant, cafe, and hotel owners to easily create, manage, and track digital menus while providing an excellent user experience for their customers.

## 🌟 Key Features

### 🏪 Multi-Venue Management
- Super Admin and Venue Manager roles.
- Manage multiple venues under a single account.
- Unique URLs and slugs for every venue menu.

### 🎨 Advanced Theming & Customization
- **Theme Presets:** Choose from Modern, Classic, Midnight, and Organic designs.
- **Full Color Control:** Customize Primary, Background, Foreground, Header, and Label colors.
- **Card Styles:** Multiple product card layout options (Modern, Bordered).

### 🏷️ Product & Category Management
- **Smart Categories:** Manual drag-and-drop ordering and Active/Inactive toggles.
- **Time-Based Visibility:** Set specific service hours (e.g., Breakfast 06:00-12:00) for both categories and individual products.
- **Excel Sync:** Bulk import/export products via Excel, seamlessly syncing Turkish and English titles, descriptions, and categories.

### 💡 Marketing & Campaigns
- **Interactive Pop-ups:** Create targeted promotional pop-ups for customers entering the menu.
- **Dynamic Discounts:** Set percentage (%) or fixed-amount (₺) discounts on products.
- **Campaign Sorting:** Native campaign products automatically rise to the top of the menu in a dedicated "🔥 Campaigns" section.

### 📊 Powerful Analytics
- **Live Event Tracking:** Track menu sessions, popup views, and individual product clicks.
- **Dashboard Charts:** Area and Bar charts displaying daily/monthly visitors and top clicked items.
- **Smart Suggestions:** Automated marketing recommendations based on real-world customer behavior data.

### 🌍 Multi-Language & Accessibility
- Turkish and English localization (i18n) built-in out of the box. The menu detects the browser's language.
- Allergen tracking and chef recommendations markings.

## 🛠️ Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router format)
- **UI Library:** React 19, Tailwind CSS, Shadcn UI
- **Database / Backend:** [Supabase](https://supabase.com) (PostgreSQL, Realtime, Storage)
- **Icons & Visualization:** Lucide React, Recharts
- **Language:** TypeScript

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm, yarn, or bun
- Supabase Project & API Keys

### Installation

1. Clone the repository and navigate to the directory:
   ```bash
   git clone <repository_url>
   cd qr-menu-saas
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env.local` file and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run Database Migrations:
   Ensure your local or remote Supabase instance is updated with the SQL schema found in `supabase/migrations`.

5. Start the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📝 Deployment
This project is optimized for deployment on [Vercel](https://vercel.com). Simply link your GitHub repository to Vercel and ensure your environment variables are correctly configured in the Vercel dashboard.
