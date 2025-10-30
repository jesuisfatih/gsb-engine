import type { App } from 'vue'
import { store } from './2.pinia'
import { useSessionStore } from '@/modules/auth/stores/sessionStore'

export default function (_app: App) {
  // Skip initialization for Shopify embedded routes - they handle session via Shopify App Bridge
  if (typeof window !== 'undefined') {
    const path = window.location.pathname
    if (path.includes('/shopify/embedded') || path.includes('/editor')) {
      return
    }
  }
  
  const session = useSessionStore(store)
  session.initialize()
}
