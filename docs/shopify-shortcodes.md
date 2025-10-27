# Shopify Shortcode Integration Guide

Bu adımlar, Shopify ürün sayfasına "Edit design" butonunu ekleyip müşteriyi Gang Sheet Builder/DTF editörüne taşıyan akışı anlatır.

## 1. Merchant portalda shortcode üret

1. **Merchant → Shortcodes** sayfasına git.
2. Ürünü, varsa surface/teknik kombinasyonunu seç.
3. Handle (harf/rakam/kısa çizgi) girip **Generate** de.
4. Oluşan snippet’ı kopyala:

```html
<div data-gsb-shortcode="dtf-tshirt-front"></div>
```

## 2. Shopify temasına script’i ekle

`theme.liquid` veya Online Store > App embeds kısmında aşağıdaki script’i ekle. İsteğe göre veri öznitelikleriyle buton metni ve renklerini özelleştirebilirsin.

```liquid
<script
  src="https://your-app-domain.com/gsb-shortcode.js"
  data-editor-url="https://your-app-domain.com/editor"
  data-api-url="https://your-app-domain.com/api/embed/shortcodes"
  data-button-label="Edit design"
  data-button-class="btn btn-primary"
  data-button-bg="#4c1d95"
  data-button-color="#ffffff"
  data-open-mode="navigate"
  defer>
</script>
```

- `data-editor-url`: Barındırılan editor URL’i.
- `data-api-url`: Shortcode lookup endpoint’i (varsayılan `/api/embed/shortcodes`).
- `data-button-label`: Buton metni.
- `data-button-class`: Var olan tema buton sınıfını kullanmak için.
- `data-button-bg` & `data-button-color`: Inline stil vermek için (class yoksa).
- `data-open-mode="popup"` dersen editör yeni pencerede açılır.

## 3. Ürün şablonuna snippet’i yerleştir

Shopify tema düzenleyicisinde ürün şablonunu aç, istersen yerleşik **Add to cart** butonunu gizle ve snippet’i istediğin yere ekle.

```liquid
{% comment %} Varsayılan sepete ekle butonunu gizle {% endcomment %}
{% unless product.tags contains 'skip-cart' %}
  <!-- theme cart button here -->
{% endunless %}

<div data-gsb-shortcode="dtf-tshirt-front"></div>
```

Script, sayfa açıldığında API’den shortcode’u çözer ve hedef editöre yönlendiren **Edit design** butonunu oluşturur.

## 4. Checkout & line-item properties

Editor tarafında müşteri tasarımı kaydedince `/api/proxy/cart` çağrılır, tasarım `SUBMITTED` olur ve aşağıdaki gibi bir URL döner:

```
/cart/add?id={{variantId}}&quantity={{qty}}&properties[Design ID]={{designId}}&properties[Preview URL]={{preview}}
```

Bu URL’ye yönlendirme otomatik yapılır; böylece Shopify sepet satırına tasarım kimliği, teknik ve varsa preview URL’si property olarak eklenir. Ek işlem yapmadan sipariş detaylarından tasarıma geri bağlanabilirsin.

> Not: Önizleme verisi çok büyükse (data URL) query string’e eklenmez; ileride CDN linki üretmen önerilir.

## 5. Analytics & durum takibi

- Her shortcode container’ı `data-gsb-shortcode-status="loading|ready|error"` durumuna sahip. Tema içinde bu attribute’u dinleyerek loglama yapabilirsin.
- `/api/embed/shortcodes/:handle` çağrıları backend tarafında da loglanabilir.

Bu kurulumla mağaza müşterileri ürün sayfasından doğrudan editöre geçer, tasarım `designId` ile sepet satırına işlenir ve üretim ekibi sipariş geldiğinde mockup/preflight bilgilerine ulaşıp süreci başlatabilir.
