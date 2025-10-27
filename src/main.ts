import App from '@/App.vue'
import { registerPlugins } from '@core/utils/plugins'
import { createApp } from 'vue'

// Styles
import '@core/scss/template/index.scss'
import '@styles/styles.scss'

// Create vue app
const app = createApp(App)

// VueKonva plugin'ini ekle
import VueKonva from 'vue-konva'
app.use(VueKonva)

// Register other plugins
registerPlugins(app)

// Mount vue app
app.mount('#app')
