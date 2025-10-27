export default [
  { heading: 'Workspace' },
  {
    title: 'Overview',
    icon: { icon: 'tabler-layout-dashboard' },
    to: '/merchant/overview',
    action: 'read',
    subject: 'MerchantDashboard',
  },
  {
    title: 'Product Catalog',
    icon: { icon: 'tabler-packages' },
    to: '/admin/catalog',
    action: 'manage',
    subject: 'ProductCatalog',
  },
  {
    title: 'Templates',
    icon: { icon: 'tabler-template' },
    to: '/merchant/templates',
    action: 'manage',
    subject: 'TemplateLibrary',
  },
  {
    title: 'Shortcodes',
    icon: { icon: 'tabler-code' },
    to: '/merchant/shortcodes',
    action: 'manage',
    subject: 'Merchant',
  },
  {
    title: 'Ops & Fulfillment',
    icon: { icon: 'tabler-activity-heartbeat' },
    to: '/merchant/operations',
    action: 'read',
    subject: 'Production',
  },
  { divider: true },
  {
    heading: 'Support',
  },
  {
    title: 'Documentation',
    icon: { icon: 'tabler-book' },
    to: 'pages-faq',
  },
] as const

