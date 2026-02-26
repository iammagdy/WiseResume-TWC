# 📱 WiseResume — Mobile App (Flutter) Design Inspiration Sources

> A curated list of mobile apps (Android/iOS) and Flutter-specific resources to study for UI/UX inspiration when designing WiseResume's native Flutter app screens.

---

## 📋 Resume & Career Apps (Google Play / App Store)

### 1. Canva
- **Platform**: iOS + Android
- **Study**: Template gallery with category tabs and smooth scroll
- **Study**: Mobile editor with gesture controls (pinch, drag, rotate)
- **Study**: Export flow with format selection bottom sheet
- **Flutter Pattern**: `GridView.builder` for template gallery, gesture detector for editor

### 2. Indeed
- **Platform**: iOS + Android
- **Study**: Job search results list with filter chips at top
- **Study**: Application tracking with status timeline
- **Study**: Push notification patterns for job alerts
- **Flutter Pattern**: `FilterChip` row + `ListView` for search, local notifications

### 3. LinkedIn
- **Platform**: iOS + Android
- **Study**: Profile editor with section-based editing (tap to edit)
- **Study**: Activity feed with rich media cards
- **Study**: Bottom navigation with notification badges
- **Flutter Pattern**: `NavigationBar` with badge overlay, `SliverList` for feed

### 4. Glassdoor
- **Platform**: iOS + Android
- **Study**: Company detail page with salary range cards
- **Study**: Review UI with star ratings and sentiment indicators
- **Study**: Tab-based content organization within a single page
- **Flutter Pattern**: `TabBar` + `TabBarView`, custom rating widgets

### 5. Resume Builder by Nobody
- **Platform**: Android
- **Study**: Simple mobile resume form editor (one section at a time)
- **Study**: Template preview carousel
- **Study**: PDF generation and share flow on mobile
- **Flutter Pattern**: `PageView` for template carousel, `share_plus` for sharing

### 6. CV Engineer
- **Platform**: iOS + Android
- **Study**: Mobile resume builder with section stepper
- **Study**: Template preview with zoom capability
- **Study**: Clean form layout optimized for mobile keyboards
- **Flutter Pattern**: `Stepper` widget, `InteractiveViewer` for preview

### 7. Resume Star
- **Platform**: iOS
- **Study**: Native iOS-feel resume builder
- **Study**: Clean section navigation with progress indicators
- **Study**: AirDrop / share sheet integration for export
- **Flutter Pattern**: Cupertino-style list tiles, platform-aware sharing

### 8. Jobscan Mobile
- **Platform**: iOS + Android
- **Study**: ATS score cards with circular progress indicators
- **Study**: Keyword match visualization on mobile
- **Study**: Compact dashboard with swipeable stat cards
- **Flutter Pattern**: `CircularProgressIndicator` custom painted, `PageView` for cards

### 9. Huntr Mobile
- **Platform**: iOS + Android
- **Study**: Job tracking Kanban with horizontal scroll columns
- **Study**: Quick-add FAB for new applications
- **Study**: Swipe actions on list items (archive, delete)
- **Flutter Pattern**: `Dismissible` for swipe, `FloatingActionButton` for quick add

### 10. Otta
- **Platform**: iOS + Android
- **Study**: Modern job matching with card-based swipe UI (Tinder-style)
- **Study**: Company culture cards with visual tags
- **Study**: Onboarding with preference selection
- **Flutter Pattern**: `flutter_card_swiper` or custom `GestureDetector` stack

---

## 🎨 Flutter-Specific Design Inspiration

### 11. Google Pay
- **Platform**: iOS + Android (built with Flutter)
- **Study**: Material 3 implementation — NavigationBar, cards, typography
- **Study**: Bottom navigation with smooth page transitions
- **Study**: Payment card UI with gradient backgrounds
- **Flutter Pattern**: `NavigationBar` (M3), `Hero` animations, gradient `Container`

### 12. Reflectly
- **Platform**: iOS + Android (built with Flutter)
- **Study**: Beautiful onboarding flow with animated illustrations
- **Study**: CustomPainter usage for gradient backgrounds and shapes
- **Study**: Mood selection with animated transitions
- **Flutter Pattern**: `CustomPainter`, `AnimatedContainer`, `PageView` onboarding

### 13. Hamilton Musical App
- **Platform**: iOS + Android (built with Flutter)
- **Study**: Dark theme with glass effects and blur overlays
- **Study**: Rich media cards with backdrop blur
- **Study**: Custom scroll effects and parallax
- **Flutter Pattern**: `BackdropFilter`, `ClipRRect`, `SliverAppBar` with parallax

