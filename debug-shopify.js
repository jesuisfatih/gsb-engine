// 🔍 SHOPIFY APP BRIDGE DEBUG - Console'a yapıştır ve Enter'a bas

(async function debugShopify() {
  console.log('%c🔍 SHOPIFY APP BRIDGE DEBUG', 'font-size: 16px; font-weight: bold; color: #7367F0;');
  console.log('================================\n');
  
  // 1. App Bridge check
  console.log('1️⃣ App Bridge Status:');
  if (window.shopify) {
    console.log('   ✅ window.shopify exists');
    console.log('   📦 Available:', Object.keys(window.shopify));
  } else {
    console.log('   ❌ window.shopify is undefined');
    console.log('   ⚠️ App Bridge did not load!');
  }
  
  // 2. Script tag check
  console.log('\n2️⃣ Script Tag Check:');
  const scripts = Array.from(document.querySelectorAll('script'));
  const appBridgeScript = scripts.find(function(s) { 
    return s.src && s.src.includes('app-bridge'); 
  });
  
  if (appBridgeScript) {
    const scriptIndex = scripts.indexOf(appBridgeScript);
    console.log('   ✅ App Bridge script found');
    console.log('   📍 Position:', scriptIndex + 1, 'of', scripts.length);
    console.log('   🔑 API Key:', appBridgeScript.getAttribute('data-api-key'));
    console.log('   ⚠️ Is first script?', scriptIndex === 0 ? '✅ YES' : '❌ NO (should be first!)');
    
    // List all scripts
    console.log('   📋 All scripts:');
    scripts.forEach(function(s, i) {
      const marker = i === scriptIndex ? '👉 ' : '   ';
      const src = s.src || 'inline';
      const type = s.type || 'no-type';
      const async = s.hasAttribute('async') ? 'async' : '';
      const defer = s.hasAttribute('defer') ? 'defer' : '';
      console.log(marker + (i + 1) + '. ' + src + ' (type: ' + type + (async ? ', ' + async : '') + (defer ? ', ' + defer : '') + ')');
    });
  } else {
    console.log('   ❌ App Bridge script NOT found in DOM!');
    console.log('   📋 All scripts:');
    scripts.forEach(function(s, i) {
      console.log('   ' + (i + 1) + '. ' + (s.src || 'inline'));
    });
  }
  
  // 3. Session token check
  console.log('\n3️⃣ Session Token Check:');
  if (window.shopify && window.shopify.sessionToken) {
    console.log('   ✅ sessionToken object exists');
    try {
      const token = await window.shopify.sessionToken.get();
      if (token) {
        console.log('   ✅ Token received!');
        console.log('   📏 Length:', token.length);
        const preview = token.substring(0, 30) + '...' + token.substring(token.length - 10);
        console.log('   🔤 Preview:', preview);
      } else {
        console.log('   ⚠️ Token is null/undefined');
      }
    } catch (err) {
      console.error('   ❌ Token error:', err.message);
      console.error('   Stack:', err.stack);
    }
  } else {
    console.log('   ❌ sessionToken object NOT found');
    if (window.shopify) {
      console.log('   Available in window.shopify:', Object.keys(window.shopify));
    }
  }
  
  // 4. Check localStorage/sessionStorage
  console.log('\n4️⃣ Storage Check:');
  const shopifyKeys = Object.keys(localStorage).filter(function(k) {
    return k.toLowerCase().includes('shopify');
  });
  console.log('   localStorage keys with "shopify":', shopifyKeys);
  
  // 5. Check for errors reminder
  console.log('\n5️⃣ Error Check:');
  console.log('   📋 Check console above for red errors');
  console.log('   🔍 Look for: "App Bridge must be included as first script"');
  
  console.log('\n✅ Debug complete! Copy output and share.');
})();

