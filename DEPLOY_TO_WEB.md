# How to Deploy FinClear AI to the Web 🌐

You can host this app for free so you can access it from any device (iPhone, Android, Laptop) via a URL.

### Option 1: Vercel (Recommended)
1. Push your code to GitHub (see `PUSH_TO_GITHUB.md`).
2. Go to [vercel.com](https://vercel.com) and sign up.
3. Click **"Add New..."** -> **Project**.
4. Select your `finclear-ai` repository.
5. **Build Settings**: Vercel usually detects Vite automatically.
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Click **Deploy**.

### Option 2: Netlify
1. Push your code to GitHub.
2. Go to [netlify.com](https://netlify.com) and sign up.
3. Click **"Add new site"** -> **Import an existing project**.
4. Connect GitHub and choose your repo.
5. **Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Click **Deploy**.

### How to "Install" from the Web
Once deployed (e.g., `https://your-app.vercel.app`):
1. Open the link on your phone.
2. **iOS (Safari)**: Tap the "Share" button -> "Add to Home Screen".
3. **Android (Chrome)**: Tap the menu (three dots) -> "Install App".

This gives you the full app experience without needing the App Store!
