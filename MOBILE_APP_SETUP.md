# Protees Mobile App Setup Guide

## Architecture Overview

```
protees-workspace/
├── protees-business-manager/     # Web app (existing)
│   ├── src/
│   │   ├── lib/                  # Shared code (types, utils, auth)
│   │   └── components/           # Web components
│   └── package.json
│
└── protees-mobile/               # Mobile app (new - React Native)
    ├── app/
    │   ├── (auth)/
    │   │   └── login.tsx
    │   ├── (app)/
    │   │   ├── home.tsx
    │   │   ├── collections.tsx
    │   │   ├── salary.tsx
    │   │   └── advances.tsx
    │   └── _layout.tsx
    ├── lib/                      # Shared code link
    ├── components/               # Mobile components
    └── package.json
```

## Shared Code Strategy

### What We'll Share:
1. **Types** (`src/lib/types.ts`) ✅
2. **Database utilities** (`src/lib/database.ts`)
3. **Supabase client** (`src/lib/supabase.ts`)
4. **Biometric auth** (`src/lib/biometric.ts`)
5. **Format utilities** (`src/lib/utils.ts`)

### What We'll Keep Separate:
1. UI Components (web vs mobile)
2. Navigation (React Router vs Expo Router)
3. Styling (Tailwind vs React Native StyleSheet)

## Setup Steps

### 1. Install Expo CLI
```bash
npm install -g expo-cli
cd protees-mobile
npm install
```

### 2. Install Mobile Dependencies
```bash
npm install @react-navigation/native @react-navigation/bottom-tabs
npm install expo-local-authentication  # Biometric
npm install @supabase/supabase-js     # Database
npm install react-native-gesture-handler
```

### 3. Link Shared Code
Symlink or copy:
- `src/lib/types.ts`
- `src/lib/supabase.ts`
- `src/lib/biometric.ts`
- `src/context/AuthContext.tsx`

### 4. Create Mobile-Specific Components
- Login screen with biometric button
- Collections dashboard
- Salary tracking
- Advances management

### 5. Configure Supabase
Mobile uses same Supabase instance as web. Just update:
- `.env.mobile` with SUPABASE_URL and SUPABASE_KEY

## Running the App

```bash
# iOS Simulator
npx expo run:ios

# iPhone (with Expo Go app)
npx expo start
# Scan QR code with iPhone camera or Expo Go app

# Build for App Store
eas build --platform ios
```

## Testing

```bash
# On your Mac with iPhone connected
npm run ios

# Or use Expo Go on iPhone (fastest for development)
```

## What's Different on Mobile

1. **Layout**: Stack-based navigation instead of React Router
2. **Touch-friendly**: Larger buttons, swipe gestures
3. **Biometric**: Uses native Face ID (no WebAuthn needed)
4. **Notifications**: Push notifications support
5. **Offline**: LocalStorage for caching

## Timeline

- ✅ Expo setup: 5 min
- ✅ Shared code linking: 10 min
- 🔄 Login screen: 20 min
- 🔄 Collections screen: 30 min
- 🔄 Salary tracking: 30 min
- 🔄 Advances management: 30 min
- 🔄 Testing & refinement: 1 hour

**Total: ~3 hours for MVP**

## Next Steps

1. Create `protees-mobile` app
2. Symlink shared code
3. Build login screen with Face ID
4. Add navigation between screens
5. Connect to Supabase
6. Test on iPhone
7. Build for App Store
