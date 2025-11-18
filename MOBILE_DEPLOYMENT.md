# Mobile App Deployment Guide 📱

This project is set up with [Capacitor](https://capacitorjs.com/) to be easily deployed to the iOS App Store and Google Play Store.

### Prerequisites
- **Node.js** (which you already have)
- **Android Studio** (for Android apps)
- **Xcode** (for iOS apps - Mac Only)

---

### Step 1: Install Mobile Dependencies
If you haven't already, run:
```bash
npm install
```

### Step 2: Initialize Mobile Projects
This command creates the `android` and `ios` folders in your project.
```bash
npm run mobile:init
```

### Step 3: Build the App
Every time you change your React code, you need to build the web assets and sync them to the mobile projects:
```bash
npm run mobile:sync
```

---

### 🤖 How to Run on Android
1. Run `npm run mobile:sync`
2. Open **Android Studio**.
3. Open the `android/` folder inside this project.
4. Wait for Gradle to sync.
5. Press the **Run (Play)** button to run it on an emulator or connected device.
6. To publish: Go to **Build > Generate Signed Bundle / APK**.

### 🍎 How to Run on iOS (Mac Only)
1. Run `npm run mobile:sync`
2. Run:
   ```bash
   npx cap open ios
   ```
3. This opens **Xcode**.
4. Select your target device (top bar).
5. Press the **Play** button.
6. To publish: Go to **Product > Archive** and follow the instructions to upload to App Store Connect.

### 🛠 Important Notes
- **Permissions**: If you add features like Camera, you must add permissions in `AndroidManifest.xml` (Android) and `Info.plist` (iOS).
- **Icons**: Replace the default Capacitor icons in `android/app/src/main/res` and `ios/App/App/Assets.xcassets` with your own logos.
