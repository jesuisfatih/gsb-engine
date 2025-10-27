import type { App } from 'vue'
import { store } from './2.pinia'
import { useSessionStore } from '@/modules/auth/stores/sessionStore'

export default function (_app: App) {
  const session = useSessionStore(store)
  session.initialize()
}
