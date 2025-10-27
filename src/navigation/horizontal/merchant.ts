import type { HorizontalNavItems } from '@layouts/types'

const merchantNav: HorizontalNavItems = [
  {
    title: 'Overview',
    icon: { icon: 'tabler-layout-dashboard' },
    to: '/merchant/overview',
  },
  {
    title: 'Catalog',
    icon: { icon: 'tabler-packages' },
    to: '/admin/catalog',
  },
  {
    title: 'Templates',
    icon: { icon: 'tabler-template' },
    to: '/merchant/templates',
  },
  {
    title: 'Shortcodes',
    icon: { icon: 'tabler-code' },
    to: '/merchant/shortcodes',
  },
  {
    title: 'Operations',
    icon: { icon: 'tabler-activity-heartbeat' },
    to: '/merchant/operations',
  },
]

export default merchantNav
