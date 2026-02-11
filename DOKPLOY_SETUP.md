# Dokploy Deployment Guide

Bu döküman, Gold Portfolio Tracker uygulamasının Dokploy'a deployment edilmesi için gerekli adımları açıklar.

---

## 📋 Genel Bakış

**Dokploy Deployment Stratejisi:**
- ✅ **Backend**: Dokploy'a deploy edilecek (Node.js service)
- ✅ **Frontend**: Dokploy'a deploy edilecek (Static site / Docker)
- ✅ **Database**: Production için ayrı PostgreSQL (Dokploy managed veya external)
- ✅ **Environment Variables**: Dokploy üzerinden yönetilecek

**Local vs Production:**
- **Local**: Kendi makinenizde, local PostgreSQL, local OAuth client
- **Production**: Dokploy'da, production PostgreSQL, production OAuth client

---

## 🗄️ Database Ayarları

### Local Database (Zaten Var)

Local development için Docker ile PostgreSQL çalıştırıyorsunuz:

```bash
# docker-compose.dev.yml ile başlatıyorsunuz
docker-compose -f docker-compose.dev.yml up -d
```

**Connection String:**
```
postgresql://postgres:postgres@localhost:5432/gold_wallet?schema=public
```

### Production Database (Dokploy)

İki seçeneğiniz var:

#### Seçenek 1: Dokploy Managed PostgreSQL (Önerilen)

1. Dokploy Dashboard → **Databases** → **Create Database**
2. **Database Type:** PostgreSQL
3. **Database Name:** `gold-wallet-production`
4. **Username:** `gold_user` (veya istediğiniz)
5. **Password:** Güçlü bir şifre oluşturun
6. **Create** butonuna tıklayın

Dokploy size bir connection string verecek:
```
postgresql://gold_user:STRONG_PASSWORD@dokploy-postgres-host:5432/gold-wallet-production
```

Bu connection string'i `.env.production` dosyasına ekleyin.

#### Seçenek 2: External PostgreSQL (Mevcut)

Şu anda `.env.production` dosyanızda zaten bir production database var:
```
postgresql://postgres:QhaMXpfsNAZkJ0SCnaxl@gram-kumbaram-gramkumbaramdb-xjiq2j:5432/postgres
```

Bu database'i kullanmaya devam edebilirsiniz. Sadece migration'ları çalıştırmayı unutmayın.

---

## 🚀 Backend Deployment (API)

### 1. Git Repository Hazırlayın

Backend kodunuzu Git'e push edin. **ÖNEMLİ:** `.env` dosyalarını **asla** Git'e eklemeyin!

```bash
cd c:\Users\PC\Desktop\Projects\physical-golden-wallet-backend

# .gitignore kontrolü
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore

git add .
git commit -m "feat: Add Dokploy deployment support"
git push origin main
```

### 2. Dokploy'da Backend Service Oluşturun

