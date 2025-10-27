<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "default",
    action: "read",
    subject: "MerchantDashboard",
  },
});
</script>

<template>
  <VContainer fluid class="merchant-workspace pa-0">
    <VRow class="g-0">
      <VCol cols="12" md="3" class="workspace-nav elevation-2">
        <div class="nav-content py-6 px-4">
          <div class="mb-6">
            <h1 class="text-h5 font-weight-semibold mb-1">
              Merchant Control Center
            </h1>
            <p class="text-body-2 text-medium-emphasis mb-0">
              Kurulum alanları arasında hızlıca dolaşın.
            </p>
          </div>
          <VList density="comfortable" nav class="side-links">
            <VListSubheader class="text-overline text-medium-emphasis">
              Çekirdek modüller
            </VListSubheader>
            <VListItem href="#app-bootstrap" prepend-icon="tabler-rocket">App Bootstrap</VListItem>
            <VListItem href="#shopify-integration" prepend-icon="tabler-arrows-left-right">Shopify Entegrasyonu</VListItem>
            <VListItem href="#branding" prepend-icon="tabler-palette">Marka &amp; Özelleştirme</VListItem>
            <VListItem href="#templates-assets" prepend-icon="tabler-template">Template &amp; Asset Yönetimi</VListItem>
            <VListItem href="#product-tech" prepend-icon="tabler-cube">Ürün &amp; Teknik Kurallar</VListItem>
            <VListItem href="#pricing" prepend-icon="tabler-currency-dollar">Fiyatlama &amp; Promosyon</VListItem>
            <VListItem href="#order-flow" prepend-icon="tabler-flowchart">Sipariş Süreçleri</VListItem>
            <VListItem href="#operations" prepend-icon="tabler-truck">Operasyon &amp; Fulfillment</VListItem>
            <VListItem href="#analytics" prepend-icon="tabler-chart-line">Raporlama &amp; İzleme</VListItem>
            <VListItem href="#security" prepend-icon="tabler-shield-lock">Kullanıcı &amp; Güvenlik</VListItem>
            <VListItem href="#support" prepend-icon="tabler-life-buoy">Destek &amp; Dokümantasyon</VListItem>
          </VList>
          <VAlert type="info" variant="tonal" class="mt-6">
            Salesforce / Slack entegrasyonları için Support bölümüne göz atın.
          </VAlert>
        </div>
      </VCol>
      <VCol cols="12" md="9" class="workspace-body">
        <section id="app-bootstrap" class="workspace-section">
          <header class="section-header">
            <div>
              <h2 class="text-h5 font-weight-semibold mb-1">App Bootstrap</h2>
              <p class="text-body-2 text-medium-emphasis mb-0">
                App URL, redirect, access token ve role assignment işlemleri.
              </p>
            </div>
            <VChip color="primary" variant="tonal">Setup</VChip>
          </header>
          <VRow>
            <VCol cols="12" lg="6">
              <VCard rounded="xl" elevation="2" class="pa-4 h-100">
                <h3 class="text-subtitle-1 font-weight-semibold mb-2">Shopify App URL &amp; Redirect</h3>
                <p class="text-body-2 text-medium-emphasis mb-4">
                  Cloudflare tüneli veya prod domaininizi girin, redirect listesine auth callback URL’lerini ekleyin.
                </p>
                <VTextField
                  label="App URL"
                  prepend-inner-icon="tabler-link"
                  placeholder="https://gsb.example.com/"
                  density="comfortable"
                />
                <VTextarea
                  label="Redirect URL listesi"
                  rows="3"
                  hint="Her satır bir URL"
                  class="mt-4"
                  placeholder="https://gsb.example.com/auth/callback&#10;https://gsb.example.com/api/auth/callback"
                />
                <div class="d-flex justify-end mt-4">
                  <VBtn color="primary" append-icon="tabler-device-floppy">Kaydet</VBtn>
                </div>
              </VCard>
            </VCol>
            <VCol cols="12" lg="6">
              <VCard rounded="xl" elevation="2" class="pa-4 h-100">
                <h3 class="text-subtitle-1 font-weight-semibold mb-2">Token Yönetimi Paneli</h3>
                <VTimeline density="compact" line-inset="10" class="mb-4">
                  <VTimelineItem size="small" dot-color="success">
                    <div class="font-weight-semibold">Storefront token oluşturuldu</div>
                    <div class="text-caption text-medium-emphasis">985b2588219e3e530073fa1f42fbf2dd</div>
                  </VTimelineItem>
                  <VTimelineItem size="small" dot-color="primary">
                    <div class="font-weight-semibold">Admin API token (custom app)</div>
                    <div class="text-caption text-medium-emphasis">shpat_*******************</div>
                  </VTimelineItem>
                  <VTimelineItem size="small" dot-color="warning">
                    <div class="font-weight-semibold">Vault senkronu bekleniyor</div>
                    <div class="text-caption text-medium-emphasis">Ops onayı 31 Ekim</div>
                  </VTimelineItem>
                </VTimeline>
                <div class="d-flex gap-2 justify-end">
                  <VBtn variant="outlined" prepend-icon="tabler-refresh" color="primary">Token yenile</VBtn>
                  <VBtn variant="text" color="primary">Vault’a kopyala</VBtn>
                </div>
              </VCard>
            </VCol>
            <VCol cols="12">
              <VCard rounded="xl" elevation="2" class="pa-4">
                <h3 class="text-subtitle-1 font-weight-semibold mb-2">Rol atama arayüzü</h3>
                <p class="text-body-2 text-medium-emphasis mb-3">
                  Merchant admin, staff ve diğer roller için izinleri yönetin.
                </p>
                <VDataTable
                  density="compact"
                  hide-default-footer
                  :headers="[
                    { title: 'Kullanıcı', key: 'user' },
                    { title: 'Rol', key: 'role' },
                    { title: 'Durum', key: 'status' },
                    { title: 'Son giriş', key: 'seen' },
                    { title: 'Aksiyon', key: 'actions', align: 'end' },
                  ]"
                  :items="[
                    { user: 'merchantadmin@gsb.dev', role: 'Merchant Admin', status: 'Aktif', seen: '26.10.2025 13:42' },
                    { user: 'merchantstaff@gsb.dev', role: 'Merchant Staff', status: 'Aktif', seen: '26.10.2025 11:18' },
                    { user: 'ops@gsb.dev', role: 'Merchant Staff', status: 'Davet gönderildi', seen: '—' },
                  ]"
                >
                  <template #item.status="{ value }">
                    <VChip
                      size="x-small"
                      :color="value === 'Aktif' ? 'success' : value === 'Davet gönderildi' ? 'warning' : 'default'"
                      variant="tonal"
                    >
                      {{ value }}
                    </VChip>
                  </template>
                  <template #item.actions>
                    <VBtn variant="text" size="small" color="primary">Rol değiştir</VBtn>
                  </template>
                </VDataTable>
              </VCard>
            </VCol>
          </VRow>
        </section>

        <section id="support" class="workspace-section">
          <header class="section-header">
            <div>
              <h2 class="text-h5 font-weight-semibold mb-1">Destek &amp; Dokümantasyon</h2>
              <p class="text-body-2 text-medium-emphasis mb-0">
                Onboarding rehberi, troubleshooter ve destek iletişim bilgileri.
              </p>
            </div>
            <VChip color="primary" variant="tonal">Support</VChip>
          </header>
          <VRow>
            <VCol cols="12" lg="4">
              <VCard rounded="xl" elevation="2" class="pa-4 h-100">
                <h3 class="text-subtitle-1 font-weight-semibold mb-2">Onboarding rehberi</h3>
                <p class="text-body-2 text-medium-emphasis mb-3">
                  Merchant ekibinin hızlı başlaması için eğitim materyalleri.
                </p>
                <div class="d-flex gap-2">
                  <VBtn variant="outlined" prepend-icon="tabler-video">Video</VBtn>
                  <VBtn color="primary" prepend-icon="tabler-file-text">Markdown</VBtn>
                </div>
              </VCard>
            </VCol>
            <VCol cols="12" lg="4">
              <VCard rounded="xl" elevation="2" class="pa-4 h-100">
                <h3 class="text-subtitle-1 font-weight-semibold mb-2">Troubleshooter</h3>
                <VExpansionPanels>
                  <VExpansionPanel>
                    <VExpansionPanelTitle>Theme embed görünmüyor</VExpansionPanelTitle>
                    <VExpansionPanelText>Snippet / extension deploy edildiğinden ve tünel URL’sinin doğru olduğundan emin olun.</VExpansionPanelText>
                  </VExpansionPanel>
                  <VExpansionPanel>
                    <VExpansionPanelTitle>Webhook hatası</VExpansionPanelTitle>
                    <VExpansionPanelText>Admin access token süresi, yanıt kodları ve timeout değerlerini kontrol edin.</VExpansionPanelText>
                  </VExpansionPanel>
                  <VExpansionPanel>
                    <VExpansionPanelTitle>Mockup placeholder</VExpansionPanelTitle>
                    <VExpansionPanelText>MOCKUP_SERVICE_URL değerini render servis URL’si ile güncelleyin.</VExpansionPanelText>
                  </VExpansionPanel>
                </VExpansionPanels>
              </VCard>
            </VCol>
            <VCol cols="12" lg="4">
              <VCard rounded="xl" elevation="2" class="pa-4 h-100">
                <h3 class="text-subtitle-1 font-weight-semibold mb-2">Destek iletişim</h3>
                <VList density="compact">
                  <VListItem prepend-icon="tabler-brand-slack" title="Slack" subtitle="gsb-support.slack.com" />
                  <VListItem prepend-icon="tabler-mail" title="E-posta" subtitle="support@gsb.dev" />
                  <VListItem prepend-icon="tabler-phone" title="Telefon" subtitle="+90 212 000 00 00" />
                  <VListItem prepend-icon="tabler-headset" title="Zendesk" subtitle="gsb.zendesk.com" />
                </VList>
              </VCard>
            </VCol>
          </VRow>
        </section>

        <section id="security" class="workspace-section">
          <header class="section-header">
            <div>
              <h2 class="text-h5 font-weight-semibold mb-1">Kullanıcı &amp; Güvenlik</h2>
              <p class="text-body-2 text-medium-emphasis mb-0">
                Rol yönetimi, audit log ve güvenlik politikaları.
              </p>
            </div>
            <VChip color="primary" variant="tonal">Security</VChip>
          </header>
          <VRow>
            <VCol cols="12" lg="4">
              <VCard rounded="xl" elevation="2" class="pa-4">
                <h3 class="text-subtitle-1 font-weight-semibold mb-2">Rol yönetimi</h3>
                <VList density="compact">
                  <VListItem title="Merchant Admin" subtitle="Tam erişim" />
                  <VListItem title="Merchant Staff" subtitle="Üretim ve operasyon" />
                  <VListItem title="Customer" subtitle="Editor ve sipariş izleme" />
                </VList>
                <div class="d-flex justify-end mt-3">
                  <VBtn variant="outlined" prepend-icon="tabler-plus">Rol ekle</VBtn>
                </div>
              </VCard>
            </VCol>
            <VCol cols="12" lg="4">
              <VCard rounded="xl" elevation="2" class="pa-4 h-100">
                <h3 class="text-subtitle-1 font-weight-semibold mb-2">Audit log</h3>
                <VDataTable
                  density="compact"
                  hide-default-footer
                  :headers="[
                    { title: 'Tarih', key: 'date' },
                    { title: 'Kullanıcı', key: 'user' },
                    { title: 'Aksiyon', key: 'event' },
                  ]"
                  :items="[
                    { date: '2025-10-26 14:20', user: 'merchantadmin', event: 'Pricing güncellendi' },
                    { date: '2025-10-26 12:05', user: 'ops@gsb.dev', event: 'Supplier rule güncellendi' },
                    { date: '2025-10-25 18:40', user: 'merchantstaff', event: 'Proof onayı gönderildi' },
                  ]"
                />
              </VCard>
            </VCol>
            <VCol cols="12" lg="4">
              <VCard rounded="xl" elevation="2" class="pa-4">
                <h3 class="text-subtitle-1 font-weight-semibold mb-2">Güvenlik ayarları</h3>
                <VSwitch label="MFA gerektir" inset color="primary" class="mb-3" />
                <VSelect
                  label="Oturum süresi"
                  :items="['30 dk', '1 saat', '4 saat']"
                  density="compact"
                  class="mb-3"
                />
                <VTextarea
                  label="Kritik aksiyon uyarıları"
                  rows="3"
                  placeholder="Örn: pricing, supplier routing..."
                />
              </VCard>
            </VCol>
          </VRow>
        </section>

        <section id="analytics" class="workspace-section">
          <header class="section-header">
            <div>
              <h2 class="text-h5 font-weight-semibold mb-1">Raporlama &amp; İzleme</h2>
              <p class="text-body-2 text-medium-emphasis mb-0">
                Dashboard metrikleri, filtreleme paneli ve SLA monitörü.
              </p>
            </div>
            <VChip color="primary" variant="tonal">Analytics</VChip>
          </header>
          <VRow>
            <VCol cols="12" lg="6">
              <VCard rounded="xl" elevation="2" class="pa-4 h-100">
                <h3 class="text-subtitle-1 font-weight-semibold mb-2">Dashboard metrikleri</h3>
                <VSparkline
                  :value="[12,16,18,15,22,26,30]"
                  color="primary"
                  line-width="3"
                  smooth
                  class="mb-4"
                  auto-draw
                />
                <VList density="compact">
                  <VListItem title="Haftalık siparişler" subtitle="Toplam 152, önceki haftaya göre %12 artış" />
                  <VListItem title="Shortcode hits" subtitle="4.120 görüntüleme, conversion %7.4" />
                </VList>
              </VCard>
            </VCol>
            <VCol cols="12" lg="3">
              <VCard rounded="xl" elevation="2" class="pa-4 h-100">
                <h3 class="text-subtitle-1 font-weight-semibold mb-3">Filtreleme paneli</h3>
                <VSelect
                  label="Zaman aralığı"
                  :items="['7 gün', '30 gün', '90 gün']"
                  density="compact"
                  class="mb-3"
                />
                <VSelect
                  label="Şablon"
                  :items="['Hepsi', 'Holiday Promo', 'Premium Pack']"
                  density="compact"
                  class="mb-3"
                />
                <VSelect
                  label="Teknik"
                  :items="['DTF', 'Screen', 'Embroidery']"
                  density="compact"
                />
              </VCard>
            </VCol>
            <VCol cols="12" lg="3">
              <VCard rounded="xl" elevation="2" class="pa-4">
                <h3 class="text-subtitle-1 font-weight-semibold mb-3">SLA monitörü</h3>
                <VSparkline
                  :value="[95,94,96,92,93,97]"
                  color="success"
                  line-width="3"
                  smooth
                  class="mb-4"
                  auto-draw
                />
                <VList density="compact">
                  <VListItem title="Ortalama SLA" subtitle="93% - 24 saat hedef" />
                  <VListItem title="Uyarılar" subtitle="1 (Atlas Print Co.)" />
                </VList>
              </VCard>
            </VCol>
          </VRow>
        </section>

        <section id="operations" class="workspace-section">
          <header class="section-header">
            <div>
              <h2 class="text-h5 font-weight-semibold mb-1">Operasyon &amp; Fulfillment</h2>
              <p class="text-body-2 text-medium-emphasis mb-0">
                Üretim takip, barkod generator ve paketleme checklist.
              </p>
            </div>
            <VChip color="primary" variant="tonal">Ops</VChip>
          </header>
          <VRow>
            <VCol cols="12" lg="4">
              <VCard rounded="xl" elevation="2" class="pa-4">
                <h3 class="text-subtitle-1 font-weight-semibold mb-2">Üretim takip</h3>
                <VTimeline density="compact" line-inset="10">
                  <VTimelineItem size="small" dot-color="primary">
                    <div class="font-weight-semibold">GSB-104</div>
                    <div class="text-caption text-medium-emphasis">Atlas Print Co. - Baskıda</div>
                  </VTimelineItem>
                  <VTimelineItem size="small" dot-color="success">
                    <div class="font-weight-semibold">GSB-102</div>
                    <div class="text-caption text-medium-emphasis">Paketlemede</div>
                  </VTimelineItem>
                  <VTimelineItem size="small" dot-color="warning">
                    <div class="font-weight-semibold">GSB-099</div>
                    <div class="text-caption text-medium-emphasis">Proof revizyon bekliyor</div>
                  </VTimelineItem>
                </VTimeline>
              </VCard>
            </VCol>
            <VCol cols="12" lg="4">
              <VCard rounded="xl" elevation="2" class="pa-4 h-100">
                <h3 class="text-subtitle-1 font-weight-semibold mb-2">Barkod generator</h3>
                <VTextField label="Job ID" placeholder="GSB-104" class="mb-3" />
                <VTextField label="Customer" placeholder="Acme Studio" class="mb-3" />
                <VSwitch label="Include QR data" inset color="primary" class="mb-3" />
                <div class="barcode-preview">
                  <span>||| |||| || | ||||</span>
                  <span class="text-caption text-medium-emphasis">Ön izleme · PDF çıktı alın</span>
                </div>
                <div class="d-flex justify-end mt-3">
                  <VBtn variant="outlined" prepend-icon="tabler-download">PDF indir</VBtn>
                </div>
              </VCard>
            </VCol>
            <VCol cols="12" lg="4">
              <VCard rounded="xl" elevation="2" class="pa-4">
                <h3 class="text-subtitle-1 font-weight-semibold mb-2">Paketleme checklist</h3>
                <VList density="comfortable">
                  <VListItem>
                    <template #prepend><VCheckbox model-value inset /></template>
                    <VListItemTitle>Baskılar kalite kontrol edildi</VListItemTitle>
                  </VListItem>
                  <VListItem>
                    <template #prepend><VCheckbox model-value inset /></template>
                    <VListItemTitle>Paket malzemeleri hazır</VListItemTitle>
                  </VListItem>
                  <VListItem>
                    <template #prepend><VCheckbox inset /></template>
                    <VListItemTitle>Kargo etiketi yazdırıldı</VListItemTitle>
                  </VListItem>
                </VList>
              </VCard>
            </VCol>
          </VRow>
        </section>

        <section id="order-flow" class="workspace-section">
          <header class="section-header">
            <div>
              <h2 class="text-h5 font-weight-semibold mb-1">Sipariş Süreçleri</h2>
              <p class="text-body-2 text-medium-emphasis mb-0">
                Onay akışı, supplier dashboard ve proof yönetimi.
              </p>
            </div>
            <VChip color="primary" variant="tonal">Orders</VChip>
          </header>
          <VRow>
            <VCol cols="12" lg="4">
              <VCard rounded="xl" elevation="2" class="pa-4">
                <h3 class="text-subtitle-1 font-weight-semibold mb-2">Onay akışı</h3>
                <VSwitch label="Proof onayı zorunlu" inset color="primary" class="mb-3" />
                <VSelect
                  label="Onay kanalı"
                  :items="['E-posta', 'Slack', 'Webhook']"
                  density="compact"
                  class="mb-3"
                />
                <VTextarea label="Özel onay mesajı" rows="4" />
              </VCard>
            </VCol>
            <VCol cols="12" lg="4">
              <VCard rounded="xl" elevation="2" class="pa-4 h-100">
                <h3 class="text-subtitle-1 font-weight-semibold mb-2">Supplier dashboard</h3>
                <VDataTable
                  density="compact"
                  hide-default-footer
                  :headers="[
                    { title: 'Tedarikçi', key: 'supplier' },
                    { title: 'Teknik', key: 'tech' },
                    { title: 'SLA', key: 'sla' },
                    { title: 'Aktif iş', key: 'jobs' },
                  ]"
                  :items="[
                    { supplier: 'Atlas Print Co.', tech: 'DTF', sla: '24h', jobs: 6 },
                    { supplier: 'ColorForge', tech: 'Screen', sla: '48h', jobs: 2 },
                    { supplier: 'StitchWorks', tech: 'Embroidery', sla: '72h', jobs: 4 },
                  ]"
                />
              </VCard>
            </VCol>
            <VCol cols="12" lg="4">
              <VCard rounded="xl" elevation="2" class="pa-4">
                <h3 class="text-subtitle-1 font-weight-semibold mb-2">Proof yönetimi</h3>
                <VSparkline
                  :value="[2,4,6,4,3,5,7]"
                  color="primary"
                  line-width="2"
                  smooth
                  class="mb-4"
                />
                <VList density="compact">
                  <VListItem title="24 saat içinde onay" subtitle="%82 başarı" />
                  <VListItem title="Revizyon ortalaması" subtitle="1.3 tur" />
                  <VListItem title="Auto approve" subtitle="Kapalı (manual)" />
                </VList>
              </VCard>
            </VCol>
          </VRow>
        </section>

        <section id="pricing" class="workspace-section">
          <header class="section-header">
            <div>
              <h2 class="text-h5 font-weight-semibold mb-1">Fiyatlama &amp; Promosyon</h2>
              <p class="text-body-2 text-medium-emphasis mb-0">
                Fiyat matrisi, kupon yönetimi ve vergi profilleri.
              </p>
            </div>
            <VChip color="primary" variant="tonal">Pricing</VChip>
          </header>
          <VRow>
            <VCol cols="12" lg="4">
              <VCard rounded="xl" elevation="2" class="pa-4 h-100">
                <h3 class="text-subtitle-1 font-weight-semibold mb-2">Fiyat matrisi</h3>
                <VDataTable
                  density="compact"
                  hide-default-footer
                  :headers="[
                    { title: 'Teknik', key: 'tech' },
                    { title: 'Base', key: 'base' },
                    { title: 'Per sq/in', key: 'area' },
                    { title: 'Multiplier', key: 'mult' },
                  ]"
                  :items="[
                    { tech: 'DTF', base: '$6.50', area: '$0.25', mult: '1.0' },
                    { tech: 'Screen', base: '$4.00', area: '$0.12', mult: '1.4' },
                    { tech: 'Embroidery', base: '$7.50', area: '$0.08', mult: '1.6' },
                  ]"
                />
              </VCard>
            </VCol>
            <VCol cols="12" lg="4">
              <VCard rounded="xl" elevation="2" class="pa-4 h-100">
                <div class="d-flex justify-space-between align-center mb-3">
                  <h3 class="text-subtitle-1 font-weight-semibold mb-0">Kupon yönetimi</h3>
                  <VBtn variant="outlined" size="small" prepend-icon="tabler-plus">Kupon ekle</VBtn>
                </div>
                <VList density="comfortable">
                  <VListItem title="SUMMER25" subtitle="25% off - 31 Ağustos">
                    <template #prepend><VAvatar color="primary" variant="tonal"><VIcon icon="tabler-ticket" /></VAvatar></template>
                    <template #append><VBtn variant="text" size="small">Düzenle</VBtn></template>
                  </VListItem>
                  <VListItem title="BULK10" subtitle="$10 off orders over $150">
                    <template #prepend><VAvatar color="secondary" variant="tonal"><VIcon icon="tabler-ticket" /></VAvatar></template>
                    <template #append><VBtn variant="text" size="small">Düzenle</VBtn></template>
                  </VListItem>
                </VList>
              </VCard>
            </VCol>
            <VCol cols="12" lg="4">
              <VCard rounded="xl" elevation="2" class="pa-4 h-100">
                <h3 class="text-subtitle-1 font-weight-semibold mb-2">Vergi profilleri</h3>
                <VSelect
                  label="Varsayılan profil"
                  :items="['ABD - Sales Tax', 'AB - VAT', 'Birleşik Krallık - VAT']"
                  density="compact"
                  class="mb-3"
                />
                <VTextarea
                  label="Özel vergi notu"
                  rows="4"
                  placeholder="Bölgesel vergi açıklamalarını girin..."
                />
              </VCard>
            </VCol>
          </VRow>
        </section>

        <section id="product-tech" class="workspace-section">
          <header class="section-header">
            <div>
              <h2 class="text-h5 font-weight-semibold mb-1">Ürün &amp; Teknik Kurallar</h2>
              <p class="text-body-2 text-medium-emphasis mb-0">
                Surface mask editörü, teknik spesifikasyonlar ve pack ayarları.
              </p>
            </div>
            <VChip color="primary" variant="tonal">Production</VChip>
          </header>
          <VRow>
            <VCol cols="12" lg="4">
              <VCard rounded="xl" elevation="2" class="pa-4 h-100">
                <h3 class="text-subtitle-1 font-weight-semibold mb-2">Surface mask editörü</h3>
                <VFileInput label="Mask PNG" accept="image/png" prepend-icon="tabler-upload" class="mb-3" />
                <VSlider label="Safe zone (px)" min="0" max="100" step="5" thumb-label value="24" class="mb-3" />
                <VSlider label="Bleed (px)" min="0" max="20" step="2" thumb-label value="4" />
                <div class="d-flex justify-end mt-3">
                  <VBtn color="primary" append-icon="tabler-device-floppy">Maskeyi kaydet</VBtn>
                </div>
              </VCard>
            </VCol>
            <VCol cols="12" lg="4">
              <VCard rounded="xl" elevation="2" class="pa-4 h-100">
                <h3 class="text-subtitle-1 font-weight-semibold mb-2">Teknik spesifikasyonlar</h3>
                <VDataTable
                  density="compact"
                  hide-default-footer
                  :headers="[
                    { title: 'Teknik', key: 'tech' },
                    { title: 'Min DPI', key: 'dpi' },
                    { title: 'Min Stroke', key: 'stroke' },
                    { title: 'Min Font', key: 'font' },
                  ]"
                  :items="[
                    { tech: 'DTF', dpi: '300', stroke: '1px', font: '9pt' },
                    { tech: 'Screen', dpi: '—', stroke: '2px', font: '12pt' },
                    { tech: 'Embroidery', dpi: '—', stroke: '3px', font: '18pt' },
                  ]"
                />
              </VCard>
            </VCol>
            <VCol cols="12" lg="4">
              <VCard rounded="xl" elevation="2" class="pa-4 h-100">
                <h3 class="text-subtitle-1 font-weight-semibold mb-2">Pack ayarları</h3>
                <VSelect
                  label="Preset"
                  :items="['DTF 22x24', 'DTF 24x36', 'UV 18x24']"
                  density="compact"
                  class="mb-3"
                />
                <VSlider label="Margin (mm)" min="0" max="30" value="6" step="1" thumb-label class="mb-3" />
                <VSwitch label="Rotate 90°" inset color="primary" class="mb-1" />
                <VSwitch label="Allow flip" inset color="primary" />
              </VCard>
            </VCol>
          </VRow>
        </section>

        <section id="templates-assets" class="workspace-section">
          <header class="section-header">
            <div>
              <h2 class="text-h5 font-weight-semibold mb-1">Template &amp; Asset Yönetimi</h2>
              <p class="text-body-2 text-medium-emphasis mb-0">
                Şablon kütüphanesi, asset galerisi ve kural editörü.
              </p>
            </div>
            <VChip color="primary" variant="tonal">Templates</VChip>
          </header>
          <VRow>
            <VCol cols="12" lg="4">
              <VCard rounded="xl" elevation="2" class="pa-4 h-100">
                <div class="d-flex justify-space-between align-center mb-3">
                  <h3 class="text-subtitle-1 font-weight-semibold mb-0">Şablon kütüphanesi</h3>
                  <VBtn variant="outlined" size="small" prepend-icon="tabler-plus">Yeni</VBtn>
                </div>
                <VDataTable
                  density="compact"
                  hide-default-footer
                  :headers="[
                    { title: 'Şablon', key: 'title' },
                    { title: 'Segment', key: 'segment' },
                  ]"
                  :items="[
                    { title: 'Holiday Promo', segment: 'Seasonal' },
                    { title: 'Logo Pack', segment: 'Corporate' },
                    { title: 'Summer Drop', segment: 'Retail' },
                  ]"
                />
              </VCard>
            </VCol>
            <VCol cols="12" lg="4">
              <VCard rounded="xl" elevation="2" class="pa-4 h-100">
                <h3 class="text-subtitle-1 font-weight-semibold mb-2">Asset galerisi</h3>
                <div class="asset-grid">
                  <VSheet class="asset-thumb elevation-1">
                    <VIcon icon="tabler-photo" size="24" />
                    <span>Logo-main.png</span>
                  </VSheet>
                  <VSheet class="asset-thumb elevation-1">
                    <VIcon icon="tabler-photo" size="24" />
                    <span>Pattern-wave.svg</span>
                  </VSheet>
                  <VSheet class="asset-thumb elevation-1">
                    <VIcon icon="tabler-photo" size="24" />
                    <span>Badge-01.ai</span>
                  </VSheet>
                </div>
                <div class="d-flex justify-end mt-4">
                  <VBtn variant="outlined" prepend-icon="tabler-upload">Asset yükle</VBtn>
                </div>
              </VCard>
            </VCol>
            <VCol cols="12" lg="4">
              <VCard rounded="xl" elevation="2" class="pa-4 h-100">
                <h3 class="text-subtitle-1 font-weight-semibold mb-2">Kural editörü</h3>
                <p class="text-body-2 text-medium-emphasis mb-3">
                  Şablonlardaki kişiselleştirilebilir alanların kısıtlarını tanımlayın.
                </p>
                <VTextarea
                  label="Kural JSON"
                  rows="6"
                  placeholder='{ "field": "name", "required": true, "maxLength": 25 }'
                />
                <div class="d-flex justify-end mt-3">
                  <VBtn color="primary" append-icon="tabler-device-floppy">Kural kaydet</VBtn>
                </div>
              </VCard>
            </VCol>
          </VRow>
        </section>

        <section id="branding" class="workspace-section">
          <header class="section-header">
            <div>
              <h2 class="text-h5 font-weight-semibold mb-1">Marka &amp; Özelleştirme</h2>
              <p class="text-body-2 text-medium-emphasis mb-0">
                Logo &amp; renk yükleme, font seçici ve tema konfigürasyonu.
              </p>
            </div>
            <VChip color="primary" variant="tonal">Brand</VChip>
          </header>
          <VRow>
            <VCol cols="12" lg="4">
              <VCard rounded="xl" elevation="2" class="pa-4 h-100">
                <h3 class="text-subtitle-1 font-weight-semibold mb-2">Logo / Renk yükleme</h3>
                <VFileInput label="Logo dosyası" accept="image/*" prepend-icon="tabler-upload" class="mb-3" />
                <VColorPicker hide-canvas mode="rgba" class="bordered" />
                <VList density="compact" class="mt-4">
                  <VListItem title="Ana renk" subtitle="#4C1D95" />
                  <VListItem title="İkincil renk" subtitle="#14B8A6" />
                </VList>
              </VCard>
            </VCol>
            <VCol cols="12" lg="4">
              <VCard rounded="xl" elevation="2" class="pa-4 h-100">
                <h3 class="text-subtitle-1 font-weight-semibold mb-2">Font seçici</h3>
                <VSelect
                  label="Başlık fontu"
                  :items="['Inter', 'Roboto', 'Montserrat', 'Poppins']"
                  density="compact"
                  class="mb-3"
                />
                <VSelect
                  label="Gövde fontu"
                  :items="['Inter', 'Roboto', 'Montserrat', 'Poppins']"
                  density="compact"
                />
                <VDivider class="my-4" />
                <div class="font-preview">
                  <h4 class="mb-1">Font preview</h4>
                  <p class="text-body-2 text-medium-emphasis mb-0">
                    The quick brown fox jumps over the lazy dog. 0123456789
                  </p>
                </div>
              </VCard>
            </VCol>
            <VCol cols="12" lg="4">
              <VCard rounded="xl" elevation="2" class="pa-4 h-100">
                <h3 class="text-subtitle-1 font-weight-semibold mb-2">Tema konfigürasyonu</h3>
                <VTextField label="Buton metni" value="Edit design" class="mb-3" />
                <VSelect
                  label="Buton stili"
                  :items="['Pill', 'Rounded', 'Square']"
                  density="compact"
                  class="mb-3"
                />
                <VSelect
                  label="Açılış modu"
                  :items="['Yeni sekme', 'Pop-up', 'Aynı sekme']"
                  density="compact"
                  class="mb-4"
                />
                <div class="d-flex justify-end">
                  <VBtn color="primary" append-icon="tabler-device-floppy">Tema kaydet</VBtn>
                </div>
              </VCard>
            </VCol>
          </VRow>
        </section>

        <section id="shopify-integration" class="workspace-section">
          <header class="section-header">
            <div>
              <h2 class="text-h5 font-weight-semibold mb-1">Shopify Entegrasyonu</h2>
              <p class="text-body-2 text-medium-emphasis mb-0">
                Ürün içe aktarma, webhook ayarları ve variant-surface eşleme tabloları.
              </p>
            </div>
            <VChip color="primary" variant="tonal">Integration</VChip>
          </header>
          <VRow>
            <VCol cols="12" lg="4">
              <VCard rounded="xl" elevation="2" class="pa-4 h-100">
                <h3 class="text-subtitle-1 font-weight-semibold mb-2">Ürün içe aktarma ekranı</h3>
                <p class="text-body-2 text-medium-emphasis mb-3">
                  Shopify ürünlerini çekin, metafield şablonlarıyla yüzey eşlemesini doğrulayın.
                </p>
                <VBtn color="primary" prepend-icon="tabler-cloud-download">Ürünleri çek</VBtn>
                <VList density="compact" class="mt-4">
                  <VListItem title="Son senkron" subtitle="26 Ekim 2025 14:25" />
                  <VListItem title="Eşleşmemiş ürün" subtitle="5 ürün bekliyor" />
                  <VListItem title="Metafield durumu" subtitle="surface.safe_zone hazır" />
                </VList>
              </VCard>
            </VCol>
            <VCol cols="12" lg="4">
              <VCard rounded="xl" elevation="2" class="pa-4 h-100">
                <h3 class="text-subtitle-1 font-weight-semibold mb-2">Webhook ayarları</h3>
                <p class="text-body-2 text-medium-emphasis mb-3">
                  orders/create, products/update ve variants/update için dinleyicileri test edin.
                </p>
                <VDataTable
                  density="compact"
                  hide-default-footer
                  :headers="[
                    { title: 'Topic', key: 'topic' },
                    { title: 'Endpoint', key: 'endpoint' },
                    { title: 'Durum', key: 'status' },
                  ]"
                  :items="[
                    { topic: 'orders/create', endpoint: '/api/webhooks/orders', status: 'OK' },
                    { topic: 'products/update', endpoint: '/api/webhooks/products', status: 'OK' },
                    { topic: 'variants/update', endpoint: '/api/webhooks/variants', status: 'Timeout' },
                  ]"
                >
                  <template #item.status="{ value }">
                    <VChip size="x-small" :color="value === 'OK' ? 'success' : 'error'" variant="tonal">
                      {{ value }}
                    </VChip>
                  </template>
                </VDataTable>
                <div class="d-flex justify-end mt-3">
                  <VBtn variant="text" color="primary" prepend-icon="tabler-refresh">Sağlık testi</VBtn>
                </div>
              </VCard>
            </VCol>
            <VCol cols="12" lg="4">
              <VCard rounded="xl" elevation="2" class="pa-4 h-100">
                <h3 class="text-subtitle-1 font-weight-semibold mb-2">Eşleme tabloları</h3>
                <VSelect
                  label="Shopify ürün seçin"
                  :items="['Classic Tee', 'Hoodie', 'Mug', 'Poster']"
                  density="compact"
                  class="mb-3"
                />
                <VList density="compact" class="mapping-list">
                  <VListItem title="Variant: White / M">
                    <template #append>
                      <VChip size="x-small" variant="tonal">tshirt-front</VChip>
                    </template>
                  </VListItem>
                  <VListItem title="Variant: Black / XL">
                    <template #append>
                      <VChip size="x-small" variant="tonal">tshirt-back</VChip>
                    </template>
                  </VListItem>
                  <VListItem title="Variant: Blue / L">
                    <template #append>
                      <VChip size="x-small" variant="tonal">pocket-dtf</VChip>
                    </template>
                  </VListItem>
                </VList>
                <div class="d-flex gap-2 justify-end mt-3">
                  <VBtn variant="text" color="primary">Yeni yüzey ata</VBtn>
                  <VBtn color="primary" append-icon="tabler-device-floppy">Kaydet</VBtn>
                </div>
              </VCard>
            </VCol>
          </VRow>
        </section>
      </VCol>
    </VRow>
  </VContainer>
