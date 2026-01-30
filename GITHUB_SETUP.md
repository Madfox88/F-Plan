# GitHub Setup Guide for F-Plan

## 1. Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `f-plan` (or your preferred name)
3. Description: "Professional planning app for structured work execution"
4. Privacy: Public or Private (your choice)
5. **Do NOT initialize with README, .gitignore, or license** (we already have these)
6. Click "Create repository"

## 2. Add Remote and Push

From the `/Users/mustafaahmadalidib/Desktop/F-Plan/app` directory:

```bash
# Add the remote repository
git remote add origin https://github.com/YOUR_USERNAME/f-plan.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

## 3. Environment Variables on GitHub

**Never commit `.env.local` to GitHub.**

The `.gitignore` file already includes environment files, but to be safe:

1. Check `.gitignore` includes:
   ```
   .env.local
   .env.*.local
   ```

2. Add secrets to GitHub (optional, for CI/CD):
   - Go to repository Settings → Secrets and variables → Actions
   - Add:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

## 4. Clone on Another Machine

To access the app from anywhere:

```bash
git clone https://github.com/YOUR_USERNAME/f-plan.git
cd f-plan/app
npm install
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
npm run dev
```

## 5. Access Anywhere

With GitHub hosting:
- ✅ Clone on any machine
- ✅ Work from any computer
- ✅ Share code easily
- ✅ Version control & history
- ✅ Backup your work

**Note:** This is a **local development app**. To deploy to the web, see deployment guides for Vercel, Netlify, or your preferred host later.

---

**Next:** Complete step 1 in SETUP_COMPLETE.md (Supabase setup), then push to GitHub.