1. **Dokploy Dashboard** → **Create Service**
2. **Service Type:** Git Repository (veya Docker)
3. **Name:** `gold-wallet-backend`
4. **Repository:** GitHub/GitLab repository URL'inizi girin
5. **Branch:** `main` (veya production branch'iniz)
6. **Build Settings:**
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Port:** `4000`

### 3. Environment Variables (Backend)

Dokploy Dashboard → Service Settings → **Environment Variables**

Aşağıdaki değişkenleri **tek tek** ekleyin:

```env
# Database (Production)
DATABASE_URL=postgresql://postgres:QhaMXpfsNAZkJ0SCnaxl@gram-kumbaram-gramkumbaramdb-xjiq2j:5432/postgres

# JWT Secret (GÜÇLÜ BİR ŞİFRE OLUŞTURUN!)
JWT_SECRET=YOUR_SUPER_SECRET_PRODUCTION_JWT_KEY_MIN_32_CHARS

# Google OAuth (PRODUCTION Client)
GOOGLE_CLIENT_ID=916033303389-0lein9lm58v4n4m25jq7119d2q5el40e.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_CALLBACK_URL=https://api.gramkumbaram.com/auth/google/callback

# Server
PORT=4000
NODE_ENV=production

# Frontend URL (Production)
FRONTEND_URL=https://gramkumbaram.com
```

**ÖNEMLİ:** `JWT_SECRET` için güçlü bir şifre oluşturun:
```bash
# Güçlü JWT secret oluşturmak için
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Database Migration (Production)

Backend deploy edildikten sonra, production database'e migration çalıştırın:

#### Yöntem 1: Dokploy Terminal (Önerilen)

Dokploy Dashboard → Service → **Terminal** sekmesi:

```bash
npm run prisma:migrate:prod
```

#### Yöntem 2: Local'den Remote Database'e

Local makinenizden production database'e bağlanıp migration çalıştırın:

```bash
# .env dosyasını geçici olarak production database'e çevirin
# VEYA direkt komut satırında:
DATABASE_URL="postgresql://postgres:QhaMXpfsNAZkJ0SCnaxl@gram-kumbaram-gramkumbaramdb-xjiq2j:5432/postgres" npm run prisma:migrate:prod
```

### 5. Domain ve SSL Ayarları

Dokploy Dashboard → Service → **Domains**

1. **Add Domain:** `api.gramkumbaram.com`
2. **SSL:** Dokploy otomatik SSL sertifikası sağlar (Let's Encrypt)
3. **Save**

**DNS Ayarları** (Domain provider'ınızda):
```
A record: api.gramkumbaram.com → Dokploy sunucu IP'si
```

### 6. Health Check

Backend deploy edildikten sonra test edin:

```bash
curl https://api.gramkumbaram.com/health
```

Başarılı yanıt:
```json
{"status":"ok","message":"Gold Wallet API is running"}
```

---

## 🎨 Frontend Deployment

### 1. Git Repository Hazırlayın

Frontend kodunuzu Git'e push edin:

```bash
cd c:\Users\PC\Desktop\Projects\physical-golden-wallet-frontend

# .gitignore kontrolü
echo ".env.local" >> .gitignore
echo ".env.production.local" >> .gitignore
echo "out/" >> .gitignore

git add .
git commit -m "feat: Add Dokploy deployment support"
git push origin main
```

### 2. Dokploy'da Frontend Service Oluşturun

1. **Dokploy Dashboard** → **Create Service**
2. **Service Type:** Git Repository (veya Docker)
3. **Name:** `gold-wallet-frontend`
4. **Repository:** GitHub/GitLab repository URL'inizi girin
5. **Branch:** `main`
6. **Build Settings:**
   - **Build Command:** `npm run build`
   - **Serve:** Static files (Next.js export)
   - **Output Directory:** `out`

### 3. Environment Variables (Frontend)

Dokploy Dashboard → Service Settings → **Environment Variables**

```env
NEXT_PUBLIC_API_URL=https://api.gramkumbaram.com
```

**NOT:** Frontend environment variables build sırasında baked-in olur. Her değişiklikte yeniden build etmelisiniz.

### 4. Domain ve SSL Ayarları

Dokploy Dashboard → Service → **Domains**

1. **Add Domain:** `gramkumbaram.com` ve `www.gramkumbaram.com`
2. **SSL:** Dokploy otomatik SSL sertifikası sağlar
3. **Save**

**DNS Ayarları:**
```
A record: gramkumbaram.com → Dokploy sunucu IP'si
A record: www.gramkumbaram.com → Dokploy sunucu IP'si
```

### 5. Test Edin

Frontend'e gidin: https://gramkumbaram.com

Google ile giriş yapın ve production OAuth client'ın çalıştığını doğrulayın.

---

## 🔄 Deployment Workflow

### İlk Deployment

```bash
# 1. Backend Deploy
git push origin main
# Dokploy otomatik deploy eder

# 2. Database Migration (Dokploy Terminal'den)
npm run prisma:migrate:prod

# 3. Backend Test
curl https://api.gramkumbaram.com/health

# 4. Frontend Deploy
git push origin main
# Dokploy otomatik deploy eder

# 5. Frontend Test
# https://gramkumbaram.com adresine gidin
```

### Sonraki Deploymentlar

```bash
# Kod değişikliklerini push edin
git add .
git commit -m "feat: Add new feature"
git push origin main

# Dokploy otomatik deploy eder
# Database değişiklikleri varsa migration çalıştırın
```

---

## 🔒 Güvenlik Kontrol Listesi

### ✅ Yapılması Gerekenler

- [x] `.env` dosyaları Git'e **eklenmiş mi?** → `.gitignore`'da olmalı
- [x] Production `JWT_SECRET` güçlü mü? (min 32 karakter)
- [x] Production database şifresi güçlü mü?
- [x] SSL sertifikaları aktif mi? (HTTPS)
- [x] CORS ayarları doğru mu? (Backend'de `FRONTEND_URL` kontrolü)
- [x] OAuth redirect URLs production domain ile eşleşiyor mu?

### ⚠️ Yapılmaması Gerekenler

- ❌ `.env` dosyalarını Git'e commit etmeyin
- ❌ Local OAuth credentials'ları production'da kullanmayın
- ❌ Local database'i production'da kullanmayın
- ❌ `JWT_SECRET` olarak "secret" gibi basit değerler kullanmayın

---

## 🐛 Sorun Giderme

### Backend başlamıyor

**Kontrol edin:**
1. Environment variables doğru mu?
2. Database bağlantısı çalışıyor mu?
3. Migration'lar çalıştı mı?

**Logları kontrol edin:**
Dokploy Dashboard → Service → **Logs**

### Frontend API'ye bağlanamıyor

**Kontrol edin:**
1. `NEXT_PUBLIC_API_URL` doğru mu?
2. Backend çalışıyor mu? (`curl https://api.gramkumbaram.com/health`)
3. CORS ayarları doğru mu?

### OAuth redirect_uri_mismatch

**Kontrol edin:**
1. Google Console'da **Production OAuth Client** seçili mi?
2. Authorized redirect URIs: `https://api.gramkumbaram.com/auth/google/callback`
3. Authorized JavaScript origins: `https://api.gramkumbaram.com` ve `https://gramkumbaram.com`

---

## 📊 Monitoring ve Logs

### Backend Logs

Dokploy Dashboard → Backend Service → **Logs**

Hata ayıklama için faydalı:
```bash
# Error logs
grep -i "error" logs.txt

# OAuth logs
grep -i "oauth" logs.txt

# Database logs
grep -i "prisma" logs.txt
```

### Frontend Logs

Dokploy Dashboard → Frontend Service → **Logs**

---

## 🔄 Rollback (Geri Alma)

Bir deployment hata verirse:

1. Dokploy Dashboard → Service → **Deployments**
2. Önceki başarılı deployment'ı bulun
3. **Rollback** butonuna tıklayın

---

## 📚 Faydalı Komutlar

```bash
# Production database'e bağlan (Prisma Studio)
DATABASE_URL="postgresql://..." npm run prisma:studio

# Production migration durumunu kontrol et
DATABASE_URL="postgresql://..." npx prisma migrate status

# Production'da seed data ekle
DATABASE_URL="postgresql://..." npx prisma db seed

# Backend health check
curl https://api.gramkumbaram.com/health

# API dokumentasyonu
open https://api.gramkumbaram.com/api-docs
```

---

## 🎯 Özet Checklist

### Backend Deployment

- [ ] Git repository hazır
- [ ] Dokploy service oluşturuldu
- [ ] Environment variables eklendi
- [ ] Database migration çalıştırıldı
- [ ] Domain (api.gramkumbaram.com) ayarlandı
- [ ] SSL aktif
- [ ] Health check başarılı

### Frontend Deployment

- [ ] Git repository hazır
- [ ] Dokploy service oluşturuldu
- [ ] Environment variables eklendi (`NEXT_PUBLIC_API_URL`)
- [ ] Domain (gramkumbaram.com) ayarlandı
- [ ] SSL aktif
- [ ] Google OAuth test edildi

### Database

- [ ] Production database hazır
- [ ] Connection string doğru
- [ ] Migration'lar çalıştırıldı
- [ ] Seed data eklendi (opsiyonel)

### OAuth

- [ ] Production OAuth Client oluşturuldu
- [ ] Redirect URIs doğru (https://api.gramkumbaram.com/auth/google/callback)
- [ ] JavaScript origins doğru
- [ ] Test kullanıcısı ile test edildi

---

## 💡 İpuçları

1. **Staging Environment:** Mümkünse production'a geçmeden önce bir staging environment oluşturun
2. **Database Backups:** Production database'in düzenli yedeklerini alın
3. **Monitoring:** Uptime monitoring ekleyin (UptimeRobot, Pingdom, vb.)
4. **Error Tracking:** Sentry veya benzer bir error tracking tool ekleyin
5. **CI/CD:** GitHub Actions ile otomatik test ve deployment ekleyin

---

## 📞 Destek

Sorunlarla karşılaşırsanız:
- Dokploy documentation: https://docs.dokploy.com
- Backend logs: Dokploy Dashboard → Logs
- OAUTH_SETUP.md: OAuth ayarları için
- README.md: Genel proje dökümanları

---

Başarılı deploymentlar! 🚀
