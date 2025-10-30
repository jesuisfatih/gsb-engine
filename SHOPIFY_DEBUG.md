# Shopify App Bridge Debug Console Commutları

Tarayıcı console'una (F12) aşağıdaki komutları sırayla çalıştır:

## 1. App Bridge Yüklenmiş mi?

```javascript
console.log('=== APP BRIDGE CHECK ===');
console.log('window.shopify:', window.shopify);
console.log('typeof window.shopify:', typeof window.shopify);
console.log('App Bridge exists:', !!window.shopify);
```

## 2. App Bridge Script Tag Kontrolü

```javascript
console.log('=== SCRIPT TAG CHECK ===');
const appBridgeScript = document.querySelector('script[src*="app-bridge"]');
console.log('App Bridge script tag:', appBridgeScript);
console.log('Script src:', appBridgeScript?.src);
console.log('Script data-api-key:', appBridgeScript?.getAttribute('data-api-key'));
console.log('Script is first script?', document.querySelectorAll('script')[0] === appBridgeScript);
console.log('All script tags:', Array.from(document.querySelectorAll('script')).map((s, i) => ({
  index: i,
  src: s.src || 'inline',
  type: s.type || 'no-type',
  hasAsync: s.hasAttribute('async'),
  hasDefer: s.hasAttribute('defer'),
})));
```

## 3. Session Token Almaya Çalış

```javascript
console.log('=== SESSION TOKEN CHECK ===');
if (window.shopify) {
  console.log('✅ App Bridge loaded');
  console.log('Available methods:', Object.keys(window.shopify || {}));
  
  if (window.shopify.sessionToken) {
    console.log('✅ sessionToken object exists');
    console.log('sessionToken methods:', Object.keys(window.shopify.sessionToken || {}));
    
    // Token almaya çalış
    window.shopify.sessionToken.get().then(token => {
      console.log('✅ Token received:', token ? token.substring(0, 20) + '...' : 'null');
      console.log('Token length:', token?.length);
    }).catch(err => {
      console.error('❌ Token error:', err);
    });
  } else {
    console.error('❌ sessionToken object NOT found');
    console.log('Available properties:', Object.keys(window.shopify || {}));
  }
} else {
  console.error('❌ App Bridge NOT loaded');
  console.log('window keys:', Object.keys(window).filter(k => k.toLowerCase().includes('shopify')));
}
```

## 4. Network Request Kontrolü

```javascript
console.log('=== NETWORK CHECK ===');
console.log('Check Network tab for:');
console.log('1. GET https://cdn.shopify.com/shopifycloud/app-bridge.js - Status?');
console.log('2. POST /api/auth/shopify/session - Status? Response?');
```

Console'da Network tab'ını aç ve şu filtreleri kontrol et:
- `app-bridge.js` - Status 200 olmalı
- `/api/auth/shopify/session` - POST request var mı? Status nedir?

## 5. Tüm Hataları Listele

```javascript
console.log('=== ERROR CHECK ===');
const errors = [];
const originalError = console.error;
console.error = function(...args) {
  errors.push(args);
  originalError.apply(console, args);
};

// Sayfa yüklendikten sonra 5 saniye bekle
setTimeout(() => {
  console.log('Captured errors:', errors);
  console.error = originalError;
}, 5000);
```

## 6. Otomatik Debug (Hepsini Tek Seferde)

```javascript
// Tüm kontrolleri tek seferde yap
(async function debugShopify() {
  console.log('🔍 === SHOPIFY APP BRIDGE DEBUG ===\n');
  
  // 1. App Bridge check
  console.log('1️⃣ App Bridge Status:');
  if (window.shopify) {
    console.log('   ✅ window.shopify exists');
    console.log('   📦 Properties:', Object.keys(window.shopify));
  } else {
    console.log('   ❌ window.shopify is undefined');
    console.log('   ⚠️ App Bridge did not load!');
  }
  
  // 2. Script tag check
  console.log('\n2️⃣ Script Tag Check:');
  const scripts = Array.from(document.querySelectorAll('script'));
  const appBridgeScript = scripts.find(s => s.src?.includes('app-bridge'));
  if (appBridgeScript) {
    console.log('   ✅ App Bridge script found');
    console.log('   📍 Position:', scripts.indexOf(appBridgeScript), 'of', scripts.length);
    console.log('   🔑 API Key:', appBridgeScript.getAttribute('data-api-key'));
    console.log('   ⚠️ Is first script?', scripts.indexOf(appBridgeScript) === 0);
  } else {
    console.log('   ❌ App Bridge script NOT found in DOM!');
  }
  
  // 3. Session token check
  console.log('\n3️⃣ Session Token Check:');
  if (window.shopify?.sessionToken) {
    console.log('   ✅ sessionToken object exists');
    try {
      const token = await window.shopify.sessionToken.get();
      if (token) {
        console.log('   ✅ Token received!');
        console.log('   📏 Token length:', token.length);
        console.log('   🔤 Token preview:', token.substring(0, 30) + '...');
      } else {
        console.log('   ⚠️ Token is null/undefined');
      }
    } catch (err) {
      console.error('   ❌ Token error:', err.message);
    }
  } else {
    console.log('   ❌ sessionToken object NOT found');
  }
  
  // 4. Check for console errors
  console.log('\n4️⃣ Error Check:');
  console.log('   📋 Check console for red errors above');
  console.log('   🔍 Look for "App Bridge must be included" error');
  
  // 5. Network check reminder
  console.log('\n5️⃣ Network Check:');
  console.log('   📡 Open Network tab and check:');
  console.log('   - app-bridge.js request (should be 200)');
  console.log('   - /api/auth/shopify/session POST (should exist)');
  
  console.log('\n✅ Debug complete!');
})();
```

Bu son kodu (6. Otomatik Debug) console'a yapıştır ve Enter'a bas. Tüm bilgileri tek seferde göreceksin.

