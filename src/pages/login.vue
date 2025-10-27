<script setup lang="ts">
import { VForm } from 'vuetify/components/VForm'
import AuthProvider from '@/views/pages/authentication/AuthProvider.vue'
import { useGenerateImageVariant } from '@core/composable/useGenerateImageVariant'
import authV2LoginIllustrationBorderedDark from '@images/pages/auth-v2-login-illustration-bordered-dark.png'
import authV2LoginIllustrationBorderedLight from '@images/pages/auth-v2-login-illustration-bordered-light.png'
import authV2LoginIllustrationDark from '@images/pages/auth-v2-login-illustration-dark.png'
import authV2LoginIllustrationLight from '@images/pages/auth-v2-login-illustration-light.png'
import authV2MaskDark from '@images/pages/misc-mask-dark.png'
import authV2MaskLight from '@images/pages/misc-mask-light.png'
import { VNodeRenderer } from '@layouts/components/VNodeRenderer'
import { themeConfig } from '@themeConfig'
import { useSessionStore } from '@/modules/auth/stores/sessionStore'
import type { RoleId, SessionUser } from '@/modules/core/types/domain'

definePage({
  meta: {
    layout: 'blank',
    unauthenticatedOnly: true,
  },
})

const authThemeImg = useGenerateImageVariant(
  authV2LoginIllustrationLight,
  authV2LoginIllustrationDark,
  authV2LoginIllustrationBorderedLight,
  authV2LoginIllustrationBorderedDark,
  true,
)

const authThemeMask = useGenerateImageVariant(authV2MaskLight, authV2MaskDark)

const isPasswordVisible = ref(false)
const isSubmitting = ref(false)

const route = useRoute()
const router = useRouter()

const session = useSessionStore()

const errors = ref<{ email?: string; password?: string; form?: string }>({})

const refVForm = ref<VForm | null>(null)

const credentials = ref({
  email: '',
  password: '',
})

const rememberMe = ref(false)

const ROLE_REDIRECTS: Record<RoleId, string> = {
  'super-admin': '/super-admin/overview',
  'merchant-admin': '/merchant/overview',
  'merchant-staff': '/staff/workbench',
  'customer': '/editor',
}

interface LoginResponse {
  accessToken: string
  user: {
    id: string | number
    email: string
    fullName?: string | null
    role: RoleId
    tenantId?: string | null
    merchantId?: string | null
  }
  tenants?: Array<{ id: string; slug?: string | null; name: string; role: RoleId; isActive?: boolean }>
}

const login = async () => {
  isSubmitting.value = true
  errors.value = {}

  try {
    const res = await $api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: {
        email: credentials.value.email.trim(),
        password: credentials.value.password,
        rememberMe: rememberMe.value,
      },
    })

    const activeTenant = res.tenants?.find(tenant => tenant.isActive) ?? res.tenants?.[0]
    const tenantId = activeTenant?.id ?? res.user.tenantId ?? null

    const sessionUser: SessionUser = {
      id: res.user.id,
      email: res.user.email,
      fullName: res.user.fullName ?? undefined,
      role: res.user.role,
      tenantId: tenantId ?? undefined,
      merchantId: res.user.merchantId ?? tenantId ?? undefined,
    }

    session.setSession({
      user: sessionUser,
      accessToken: res.accessToken,
      tenantId,
      tenants: res.tenants ?? [],
    })

    await session.fetchServerSession({ silent: true }).catch(() => {})

    const fallbackRoute = ROLE_REDIRECTS[sessionUser.role] ?? '/'
    const targetRoute = typeof route.query.to === 'string' && route.query.to.length ? route.query.to : fallbackRoute

    await nextTick(() => {
      router.replace(targetRoute)
    })
  }
  catch (err: any) {
    const responseErrors = err?.response?._data?.errors as Record<string, string> | undefined

    if (responseErrors)
      errors.value = { ...responseErrors }
    else
      errors.value = { form: 'Login failed. Please verify your credentials and try again.' }

    console.error('[auth] login failed', err)
  }
  finally {
    isSubmitting.value = false
  }
}

const onSubmit = () => {
  refVForm.value?.validate()
    .then(({ valid }) => {
      if (valid)
        login()
    })
}
</script>

