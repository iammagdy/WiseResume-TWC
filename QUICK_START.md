# 🚀 Quick Reference - Deploy to Play Store

## 📝 TL;DR - Complete in 5 Steps

### Step 1: Upgrade Node.js (5 min)
```bash
# Install Node 22+ (required for Capacitor)
nvm install 22 && nvm use 22
# or download from https://nodejs.org/
```

### Step 2: Setup Android (5 min)
```bash
cd /app
./setup-android.sh
```

### Step 3: Generate Signing Key (5 min)
```bash
keytool -genkey -v -keystore wise-resume-release.keystore \
  -alias wise-resume -keyalg RSA -keysize 2048 -validity 10000
```
**⚠️ Save password securely!**

### Step 4: Build Release AAB (10 min)
```bash
cd android
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### Step 5: Upload to Play Store (30 min)
1. Go to https://play.google.com/console
2. Create new app
3. Upload AAB file
4. Complete store listing
5. Submit for review ✅

---

## 🔑 Essential Info

### App Details
```
Name: Wise Resume
Package: com.wiseresume.app
Version: 2.3.1
Category: Productivity
```

### Key Files
```
📄 /app/ANDROID_DEPLOYMENT_GUIDE.md    ← Complete guide
📄 /app/EMERGENT_LLM_SETUP.md          ← Backend config
📄 /app/MOBILE_DEPLOYMENT_REPORT.md    ← Full analysis
🔧 /app/setup-android.sh                ← Auto setup script
```

### Supabase Secret (Add in Dashboard)
```bash
EMERGENT_LLM_KEY=sk-emergent-2113715Ec2b2713676
```
**Where:** Supabase Dashboard → Settings → Edge Functions → Add Secret

---

## ✅ Checklist

**Before Building:**
- [ ] Node.js 22+ installed
- [ ] Android platform added (`./setup-android.sh`)
- [ ] Signing key generated
- [ ] Supabase secrets configured

**For Play Store:**
- [ ] AAB file built
- [ ] App icon (512x512)
- [ ] Screenshots (2+ images)
- [ ] Feature graphic (1024x500)
- [ ] Privacy policy URL
- [ ] App description written

---

## 🆘 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| "Capacitor CLI requires Node ≥22" | Upgrade Node: `nvm install 22` |
| "Android SDK not found" | Install Android Studio |
| "Gradle sync failed" | Run `cd android && ./gradlew clean` |
| "App won't install" | Enable USB debugging on device |

---

## 📞 Need Help?

1. **Full Guide:** `/app/ANDROID_DEPLOYMENT_GUIDE.md`
2. **Backend Setup:** `/app/EMERGENT_LLM_SETUP.md`
3. **Complete Report:** `/app/MOBILE_DEPLOYMENT_REPORT.md`

---

## 🎯 Time Estimate

| Task | Duration |
|------|----------|
| Node.js upgrade | 5 min |
| Android setup | 5 min |
| Signing key | 5 min |
| Build AAB | 10 min |
| Test on device | 15 min |
| Play Store listing | 30 min |
| **Total Active Work** | **1-2 hours** |
| Google Review | 1-3 days |

---

## 💯 What's Already Done

✅ Emergent Universal LLM Key integrated  
✅ Version 2.3.1 configured  
✅ Web app built successfully  
✅ Capacitor configured for Android  
✅ Complete documentation created  
✅ Setup script ready to run  

---

**You're ready to launch! 🚀**