### 14. Nubank
- **Platform**: iOS + Android (built with Flutter)
- **Study**: Dark theme banking app with vibrant purple accent
- **Study**: Card-based dashboard with financial charts
- **Study**: Smooth bottom sheet interactions
- **Flutter Pattern**: `fl_chart` for charts, `showModalBottomSheet` with custom shapes

### 15. Stadia (archived)
- **Platform**: iOS + Android (was built with Flutter)
- **Study**: Dark gaming UI with smooth page transitions
- **Study**: Grid layout for game library
- **Study**: Floating action patterns and quick access menus
- **Flutter Pattern**: `GridView` with `Hero` transitions, custom FAB menus

---

## 📚 UI Pattern Libraries & Resources

### 16. Material 3 Gallery (Flutter Demo App)
- **Platform**: Flutter demo app
- **Study**: Official Material 3 component implementations
- **Study**: Color scheme generation from seed colors
- **Study**: Typography scale and spacing system
- **How to access**: `flutter create --sample=material.Material3Demo`

### 17. Flutter Gallery
- **Platform**: Flutter demo app
- **Study**: Widget catalog with interactive examples
- **Study**: Adaptive layout patterns (phone vs tablet)
- **Study**: Animation cookbook implementations
- **How to access**: [gallery.flutter.dev](https://gallery.flutter.dev)

### 18. Dribbble (Mobile Search)
- **URL**: [dribbble.com](https://dribbble.com)
- **Search terms**:
  - "resume app mobile dark theme"
  - "career app UI kit"
  - "job tracker mobile design"
  - "portfolio app Flutter"
  - "AI tool mobile dark"
  - "onboarding mobile glassmorphism"

### 19. Mobbin
- **URL**: [mobbin.com](https://mobbin.com)
- **Study**: Real app screenshots filtered by pattern type
- **Filter by**: "Onboarding", "Dashboard", "Profile Editor", "Settings", "Empty States"
- **Filter by platform**: iOS or Android
- **Search**: "resume", "career", "editor", "dark theme"

### 20. Flutter Awesome
- **URL**: [flutterawesome.com](https://flutterawesome.com)
- **Study**: Open source Flutter apps and packages
- **Search**: "resume", "portfolio", "dashboard", "glassmorphism"
- **Useful packages**: `glassmorphism`, `animated_text_kit`, `shimmer`

---

## 🔗 Additional Mobile-Specific Resources

### Native Pattern References
- **Apple HIG** (developer.apple.com/design) — iOS navigation, sheets, haptics
- **Material Design 3** (m3.material.io) — Android components, color system, motion
- **Platform-Adaptive Patterns** — When to use Cupertino vs Material widgets

### Animation & Motion
- **Rive** (rive.app) — Complex animations for splash screen, onboarding illustrations
- **Lottie** (lottiefiles.com) — Search "resume", "document", "rocket", "stars" for micro-animations
- **Flutter Animate** package — Declarative animation chains

### Icon & Asset Resources
- **Material Symbols** (fonts.google.com/icons) — Official Material 3 icons
- **Phosphor Icons** (phosphoricons.com) — Beautiful icon set with Flutter package
- **Lucide Icons** — Same icons used in web version (for consistency)

### Color & Theme
- **Material Theme Builder** (m3.material.io/theme-builder) — Generate M3 color scheme from WiseResume brand colors
- **Dynamic Color** — `dynamic_color` package for Android 12+ wallpaper-based theming

---

## 📝 How to Use This File

1. **For each screen in `STITCH_PROMPTS_FLUTTER.md`**, find 2-3 apps above with similar screens
2. **Install the apps** on your device and screenshot the relevant screens
3. **Note the native patterns** — bottom sheets, system bars, safe areas, gesture navigation
4. **Feed screenshots to Google Stitch** alongside your prompt from `STITCH_PROMPTS_FLUTTER.md`
5. **Prioritize Flutter-built apps** (marked above) since their patterns translate directly
6. **Test on both iOS and Android** — some patterns differ (back gesture, status bar, keyboard behavior)

### WiseResume Brand Alignment
When taking inspiration, always map back to WiseResume's design system:
- **Primary**: Deep indigo/violet (`#6366F1`)
- **Background**: Near-black (`#0B0D17`)
- **Surface**: Dark with glass effect (`rgba(255,255,255,0.05)`)
- **Accent**: Cyan/teal for highlights (`#22D3EE`)
- **Font**: Space Grotesk (display) + Inter (body)

---

*Last updated: February 2026*
*Source of truth for Flutter design: `docs/APP_BLUEPRINT_FLUTTER.md`*