<template>
  <RouterLink to="/">
    <div class="auth-logo d-flex align-center gap-x-3">
      <VNodeRenderer :nodes="themeConfig.app.logo" />
      <h1 class="auth-title">
        {{ themeConfig.app.title }}
      </h1>
    </div>
  </RouterLink>

  <VRow
    no-gutters
    class="auth-wrapper bg-surface"
  >
    <VCol
      md="8"
      class="d-none d-md-flex"
    >
      <div class="position-relative bg-background w-100 me-0">
        <div
          class="d-flex align-center justify-center w-100 h-100"
          style="padding-inline: 6.25rem;"
        >
          <VImg
            max-width="613"
            :src="authThemeImg"
            class="auth-illustration mt-16 mb-2"
          />
        </div>

        <img
          class="auth-footer-mask"
          :src="authThemeMask"
          alt="auth-footer-mask"
          height="280"
          width="100"
        >
      </div>
    </VCol>

    <VCol
      cols="12"
      md="4"
      class="auth-card-v2 d-flex align-center justify-center"
    >
      <VCard
        flat
        :max-width="500"
        class="mt-12 mt-sm-0 pa-4"
      >
        <VCardText>
          <h4 class="text-h4 mb-1">
            Welcome to <span class="text-capitalize"> {{ themeConfig.app.title }} </span>!
          </h4>
          <p class="mb-0">
            Please sign-in to your account and start the adventure
          </p>
        </VCardText>
        <VCardText>
          <VAlert
            color="primary"
            variant="tonal"
          >
            <p class="text-sm mb-2">
              Super Admin: <strong>superadmin@gsb.dev</strong> / Pass: <strong>superadmin</strong>
            </p>
            <p class="text-sm mb-0">
              Merchant Admin: <strong>merchantadmin@gsb.dev</strong> / Pass: <strong>merchantadmin</strong>
            </p>
            <p class="text-sm mb-0">
              Merchant Staff: <strong>merchantstaff@gsb.dev</strong> / Pass: <strong>merchantstaff</strong>
            </p>
            <p class="text-sm mb-0">
              Customer: <strong>customer@gsb.dev</strong> / Pass: <strong>customer</strong>
            </p>
          </VAlert>
        </VCardText>
        <VCardText>
          <VForm
            ref="refVForm"
            @submit.prevent="onSubmit"
          >
            <VRow>
              <VCol cols="12">
                <AppTextField
                  v-model="credentials.email"
                  label="Email"
                  placeholder="johndoe@email.com"
                  type="email"
                  autofocus
                  :rules="[requiredValidator, emailValidator]"
                  :error-messages="errors.email"
                />
              </VCol>

              <VCol cols="12">
                <AppTextField
                  v-model="credentials.password"
                  label="Password"
                  placeholder="••••••••"
                  :rules="[requiredValidator]"
                  :type="isPasswordVisible ? 'text' : 'password'"
                  autocomplete="current-password"
                  :error-messages="errors.password"
                  :append-inner-icon="isPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'"
                  @click:append-inner="isPasswordVisible = !isPasswordVisible"
                />

                <div class="d-flex align-center flex-wrap justify-space-between my-6">
                  <VCheckbox
                    v-model="rememberMe"
                    label="Remember me"
                  />
                  <RouterLink
                    class="text-primary ms-2 mb-1"
                    :to="{ name: 'forgot-password' }"
                  >
                    Forgot Password?
                  </RouterLink>
                </div>

                <VBtn
                  block
                  type="submit"
                  :loading="isSubmitting"
                >
                  Login
                </VBtn>

                <VAlert
                  v-if="errors.form"
                  type="error"
                  variant="tonal"
                  class="mt-4"
                >
                  {{ errors.form }}
                </VAlert>
              </VCol>

              <VCol
                cols="12"
                class="text-center"
              >
                <span>New on our platform?</span>
                <RouterLink
                  class="text-primary ms-1"
                  :to="{ name: 'register' }"
                >
                  Create an account
                </RouterLink>
              </VCol>
              <VCol
                cols="12"
                class="d-flex align-center"
              >
                <VDivider />
                <span class="mx-4">or</span>
                <VDivider />
              </VCol>

              <VCol
                cols="12"
                class="text-center"
              >
                <AuthProvider />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

<style lang="scss">
@use "@core/scss/template/pages/page-auth";
</style>
