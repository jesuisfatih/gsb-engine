import type { User } from '@db/auth/types'
import { abilitiesForRole } from '@/modules/auth/rbac'

interface DB {
  userTokens: string[]
  users: User[]
}
export const db: DB = {
  // TODO: Use jsonwebtoken pkg
  // ℹ️ Created from https://jwt.io/ using HS256 algorithm
  // ℹ️ We didn't created it programmatically because jsonwebtoken package have issues with esm support. View Issues: https://github.com/auth0/node-jsonwebtoken/issues/655
  userTokens: [
    'placeholder-token-ignore',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MX0.fhc3wykrAnRpcKApKhXiahxaOe8PSHatad31NuIZ0Zg',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Mn0.cat2xMrZLn0FwicdGtZNzL7ifDTAKWB0k1RurSWjdnw',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6M30.PGOfMaZA_T9W05vMj5FYXG5d47soSPJD1WuxeUfw4L4',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NH0.d_9aq2tpeA9-qpqO0X4AmW6gU2UpWkXwc04UJYFWiZE',
  ],

  users: [
    {
      id: 1,
      fullName: 'Sara Platform',
      username: 'superadmin',
      password: 'superadmin',
      avatar: `${import.meta.env.BASE_URL ?? '/'}images/avatars/avatar-1.png`,
      email: 'superadmin@gsb.dev',
      role: 'super-admin',
      tenantId: 'platform',
      abilityRules: abilitiesForRole('super-admin'),
    },
    {
      id: 2,
      fullName: 'Kemal Merchant',
      username: 'merchantadmin',
      password: 'merchantadmin',
      avatar: `${import.meta.env.BASE_URL ?? '/'}images/avatars/avatar-2.png`,
      email: 'merchantadmin@gsb.dev',
      role: 'merchant-admin',
      tenantId: 'default-tenant',
      merchantId: 'merch-001',
      abilityRules: abilitiesForRole('merchant-admin'),
    },
    {
      id: 3,
      fullName: 'Deniz Operator',
      username: 'merchantstaff',
      password: 'merchantstaff',
      avatar: `${import.meta.env.BASE_URL ?? '/'}images/avatars/avatar-3.png`,
      email: 'merchantstaff@gsb.dev',
      role: 'merchant-staff',
      tenantId: 'default-tenant',
      merchantId: 'merch-001',
      abilityRules: abilitiesForRole('merchant-staff'),
    },
    {
      id: 4,
      fullName: 'Elif Customer',
      username: 'customer',
      password: 'customer',
      avatar: `${import.meta.env.BASE_URL ?? '/'}images/avatars/avatar-4.png`,
      email: 'customer@gsb.dev',
      role: 'customer',
      tenantId: 'default-tenant',
      abilityRules: abilitiesForRole('customer'),
    },
  ],
}
