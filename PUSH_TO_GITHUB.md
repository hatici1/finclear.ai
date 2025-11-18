# How to Push to GitHub

Since I cannot access your private account, follow these steps to push this code to your GitHub.

### Step 1: Create a Repo on GitHub
1. Log in to [GitHub.com](https://github.com).
2. Click the **+** icon (top right) -> **New repository**.
3. Name it `finclear-ai`.
4. **Important**: Do NOT check "Add README", "Add .gitignore". Keep it empty.
5. Click **Create repository**.
6. Copy the URL (e.g., `https://github.com/YOUR_USER/finclear-ai.git`).

### Step 2: Run these commands
Open your terminal (Command Prompt on Windows, Terminal on Mac) inside this project folder and run:

```bash
# 1. Initialize Git
git init

# 2. Add files
git add .

# 3. Save changes
git commit -m "Initial commit"

# 4. Connect to GitHub (REPLACE URL WITH YOURS)
git remote add origin https://github.com/YOUR_USERNAME/finclear-ai.git

# 5. Upload
git branch -M main
git push -u origin main
```

### Done!
Refresh your GitHub page, and your code will be there.
