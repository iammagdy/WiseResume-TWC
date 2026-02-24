# 📱 WiseResume - Android Deployment Guide for Google Play Store

## Version: 2.3.1
**Date:** March 2026

---

## ✅ Prerequisites Completed

### Backend Changes (Already Done ✓)
- ✅ Emergent Universal LLM Key integrated as default API provider
- ✅ All AI functions now support fallback to Emergent key
- ✅ Modified `/app/supabase/functions/_shared/aiClient.ts`
- ✅ Version updated to 2.3.1 in `package.json` and `capacitor.config.ts`
- ✅ Web app built successfully (dist folder ready)

---

## 🚀 Android Setup Steps (Complete Locally)

### Step 1: Environment Requirements
You need Node.js **22.0.0 or higher** to run Capacitor CLI.

**Check your Node version:**
```bash
node --version
```

**If you need to upgrade:**
```bash
# Using nvm (recommended)
nvm install 22
nvm use 22

# Or download from: https://nodejs.org/
```

---

### Step 2: Add Android Platform
```bash
cd /app
npx cap add android
```

This creates the `/app/android` directory with the native Android project.

---

### Step 3: Sync Web Assets to Android
```bash
npx cap sync android
```

This copies your built web app (dist folder) to the Android project.

---

### Step 4: Configure Android Version & Build Settings

#### Update `android/app/build.gradle`
Add version information:

```gradle
android {
    namespace "com.wiseresume.app"
    compileSdk rootProject.ext.compileSdkVersion
    
    defaultConfig {
        applicationId "com.wiseresume.app"
        minSdk rootProject.ext.minSdkVersion
        targetSdk rootProject.ext.targetSdkVersion
        versionCode 10  // Increment for each release
        versionName "2.3.1"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
        aaptOptions {
             // Files and dirs to omit from the packaged assets dir, modified to accommodate modern web apps.
             ignoreAssetsPattern '!.svn:!.git:!.ds_store:!*.scc:.*:!CVS:!thumbs.db:!picasa.ini:!*~'
        }
    }
    
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

### Step 5: Configure App Icons & Splash Screen

#### App Icons
1. Generate icons at: https://icon.kitchen/
   - Upload your logo
   - Export for Android
   
2. Replace default icons in:
   ```
   android/app/src/main/res/
   ├── mipmap-hdpi/
   ├── mipmap-mdpi/
   ├── mipmap-xhdpi/
   ├── mipmap-xxhdpi/
   └── mipmap-xxxhdpi/
   ```

#### Splash Screen
Configure in `android/app/src/main/res/values/styles.xml`:
```xml
<style name="AppTheme.NoActionBarLaunch" parent="AppTheme.NoActionBar">
    <item name="android:background">@color/splash_background</item>
</style>
```

Add splash background color in `android/app/src/main/res/values/colors.xml`:
```xml
<color name="splash_background">#0a0a14</color>
```

---

### Step 6: Configure Permissions

Update `android/app/src/main/AndroidManifest.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Required Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />
    <uses-permission android:name="android.permission.USE_FINGERPRINT" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTask"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:theme="@style/AppTheme.NoActionBarLaunch">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

---

### Step 7: Generate Signing Key

For Google Play Store release, you need a keystore:

```bash
# Generate keystore
keytool -genkey -v -keystore wise-resume-release.keystore \
  -alias wise-resume -keyalg RSA -keysize 2048 -validity 10000

# Follow prompts to set password and details
```

