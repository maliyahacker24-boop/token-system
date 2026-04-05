# Chaap Wala Waiter App

Expo-based Android app for waiter staff. A waiter logs in, selects a dine-in token, adds extra items, and updates the same order in the Supabase `orders` table. The updated order is then reflected on the web dashboard, kitchen screen, waiter web screen, and display screen.

## Requirements

1. Node.js 20 or later
2. An Android phone with Expo Go, or an Android Studio emulator
3. The same Supabase project where the `orders` table is available
4. `waiter-app/.env` file with these keys:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_WAITER_PASSWORD=waiter123
```

## Setup

1. Go to the `waiter-app` folder.
2. Copy `.env.example` to `.env`.
3. Run `npm install`.
4. Run `npm run start`.
5. Scan the QR code with Expo Go, or press `a` in the terminal to open the Android emulator.

## Features

1. Waiter login screen with password
2. Startup-safe login shell, then manual live order connect
3. Selected token detail
4. Quick add from existing items
5. Manual item add with name, price, qty
6. Add-on cart and one-tap update
7. Supabase polling-based sync after connect

## Important note

The current login system uses a shared waiter password. If separate waiter accounts are needed in production, the next step should be Supabase Auth or a dedicated waiter table.

## Building an APK

1. `npm install -g eas-cli`
2. `eas login`
3. `eas build -p android --profile preview`

The `preview` profile generates an APK that can be installed directly.