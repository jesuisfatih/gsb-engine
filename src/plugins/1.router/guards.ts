import type { RouteNamedMap, _RouterTyped } from 'unplugin-vue-router'
import { canNavigate } from '@layouts/plugins/casl'
import { useSessionStore } from '@/modules/auth/stores/sessionStore'
import { store } from '@/plugins/2.pinia'

export const setupGuards = (router: _RouterTyped<RouteNamedMap & { [key: string]: any }>) => {
  // 👉 router.beforeEach
  // Docs: https://router.vuejs.org/guide/advanced/navigation-guards.html#global-before-guards
  router.beforeEach(to => {
    // Allow editor for public customer access (both standalone and Shopify proxy paths)
    if (to.path === '/editor' || 
        to.path.startsWith('/editor?') || 
        to.path.startsWith('/editor/') ||
        to.path === '/apps/gsb/editor' ||
        to.path.startsWith('/apps/gsb/editor?') ||
        to.path.startsWith('/apps/gsb/editor/')) {
      return;
    }
    
    // CRITICAL FIX: Detect customer storefront access (preview_theme_id in URL)
    // Customer login olduğunda admin'e yönlendirme!
    if (typeof window !== 'undefined' && window.location.search) {
      const urlParams = new URLSearchParams(window.location.search);
      const hasPreviewTheme = urlParams.has('preview_theme_id') || urlParams.has('key');
      
      if (hasPreviewTheme) {
        console.log('[Router] Customer storefront detected - bypassing auth');
        // Redirect to editor (customer context)
        if (to.path !== '/editor' && to.path !== '/apps/gsb/editor') {
          return '/editor' + window.location.search;
        }
        return;
      }
    }
    
    // Allow Shopify embedded routes (authenticated via session token)
    if (to.path.startsWith('/shopify/embedded')) {
      return;
    }
    
    /*
     * If it's a public route, continue navigation. This kind of pages are allowed to visited by login & non-login users. Basically, without any restrictions.
     * Examples of public routes are, 404, under maintenance, etc.
     */
    if (to.meta.public)
      return

    /**
     * Check if user is logged in by checking if token & user data exists in local storage
     * Feel free to update this logic to suit your needs
     */
    const session = useSessionStore(store)
    const isLoggedIn = session.isAuthenticated

    /*
      If user is logged in and is trying to access login like page, redirect to home
      else allow visiting the page
      (WARN: Don't allow executing further by return statement because next code will check for permissions)
     */
    if (to.meta.unauthenticatedOnly) {
      if (isLoggedIn)
        return '/'
      else
        return undefined
    }

    if (!isLoggedIn) {
      return {
        name: 'login',
        query: {
          ...to.query,
          to: to.fullPath !== '/' ? to.fullPath : undefined,
        },
      }
    }

    if (!canNavigate(to) && to.matched.length) {
      /* eslint-disable indent */
      return isLoggedIn
        ? { name: 'not-authorized' }
        : {
            name: 'login',
            query: {
              ...to.query,
              to: to.fullPath !== '/' ? to.path : undefined,
            },
          }
      /* eslint-enable indent */
    }
  })
}