</template>

<style scoped>
.merchant-workspace {
  min-height: 100vh;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.04) 0%, rgba(15, 23, 42, 0) 55%);
}

.workspace-nav {
  background: rgba(var(--v-theme-surface), 1);
  border-right: 1px solid rgba(var(--v-theme-outline), 0.12);
  position: sticky;
  top: 0;
  min-height: 100vh;
}

.nav-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.side-links :deep(.v-list-item) {
  border-radius: 12px;
}

.side-links :deep(.v-list-item:hover) {
  background: rgba(var(--v-theme-primary), 0.08);
}

.workspace-body {
  padding: clamp(20px, 3vw, 36px);
  display: flex;
  flex-direction: column;
  gap: 48px;
}

.workspace-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.font-preview {
  border-radius: 12px;
  padding: 16px;
  background: rgba(var(--v-theme-outline), 0.05);
}

.asset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.asset-thumb {
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.mapping-list :deep(.v-list-item) {
  border-radius: 10px;
  margin-bottom: 6px;
  background: rgba(var(--v-theme-outline), 0.06);
}

.barcode-preview {
  border-radius: 12px;
  padding: 16px;
  border: 1px dashed rgba(var(--v-theme-outline), 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-family: "Roboto Mono", monospace;
}

.bordered :deep(.v-color-picker) {
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-outline), 0.12);
}
</style>
