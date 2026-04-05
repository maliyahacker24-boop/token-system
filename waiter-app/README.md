# Chaap Wala Waiter App

Expo based Android app for waiter staff. Waiter login karta hai, dine-in token select karta hai, extra items add karta hai, aur order Supabase `orders` table me update ho jata hai. Existing web dashboard, kitchen screen, waiter web screen, aur display screen ko wahi updated order milta hai.

## Kya kya chahiye

1. Node.js 20 ya uske upar
2. Android phone me Expo Go app, ya Android Studio emulator
3. Same Supabase project jisme `orders` table bana hua ho
4. `waiter-app/.env` file with these keys:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_WAITER_PASSWORD=waiter123
```

## Setup

1. `waiter-app` folder me jao.
2. `.env.example` ko `.env` me copy karo.
3. `npm install` chalao.
4. `npm run start` chalao.
5. Expo Go se QR scan karo ya terminal me `a` dabakar Android emulator kholo.

## App me kya hai

1. Waiter login screen with password
2. Live active dine-in token list
3. Selected token detail
4. Quick add from existing items
5. Manual item add with name, price, qty
6. Add-on cart aur one tap update
7. Supabase realtime plus polling fallback

## Important note

Abhi login simple waiter password based hai. Production me alag waiter accounts chahiye hon to next step me Supabase Auth ya dedicated waiter table add karni hogi.

## APK banana ho to

1. `npm install -g eas-cli`
2. `eas login`
3. `eas build -p android --profile preview`

`preview` profile APK banata hai jo direct install ho sakta hai.