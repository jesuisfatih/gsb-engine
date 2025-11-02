#!/bin/bash
# Yeni Shopify Store için .env güncellemesi

# Sunucuya SSH ile bağlan
ssh root@46.224.20.228 -i "C:\Users\mhmmd\.ssh\id_ed25519" << 'ENDSSH'

cd /srv/gsb/api

# Backup oluştur
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# YENİ STORE BİLGİLERİNİ GİRİN:
NEW_STORE_DOMAIN="your-new-store.myshopify.com"  # ← DEĞİŞTİRİN!
NEW_STORE_SLUG="your-new-store"                  # ← DEĞİŞTİRİN!

# .env dosyasını güncelle
sed -i "s/SHOPIFY_STORE_DOMAIN=.*/SHOPIFY_STORE_DOMAIN=$NEW_STORE_DOMAIN/" .env
sed -i "s/SHOPIFY_DEFAULT_TENANT_SLUG=.*/SHOPIFY_DEFAULT_TENANT_SLUG=$NEW_STORE_SLUG/" .env

echo "✅ .env updated:"
grep "SHOPIFY_STORE_DOMAIN" .env
grep "SHOPIFY_DEFAULT_TENANT_SLUG" .env

# Backend restart
docker compose restart app

echo "✅ Backend restarted!"
sleep 10

# Health check
curl -s http://localhost:4000/api/health

ENDSSH

