import type { App } from 'vue'

import { abilitiesPlugin } from '@casl/vue'
import { ability } from './ability'
import type { Rule } from './ability'
import { abilitiesForRole } from '@/modules/auth/rbac'

export default function (app: App) {
  const userAbilityRules = useCookie<Rule[]>('userAbilityRules')
  const initialRules = userAbilityRules.value && userAbilityRules.value.length
    ? userAbilityRules.value
    : abilitiesForRole('customer')

  ability.update(initialRules)
  if (!userAbilityRules.value)
    userAbilityRules.value = initialRules

  app.use(abilitiesPlugin, ability, {
    useGlobalProperties: true,
  })
}
