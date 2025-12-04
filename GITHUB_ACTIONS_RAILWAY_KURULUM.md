# GitHub Actions ve Railway CI/CD Kurulum Rehberi

Bu rehber, GitHub Actions ile CI/CD pipeline kurup Railway'de otomatik deployment yapmanızı sağlar.

---

## 📋 İçindekiler

1. [GitHub Actions Workflow'ları](#1-github-actions-workflowlari)
2. [Railway Deployment Ayarları](#2-railway-deployment-ayarlari)
3. [Environment Variables Yönetimi](#3-environment-variables-yönetimi)
4. [Branch Stratejisi](#4-branch-stratejisi)
5. [Test ve Doğrulama](#5-test-ve-doğrulama)

---

## 1. GitHub Actions Workflow'ları

### Oluşturulan Workflow'lar

1. **`.github/workflows/development.yml`** - Development branch için
2. **`.github/workflows/production.yml`** - Main branch için

### Development Workflow (development branch)

**Ne zaman çalışır:**
- `development` branch'ine push yapıldığında
- `development` branch'ine PR açıldığında

**Yapılan işlemler:**
1. ✅ Test çalıştırma (unit, integration)
2. ✅ Lint kontrolü
3. ✅ Coverage raporu
4. ✅ Docker image build ve push (GitHub Container Registry)

### Production Workflow (main branch)

**Ne zaman çalışır:**
- `main` branch'ine push yapıldığında
- `main` branch'ine PR açıldığında

**Yapılan işlemler:**
1. ✅ Test çalıştırma (unit, integration, e2e)
2. ✅ Lint kontrolü
3. ✅ Coverage raporu
4. ✅ Docker image build ve push (GitHub Container Registry)
5. ✅ Security scan (Trivy)

---

## 2. Railway Deployment Ayarları

### Adım 1: Railway'de GitHub Bağlantısı

1. **Railway Dashboard'a Git:**
   - https://railway.app adresine git
   - Projenize tıklayın

2. **Settings → Source:**
   - **"Connect GitHub"** veya **"Deploy from GitHub repo"** seçin
   - GitHub repo'nuzu seçin
   - **⚠️ ÖNEMLİ:** **Branch:** `main` seçin (production için)
   - Railway otomatik olarak `main` branch'ine bakacak

3. **Settings → Build:**
   - **Build Command:** (boş bırakın, Dockerfile kullanılacak)
   - **Start Command:** `node dist/main.js`
   - **Dockerfile Path:** `Dockerfile` (veya `iceberg-backend/Dockerfile` eğer root'ta değilse)

4. **Settings → Deploy:**
   - **Auto Deploy:** `Enabled` (otomatik deploy)
   - **Deploy on Push:** `Enabled` (push yapıldığında otomatik deploy)
   - Railway `main` branch'ine push yapıldığında otomatik deploy edecek

### Adım 2: Railway Environment Variables

Railway'de environment variables'ları ayarlayın:

#### Production Environment (Main Branch)

1. **Railway → Projeniz → Backend Servisi → Variables:**
   ```
   NODE_ENV=production
   DATABASE_URI=your-production-mongodb-uri
   MONGODB_URI=your-production-mongodb-uri
   LOKI_ENABLED=true
   LOKI_HOST=https://logs-prod-xxx.grafana.net/loki/api/v1/push
   LOKI_API_KEY=your-loki-api-key
   APP_NAME=iceberg-backend
   PORT=3000
   ```

2. **Variables Ekleme:**
   - **"+ New Variable"** butonuna tıklayın
   - Her variable için ayrı ayrı ekleyin
   - **Tırnak işareti kullanmayın!**
   - Railway otomatik olarak `PORT` variable'ını set eder (eklemeye gerek yok)

#### Development Environment (Opsiyonel - Development Branch için)

Eğer development branch için ayrı bir Railway servisi istiyorsanız:

1. **Yeni Service Oluştur:**
   - Railway → Projeniz → **"+ New"** → **"Empty Service"**
   - Servis adı: `iceberg-backend-dev`

2. **GitHub Bağla:**
   - **Settings → Source** → **"Deploy from GitHub repo"**
   - **Branch:** `development` seçin

3. **Environment Variables:**
   ```
   NODE_ENV=development
   DATABASE_URI=your-development-mongodb-uri
   MONGODB_URI=your-development-mongodb-uri
   LOKI_ENABLED=true
   LOKI_HOST=https://logs-prod-xxx.grafana.net/loki/api/v1/push
   LOKI_API_KEY=your-loki-api-key
   APP_NAME=iceberg-backend-dev
   PORT=3000
   ```

### Adım 3: Railway Branch Ayarları (Önemli!)

**Railway'de branch ayarları:**

1. **Settings → Source:**
   - **Branch:** `main` seçili olmalı
   - Railway sadece `main` branch'ine bakacak
   - `development` branch için ayrı servis oluşturmak isterseniz (opsiyonel):
     - Yeni servis oluşturun
     - Branch: `development` seçin

2. **Settings → Deploy:**
   - **Auto Deploy:** `Enabled`
   - **Deploy on Push:** `Enabled`
   - Railway `main` branch'ine push yapıldığında otomatik deploy eder

**⚠️ ÖNEMLİ:**
- Railway varsayılan olarak `main` branch'ine bakar
- `main` branch'ine push yapıldığında otomatik deploy eder
- GitHub Actions ile birlikte çalışır:
  - GitHub Actions: Test, Build, Docker image push
  - Railway: Otomatik deploy (main branch'ten)

---

## 3. Environment Variables Yönetimi

### GitHub Secrets (Opsiyonel)

Eğer GitHub Actions'ta Railway'e deploy etmek istiyorsanız (Railway otomatik deploy ediyor, gerek yok):

1. **GitHub → Repository → Settings → Secrets and variables → Actions:**
   - `RAILWAY_TOKEN` - Railway API token (opsiyonel)
   - `RAILWAY_SERVICE_ID` - Railway service ID (opsiyonel)

### Railway Environment Variables

Railway'de environment variables'ları direkt ayarlayın (GitHub Secrets'a gerek yok):

1. **Railway → Projeniz → Variables:**
   - Production için variables ekleyin
   - Development için (eğer ayrı servis varsa) variables ekleyin

---

## 4. Branch Stratejisi

### Development Branch

```
development
  ├── Feature branches
  │   ├── feature/agent-management
  │   ├── feature/transaction-tracking
  │   └── ...
  └── Hotfix branches
      └── hotfix/critical-bug
```

**Workflow:**
1. Feature branch oluştur: `git checkout -b feature/new-feature`
2. Değişiklikleri yap ve commit et
3. `development` branch'ine merge et
4. GitHub Actions test çalıştırır
5. Test başarılıysa Docker image build edilir

### Main Branch (Production)

```
main
  └── (sadece development'ten merge)
```

**Workflow:**
1. `development` branch'inde test edilmiş kod
2. `main` branch'ine merge et (PR ile)
3. GitHub Actions test çalıştırır
4. Test başarılıysa Docker image build edilir
5. Railway otomatik olarak deploy eder

---

## 5. Test ve Doğrulama

### Adım 1: Development Branch Test

1. **Development Branch'e Push:**
   ```bash
   git checkout development
   git add .
   git commit -m "feat: new feature"
   git push origin development
   ```

2. **GitHub Actions Kontrol:**
   - GitHub → Repository → **"Actions"** sekmesine git
   - **"Development CI/CD"** workflow'unu kontrol et
   - Test'ler çalışmalı
   - Build başarılı olmalı

3. **Docker Image Kontrol:**
   - GitHub → Repository → **"Packages"** sekmesine git
   - Docker image görünmeli: `ghcr.io/your-username/your-repo:development`

### Adım 2: Main Branch Test

1. **Main Branch'e Merge:**
   ```bash
   git checkout main
   git merge development
   git push origin main
   ```

2. **GitHub Actions Kontrol:**
   - GitHub → Repository → **"Actions"** sekmesine git
   - **"Production CI/CD"** workflow'unu kontrol et
   - Test'ler çalışmalı
   - Build başarılı olmalı
   - Security scan çalışmalı

3. **Railway Deployment Kontrol:**
   - Railway dashboard → Projeniz → Backend Servisi → **"Deployments"** sekmesine git
   - Yeni deployment görünmeli
   - Deployment durumu: **"Active"** olmalı
   - Deployment log'larını kontrol et

4. **Production URL Kontrol:**
   - Backend domain'inize gidin: `https://iceberg-backend-production.up.railway.app/health`
   - `{"status":"ok"}` dönmeli
   - Swagger: `https://iceberg-backend-production.up.railway.app/api`

5. **Railway Logs Kontrol:**
   - Railway → Backend Servisi → **"Logs"** sekmesine git
   - "Application is running on" mesajını görmelisiniz
   - Hata var mı kontrol et

---

## ✅ Kontrol Listesi

### GitHub Actions

- [ ] `.github/workflows/development.yml` oluşturuldu
- [ ] `.github/workflows/production.yml` oluşturuldu
- [ ] Development branch'e push yapıldı, workflow çalıştı
- [ ] Main branch'e push yapıldı, workflow çalıştı
- [ ] Test'ler başarılı
- [ ] Docker image'lar build edildi

### Railway

- [ ] Railway'de GitHub repo bağlandı
- [ ] Main branch seçildi
- [ ] Environment variables eklendi
- [ ] Auto-deploy aktif
- [ ] Production deployment başarılı
- [ ] Health check çalışıyor

---

## 🔧 Troubleshooting

### Problem: GitHub Actions workflow çalışmıyor

**Çözüm:**
1. GitHub → Repository → **"Actions"** sekmesine git
2. Workflow'un **"Enable"** olduğundan emin ol
3. Workflow log'larını kontrol et
4. YAML syntax hatası var mı kontrol et

### Problem: Railway otomatik deploy etmiyor

**Çözüm:**
1. Railway → Settings → Source
2. GitHub repo bağlı mı kontrol et
3. Branch `main` seçili mi kontrol et
4. Auto-deploy aktif mi kontrol et

### Problem: Test'ler başarısız

**Çözüm:**
1. Lokal olarak test çalıştır: `npm run test:all`
2. Test log'larını kontrol et
3. Environment variables eksik olabilir (test için)

### Problem: Docker build başarısız

**Çözüm:**
1. Lokal olarak build et: `docker build -t test .`
2. Dockerfile syntax hatası var mı kontrol et
3. GitHub Actions log'larını kontrol et

---

## 📊 Workflow Özeti

### Development Branch Flow

```
development branch push
  ↓
GitHub Actions: Test
  ↓
GitHub Actions: Build Docker Image
  ↓
GitHub Container Registry: Image Push
  ↓
(Development Railway servisi varsa otomatik deploy)
```

### Production Branch Flow

```
main branch push
  ↓
GitHub Actions: Test (unit, integration, e2e)
  ↓
GitHub Actions: Build Docker Image
  ↓
GitHub Actions: Security Scan
  ↓
GitHub Container Registry: Image Push
  ↓
Railway: Otomatik Deploy
  ↓
Production: Live!
```

---

## 🎯 Sonraki Adımlar

1. **GitHub Actions workflow'larını test edin**
2. **Railway'de branch ayarlarını yapın**
3. **Environment variables'ları ayarlayın**
4. **Development branch'e push yapın ve test edin**
5. **Main branch'e merge edin ve production'ı test edin**

---

**Sorularınız için:**
- GitHub Actions Docs: https://docs.github.com/en/actions
- Railway Docs: https://docs.railway.app/

