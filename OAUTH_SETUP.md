# Google OAuth Setup Guide

Bu dokümantasyon, local ve production ortamları için Google OAuth ayarlarını yapmayı açıklar.

## Genel Bakış

**ÖNEMLİ:** Local ve production ortamları için **2 ayrı OAuth Client** oluşturmalısınız. Bu sayede:
- Local geliştirme sırasında production kullanıcıları etkilemezsiniz
- Her ortam kendi callback URL'lerini kullanır
- Güvenlik ve izolasyon sağlanır

---

## Adım 1: Google Cloud Console'a Giriş

1. [Google Cloud Console](https://console.cloud.google.com/) adresine gidin
2. Projenizi seçin veya yeni proje oluşturun (örn: "Gold Wallet")

---

## Adım 2: OAuth Consent Screen Ayarları

1. Sol menüden **APIs & Services** > **OAuth consent screen** seçin
2. **User Type** olarak **External** seçin (test kullanıcıları ekleyebilirsiniz)
3. Gerekli bilgileri doldurun:
   - **App name:** Gold Portfolio Tracker
   - **User support email:** [email adresiniz]
   - **Developer contact:** [email adresiniz]
4. **Scopes** kısmında şu scope'ları ekleyin:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
5. **Test users** kısmına test etmek istediğiniz Gmail hesaplarını ekleyin
6. Kaydedin

---

## Adım 3: Local Development için OAuth Client Oluşturma

### 3.1. Yeni Credentials Oluşturun

1. Sol menüden **APIs & Services** > **Credentials** seçin
2. **+ CREATE CREDENTIALS** > **OAuth 2.0 Client ID** tıklayın
3. **Application type:** Web application
4. **Name:** `Gold Wallet - Local Development`

### 3.2. Authorized JavaScript origins

```
http://localhost:4000
http://localhost:3000
```

### 3.3. Authorized redirect URIs

```
http://localhost:4000/auth/google/callback
```

### 3.4. Client ID ve Secret'i Kaydedin

Oluşturulduktan sonra gösterilen:
- **Client ID** → `.env.local` dosyasında `GOOGLE_CLIENT_ID` olarak kullanacaksınız
- **Client Secret** → `.env.local` dosyasında `GOOGLE_CLIENT_SECRET` olarak kullanacaksınız

**ÖNEMLİ:** Bu bilgileri güvenli bir yerde saklayın!

---

## Adım 4: Production için OAuth Client Oluşturma

### 4.1. Yeni Credentials Oluşturun

1. Tekrar **+ CREATE CREDENTIALS** > **OAuth 2.0 Client ID** tıklayın
2. **Application type:** Web application
3. **Name:** `Gold Wallet - Production`

### 4.2. Authorized JavaScript origins

```
https://api.gramkumbaram.com
https://gramkumbaram.com
```

### 4.3. Authorized redirect URIs

```
https://api.gramkumbaram.com/auth/google/callback
```

### 4.4. Client ID ve Secret'i Kaydedin

Oluşturulduktan sonra gösterilen:
- **Client ID** → `.env.production` dosyasında `GOOGLE_CLIENT_ID` olarak kullanacaksınız
- **Client Secret** → `.env.production` dosyasında `GOOGLE_CLIENT_SECRET` olarak kullanacaksınız

---

## Adım 5: Backend Environment Variables

### Local Development (`.env.local`)

```bash
# Database (Local)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gold_wallet?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# Google OAuth (LOCAL CLIENT)
GOOGLE_CLIENT_ID="[Adım 3.4'teki Local Client ID]"
GOOGLE_CLIENT_SECRET="[Adım 3.4'teki Local Client Secret]"
GOOGLE_CALLBACK_URL="http://localhost:4000/auth/google/callback"

# Server
PORT=4000
NODE_ENV=development

# Frontend URL (for CORS and redirects)
FRONTEND_URL="http://localhost:3000"
```

### Production (`.env.production`)

```bash
# Database (Production)
DATABASE_URL="postgresql://postgres:QhaMXpfsNAZkJ0SCnaxl@gram-kumbaram-gramkumbaramdb-xjiq2j:5432/postgres"

# JWT
JWT_SECRET="[GÜÇLÜ BİR ŞİFRE OLUŞTURUN - production için]"

# Google OAuth (PRODUCTION CLIENT)
GOOGLE_CLIENT_ID="[Adım 4.4'teki Production Client ID]"
GOOGLE_CLIENT_SECRET="[Adım 4.4'teki Production Client Secret]"
GOOGLE_CALLBACK_URL="https://api.gramkumbaram.com/auth/google/callback"

# Server
PORT=4000
NODE_ENV=production

# Frontend URL (for CORS and redirects)
FRONTEND_URL="https://gramkumbaram.com"
```

---

## Adım 6: Frontend Environment Variables

### Local Development (`.env.local`)

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Production (`.env.production`)

```bash
NEXT_PUBLIC_API_URL=https://api.gramkumbaram.com
```

---

## Çalıştırma Komutları

### Backend

```bash
# Local development
npm run dev

# Production build
npm run build
npm start
```

### Frontend

```bash
# Local development
npm run dev

# Production build
npm run build
```

---

## Sorun Giderme

### redirect_uri_mismatch Hatası

Bu hata, Google Console'da kayıtlı callback URL'lerin backend'in gönderdiği URL ile eşleşmediği anlamına gelir.

**Çözüm:**
1. Google Console'da doğru OAuth Client'ı seçtiğinizden emin olun (Local veya Production)
2. Authorized redirect URIs'de callback URL'in tam olarak eşleştiğinden emin olun
3. `http` vs `https` kontrolü yapın
4. Trailing slash (`/`) olmadığından emin olun

### Örnek:

❌ **Yanlış:** `http://localhost:4000/auth/google/callback/`
✅ **Doğru:** `http://localhost:4000/auth/google/callback`

---

## Güvenlik Notları

1. **`.env.local` ve `.env.production` dosyalarını asla Git'e eklemeyin**
   - Bu dosyalar `.gitignore`'da olmalı

2. **Production JWT_SECRET'i güçlü tutun**
   - En az 32 karakter
   - Rastgele karakterler, sayılar, semboller

3. **Test kullanıcıları ekleyin**
   - OAuth Consent Screen'de test kullanıcıları ekleyerek sadece belirtilen kullanıcıların giriş yapmasını sağlayabilirsiniz

4. **Client Secret'ları güvende tutun**
   - Kimseyle paylaşmayın
   - Sızdığından şüpheleniyorsanız Google Console'dan yenileyin

---

## Özet

✅ Local ve Production için **2 ayrı OAuth Client** oluşturdunuz
✅ Her ortam için **ayrı callback URL'leri** tanımladınız
✅ Backend ve Frontend için **environment variables** ayarladınız
✅ Artık local geliştirme production'ı **etkilemeyecek**

Sorularınız için: [GitHub Issues](https://github.com/your-repo/issues)
