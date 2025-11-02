import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { fileURLToPath } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { VueRouterAutoImports, getPascalCaseRouteName } from 'unplugin-vue-router'
import VueRouter from 'unplugin-vue-router/vite'
import { defineConfig, loadEnv } from 'vite'
//import VueDevTools from 'vite-plugin-vue-devtools'
import MetaLayouts from 'vite-plugin-vue-meta-layouts'
import vuetify from 'vite-plugin-vuetify'
import svgLoader from 'vite-svg-loader'

// https://vitejs.devidak/config/
export default defineConfig(({ mode }) => {
  // Load env variables for build
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
  plugins: [
    // Docs: https://github.com/posva/unplugin-vue-router
    // ℹ️ This plugin should be placed before vue plugin
    VueRouter({
      getRouteName: routeNode => {
        // Convert pascal case to kebab case
        return getPascalCaseRouteName(routeNode)
          .replace(/([a-z\d])([A-Z])/g, '$1-$2')
          .toLowerCase()
      },
      beforeWriteFiles: root => {
        root.insert('/apps/email/:filter', '/src/pages/apps/email/index.vue')
        root.insert('/apps/email/:label', '/src/pages/apps/email/index.vue')
      },
    }),
    vue({
      template: {
        compilerOptions: {
          isCustomElement: tag => tag === 'swiper-container' || tag === 'swiper-slide',
        },
      },
    }),
    //process.env.NODE_ENV === 'development' && VueDevTools(),        
    vueJsx(),

    // Docs: https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin
    vuetify({
      styles: {
        configFile: 'src/assets/styles/variables/_vuetify.scss',
      },
    }),

    // Docs: https://github.com/dishait/vite-plugin-vue-meta-layouts?tab=readme-ov-file
    MetaLayouts({
      target: './src/layouts',
      defaultLayout: 'default',
    }),

    // Docs: https://github.com/antfu/unplugin-vue-components#unplugin-vue-components
    Components({
      dirs: ['src/@core/components', 'src/views/demos', 'src/components'],
      dts: true,
      resolvers: [
        componentName => {
          // Auto import `VueApexCharts`
          if (componentName === 'VueApexCharts')
            return { name: 'default', from: 'vue3-apexcharts', as: 'VueApexCharts' }
        },
      ],
    }),

    // Docs: https://github.com/antfu/unplugin-auto-import#unplugin-auto-import
    AutoImport({
      imports: ['vue', VueRouterAutoImports, '@vueuse/core', '@vueuse/math', 'vue-i18n', 'pinia'],
      dirs: [
        './src/@core/utils',
        './src/@core/composable/',
        './src/composables/',
        './src/utils/',
        './src/plugins/*/composables/*',
      ],
      vueTemplate: true,

      // ℹ️ Disabled to avoid confusion & accidental usage
      ignore: ['useCookies', 'useStorage'],
    }),

    // Docs: https://github.com/intlify/bundle-tools/tree/main/packages/unplugin-vue-i18n#intlifyunplugin-vue-i18n
    VueI18nPlugin({
      runtimeOnly: true,
      compositionOnly: true,
      include: [
        fileURLToPath(new URL('./src/plugins/i18n/locales/**', import.meta.url)),
      ],
    }),
    svgLoader(),
    {
      name: 'html-transform-app-bridge',
      enforce: 'post', // Run AFTER Vite's HTML transforms to ensure correct order
      transformIndexHtml(html) {
        const apiKey = env.VITE_SHOPIFY_APP_API_KEY || env.VITE_SHOPIFY_API_KEY || '';
        
        if (!apiKey) {
          console.warn('[vite-plugin-app-bridge] ⚠️ VITE_SHOPIFY_APP_API_KEY not found, skipping App Bridge setup');
          return html;
        }
        
        console.log('[vite-plugin-app-bridge] ✅ Injecting App Bridge with API key:', apiKey.substring(0, 8) + '...');
        
        // Remove any existing App Bridge meta tags and script tags (including placeholders)
        let transformed = html.replace(/<meta[^>]*name=["']shopify-api-key["'][^>]*>/gi, '');
        transformed = transformed.replace(/<script[^>]*app-bridge[^>]*><\/script>/gi, '');
        transformed = transformed.replace(/<!--[\s\S]*?App Bridge[\s\S]*?-->/gi, '');
        
        // Find <head> tag - MUST be the first thing in <head>
        const headMatch = transformed.match(/<head[^>]*>/i);
        if (!headMatch) {
          console.error('[vite-plugin-app-bridge] ❌ <head> tag not found!');
          return html;
        }
        
        const headTag = headMatch[0];
        const headEndIndex = transformed.indexOf(headTag) + headTag.length;
        
        // Modern App Bridge setup:
        // 1. Meta tag with API key (REQUIRED)
        // 2. Script tag WITHOUT data-api-key (API key comes from meta tag)
        // 3. type="text/javascript" prevents Vite from transforming this script
        // 4. MUST be first elements in <head> according to Shopify docs
        const appBridgeTags = `\n  <!-- Shopify App Bridge - MUST be first in <head> -->\n  <meta name="shopify-api-key" content="${apiKey}" />\n  <script type="text/javascript" src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>`;
        
        transformed = transformed.slice(0, headEndIndex) + appBridgeTags + transformed.slice(headEndIndex);
        
        // Verify injection
        if (!transformed.includes(`<meta name="shopify-api-key" content="${apiKey}" />`)) {
          console.error('[vite-plugin-app-bridge] ❌ Failed to inject meta tag!');
        } else {
          console.log('[vite-plugin-app-bridge] ✅ App Bridge tags injected successfully');
        }
        
        return transformed;
      },
    },
  ],
  define: { 
    'process.env': {},
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@themeConfig': fileURLToPath(new URL('./themeConfig.ts', import.meta.url)),
      '@core': fileURLToPath(new URL('./src/@core', import.meta.url)),
      '@layouts': fileURLToPath(new URL('./src/@layouts', import.meta.url)),
      '@images': fileURLToPath(new URL('./src/assets/images/', import.meta.url)),
      '@styles': fileURLToPath(new URL('./src/assets/styles/', import.meta.url)),
      '@configured-variables': fileURLToPath(new URL('./src/assets/styles/variables/_template.scss', import.meta.url)),
      '@db': fileURLToPath(new URL('./src/plugins/fake-api/handlers/', import.meta.url)),
      '@api-utils': fileURLToPath(new URL('./src/plugins/fake-api/utils/', import.meta.url)),
    },
  },
  // Base path for Shopify App Proxy deployment
  base: process.env.NODE_ENV === 'production' ? '/apps/gsb/' : '/',
  build: {
    chunkSizeWarningLimit: 5000,
  },
  optimizeDeps: {
    exclude: ['vuetify'],
    entries: [
      './src/**/*.vue',
    ],
  },
  server: {
    proxy: {
      '/api': {
        target: env.VITE_API_PROXY || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  }
})