**⚠️ IMPORTANT:** 
- Keep your keystore file secure
- Never commit it to git
- Store password securely (you'll need it forever!)

---

### Step 8: Configure Signing in `gradle.properties`

Create or edit `android/gradle.properties`:

```properties
WISE_RESUME_RELEASE_STORE_FILE=../wise-resume-release.keystore
WISE_RESUME_RELEASE_KEY_ALIAS=wise-resume
WISE_RESUME_RELEASE_STORE_PASSWORD=your_store_password
WISE_RESUME_RELEASE_KEY_PASSWORD=your_key_password
```

Update `android/app/build.gradle`:

```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('WISE_RESUME_RELEASE_STORE_FILE')) {
                storeFile file(WISE_RESUME_RELEASE_STORE_FILE)
                storePassword WISE_RESUME_RELEASE_STORE_PASSWORD
                keyAlias WISE_RESUME_RELEASE_KEY_ALIAS
                keyPassword WISE_RESUME_RELEASE_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

### Step 9: Build Release AAB (Android App Bundle)

```bash
cd android
./gradlew bundleRelease
```

The AAB file will be at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

**Or build APK for testing:**
```bash
./gradlew assembleRelease
```

APK location:
```
android/app/build/outputs/apk/release/app-release.apk
```

---

### Step 10: Test on Your Android Device

#### Install APK on device:
```bash
# Connect device via USB with ADB enabled
adb install android/app/build/outputs/apk/release/app-release.apk
```

#### Or run in Android Studio:
```bash
npx cap open android
```

Then click "Run" (green play button) in Android Studio.

---

### Step 11: Prepare for Google Play Store

#### Required Assets:
1. **App Icon** (512x512 PNG)
2. **Feature Graphic** (1024x500 PNG)
3. **Screenshots** (at least 2):
   - Phone: 1080x1920 to 7680x4320
   - Tablet (optional): Same as phone
4. **Privacy Policy URL**
5. **App Description**
6. **Category**: Productivity

#### App Listing Details:
- **App Name:** Wise Resume
- **Short Description:** AI-powered resume builder and interview coach
- **Full Description:** (see below)

```
WiseResume is your AI career companion that transforms job seeking into a confident, data-driven process.

✨ KEY FEATURES:
• AI Resume Tailoring - Optimize your resume for any job in seconds
• Resume Analysis - Get instant feedback with AI scoring
• Mock Interviews - Practice with voice-based AI interviewer
• Recruiter Simulation - Get feedback from 4 different recruiter personas
• ATS Optimization - Ensure your resume passes automated screening
• 12 Professional Templates - Choose from modern, classic, and creative designs
• Cover Letter Generator - Create tailored cover letters instantly
• Biometric Security - Protect your data with fingerprint/face ID

🎯 PERFECT FOR:
• Job seekers actively applying to positions
• Career changers pivoting to new industries
• Recent graduates entering the workforce
• Professionals updating resumes after years

Powered by cutting-edge AI (Gemini, GPT-5, Claude), WiseResume provides personalized feedback and tailoring that helps you stand out from the competition.
```

---

### Step 12: Upload to Google Play Console

1. Go to https://play.google.com/console
2. Create a new app or select existing
3. Navigate to **Production → Create new release**
4. Upload your AAB file: `app-release.aab`
5. Fill in release notes:

```
Version 2.3.1 - What's New:
• Enhanced AI with Emergent Universal Key support
• Improved performance and stability
• Updated templates with better mobile responsiveness
• Bug fixes and security improvements
```

6. Complete all store listing requirements:
   - App content rating questionnaire
   - Target audience
   - Privacy policy
   - Data safety section

7. Submit for review (typically takes 1-3 days)

---

## 🔧 Troubleshooting

### Build Errors

**"SDK not found"**
```bash
# Install Android SDK via Android Studio
# Or set ANDROID_HOME environment variable
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

**"Gradle sync failed"**
```bash
cd android
./gradlew clean
./gradlew build
```

**"Capacitor CLI not found"**
```bash
npm install -g @capacitor/cli
```

### Runtime Errors

**"Network requests fail"**
- Check AndroidManifest.xml has INTERNET permission
- Ensure `usesCleartextTraffic="true"` for HTTP requests

**"Biometric not working"**
- Add biometric permissions to AndroidManifest.xml
- Test on real device (emulators may not support biometrics)

---

## 🔐 Supabase Environment Setup

### Required Supabase Secrets
Before releasing, ensure these are set in Supabase Dashboard:

```bash
EMERGENT_LLM_KEY=sk-emergent-2113715Ec2b2713676
SUPABASE_URL=<your-project-url>
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
API_KEY_ENCRYPTION_SECRET=<generate-secure-random-string>
```

**To add in Supabase:**
1. Go to Project Settings → Edge Functions
2. Add each secret
3. Redeploy functions if needed

---

## 📊 Post-Launch Monitoring

### Analytics to Track:
- Daily Active Users (DAU)
- Resume creation rate
- AI feature usage
- Crash reports (via Google Play Console)
- User ratings & reviews

### Performance Metrics:
- App startup time
- AI response time
- Sync reliability
- Memory usage

---

## 🔄 Future Updates

### Update Process:
1. Make code changes
2. Increment `versionCode` in `build.gradle`
3. Update `versionName` to next version (e.g., 2.3.2)
4. Build new AAB: `./gradlew bundleRelease`
5. Upload to Google Play → Create new release
6. Submit for review

---

## 📞 Support Resources

- **Capacitor Docs:** https://capacitorjs.com/docs
- **Android Docs:** https://developer.android.com/
- **Google Play Console:** https://support.google.com/googleplay/android-developer
- **Supabase Docs:** https://supabase.com/docs

---

## ✅ Final Checklist

Before submitting to Play Store:

- [ ] Version 2.3.1 set in all config files
- [ ] App icons (all sizes) added
- [ ] Splash screen configured
- [ ] Permissions configured correctly
- [ ] Signing key generated and configured
- [ ] AAB file built successfully
- [ ] Tested on real Android device
- [ ] Privacy policy URL ready
- [ ] Store listing assets prepared
- [ ] Supabase secrets configured
- [ ] EMERGENT_LLM_KEY set as default
- [ ] All features tested (AI, camera, biometric, etc.)

---

**🎉 You're Ready to Deploy!**

Good luck with your Play Store launch!

---

*Last Updated: March 2026*
*Version: 2.3.1*
