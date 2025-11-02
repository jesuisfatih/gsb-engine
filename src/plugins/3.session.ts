import type { App } from 'vue'
import { store } from './2.pinia'
import { useSessionStore } from '@/modules/auth/stores/sessionStore'

export default function (_app: App) {
  console.log('[SessionPlugin] Starting...')
  
  // Skip initialization for Shopify embedded routes - they handle session via Shopify App Bridge
  if (typeof window !== 'undefined') {
    const path = window.location.pathname
    const search = window.location.search
    console.log('[SessionPlugin] Current path:', path)
    console.log('[SessionPlugin] Query params:', search)
    
    // CRITICAL FIX: Detect customer storefront access (preview_theme_id in URL)
    const urlParams = new URLSearchParams(search);
    const hasPreviewTheme = urlParams.has('preview_theme_id') || urlParams.has('key');
    
    if (hasPreviewTheme) {
      console.log('[SessionPlugin] ⏭️ Customer storefront detected - skipping session init')
      try {
        useSessionStore(store) // Register but don't initialize
        console.log('[SessionPlugin] ✅ Store registered for customer context')
      } catch (err) {
        console.error('[SessionPlugin] ❌ Failed to register store:', err)
      }
      return
    }
    
    if (path.includes('/shopify/embedded')) {
      console.log('[SessionPlugin] ⏭️ Skipping for Shopify embedded (but registering store)')
      // Register store but don't initialize
      try {
        useSessionStore(store) // Register edilir ama initialize edilmez
        console.log('[SessionPlugin] ✅ Store registered for Shopify embedded')
      } catch (err) {
        console.error('[SessionPlugin] ❌ Failed to register store:', err)
      }
      return
    }
    
    if (path.includes('/editor')) {
      console.log('[SessionPlugin] ⏭️ Skipping for Editor (but registering store)')
      // Register store but don't initialize
      try {
        useSessionStore(store) // Register edilir ama initialize edilmez
        console.log('[SessionPlugin] ✅ Store registered for Editor')
      } catch (err) {
        console.error('[SessionPlugin] ❌ Failed to register store:', err)
      }
      return
    }
  }
  
  console.log('[SessionPlugin] 🚀 Initializing session...')
  try {
    const session = useSessionStore(store)
    session.initialize()
    console.log('[SessionPlugin] ✅ Session initialized')
  } catch (err) {
    console.error('[SessionPlugin] ❌ Failed to initialize session:', err)
  }
}
