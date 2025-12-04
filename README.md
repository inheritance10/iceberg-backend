# Iceberg Backend

Emlak danışmanlık şirketi için işlem takip ve komisyon dağıtım sistemi. Bu sistem, mülk satış ve kiralama işlemlerinin yaşam döngüsünü takip eder, otomatik komisyon hesaplaması yapar ve detaylı audit logging sağlar.
Grafana ve loki ile birlikte alertler kullanılarak kritik işlemlerin raporlanmasını yönetir.

## Özellikler

- İşlem yaşam döngüsü yönetimi (Agreement → Earnest Money → Title Deed → Completed) (Anlaşma yapıldı -> Kapora Ödendi -> Tapu işlemleri tamamlandı -> işlem tamamlandı)

- Otomatik komisyon hesaplama ve dağıtım
- Acente yönetimi
- Soft delete desteği(Tüm kayıtlar tamamen silinmiyor.Geri dönülmek istendiğinde bu verilere ulaşabiliyoruz.Herhangi aksi bir durumda elimizde kanıtlı veriler mevcut olmuş oluyor.)
- Kapsamlı audit logging (Burada sistemde kim,ne, ne zaman yaptı bilgilerini tutmuş oluyor.Ve kritik durumlarda olay örgüsü takibini kaydetmiş oluyoruz.Bu şekilde herhangi veri tutarsızlığı veya yanlış bir işlemin nasıl gerçekleşltiğine dair bilgileri edinmiş oluyoruz.)

- Grafana Loki entegrasyonu ile log monitoring (Alert ve dashboard sistemleriyle gerçekleşen işlemlerin kritik seviyelerini ölçmüş oluyoruz.Yüksek miktarda para akışı veya stage geçişlerinde bir anormallik durumlarında alert tetikleyip rapolarlama sunma şansı elde etmiş oluyoruz.Büyük projelerde elastic search gibi entegrasyonlar eklenebilir.)

- Swagger API dokümantasyonu
- Unit, integration ve E2E testler

## Teknoloji Yığını

- **Framework**: NestJS 11
- **Language**: TypeScript
- **Database**: MongoDB Atlas (Mongoose ODM)
- **Logging**: Winston + Grafana Loki
- **Testing**: Jest
- **API Documentation**: Swagger/OpenAPI
- **Deployment**: Github Actions

## Gereksinimler

- Node.js 20+ (LTS)
- npm veya yarn
- MongoDB Atlas hesabı
- Docker ve Docker Compose

## Kurulum

### 1. Projeyi Klonla

```bash
git clone <repository-url>
cd iceberg-backend
```

### 2. Bağımlılıkları Yükle

```bash
npm install
```

### 3. Environment Variables Ayarla

Proje root dizininde `.env` dosyası oluştur:

```env
# Database Configuration
# Railway için DATABASE_URI, lokal için MONGODB_URI kullanılabilir
DATABASE_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
# veya
MONGODB_URI=mongodb://localhost:27017/iceberg

# Server Configuration
PORT=3000
NODE_ENV=development

# Loki Configuration (Opsiyonel)
LOKI_ENABLED=false
LOKI_HOST=http://localhost:3100
APP_NAME=iceberg-backend
```

### MongoDB Atlas Kurulumu

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) hesabı oluştur
2. Yeni cluster oluştur (Free tier yeterli)
3. Database Access'te kullanıcı oluştur (username/password)
4. Network Access'te IP whitelist ekle (0.0.0.0/0 development için)
5. Cluster'a tıkla → Connect → Connect your application
6. Connection string'i kopyala ve `.env` dosyasına `DATABASE_URI` veya `MONGODB_URI` olarak ekle

## Çalıştırma

### Development Mode

```bash
npm run start:dev
```

Uygulama `http://localhost:3000` adresinde çalışacak.

### Production Mode

```bash
# Build
npm run build

# Start
npm run start:prod
```

### Docker ile Çalıştırma

Tüm servisleri (Backend + Loki + Grafana) başlatmak için:

```bash
docker-compose up -d
```

Sadece backend'i başlatmak için:

```bash
docker-compose up -d backend
```

Logları izlemek için:

```bash
docker-compose logs -f backend
```

Servisleri durdurmak için:

```bash
docker-compose down
```

## Testler

### Tüm Testleri Çalıştır

```bash
npm run test:all
```

### Unit Testler

```bash
npm run test:unit
```

### Integration Testler

```bash
npm run test:integration
```

### E2E Testler

```bash
npm run test:e2e
```

### Test Coverage

```bash
npm run test:cov
```

## API Dokümantasyonu

Uygulama çalıştıktan sonra Swagger dokümantasyonuna erişebilirsin:

```
http://localhost:3000/api
```

## API Endpoints

### Health Check

```
GET /health
```

### Agents

```
POST   /agents          # Yeni acente oluştur
GET    /agents          # Acenteleri listele
GET    /agents/:id      # Acente detayı
PATCH  /agents/:id     # Acente güncelle
DELETE /agents/:id     # Acente sil (soft delete)
```

### Transactions

```
POST   /transactions                    # Yeni işlem oluştur
GET    /transactions                    # İşlemleri listele (filtreleme, sayfalama)
GET    /transactions/:id                # İşlem detayı
PATCH  /transactions/:id                # İşlem güncelle
PATCH  /transactions/:id/stage          # İşlem aşaması güncelle
DELETE /transactions/:id               # İşlem sil (soft delete)
```

### Simulation

```
POST   /simulation/run                 # Tek bir simülasyon senaryosu çalıştır
POST   /simulation/run-all              # Tüm simülasyon senaryolarını çalıştır
GET    /simulation/report               # Simülasyon raporu
```

## Deployment

Proje, GitHub Actions ile CI/CD pipeline'ı kullanarak otomatik olarak test edilir, Docker image'ı oluşturulur ve Railway'a deploy edilir.

### CI/CD Pipeline Yapısı

Proje iki farklı branch için ayrı CI/CD pipeline'larına sahiptir:

#### 1. Development Branch Pipeline (`development`)

**Tetiklenme:**
- `development` branch'ine push yapıldığında
- `development` branch'ine pull request açıldığında

**Aşamalar:**

1. **Test Job**
   - Kod checkout edilir
   - Node.js 20^ kurulur
   - Bağımlılıklar yüklenir (`npm ci`)
   - Linter çalıştırılır (test dosyaları hariç)
   - Unit testler çalıştırılır
   - Integration testler çalıştırılır
   - Test coverage raporu oluşturulur
   - Coverage raporu Codecov'a yüklenir

2. **Build Job** (Sadece push için)
   - Docker Buildx kurulur
   - GitHub Container Registry (GHCR) girişi yapılır
   - Docker image metadata'sı çıkarılır (tag'ler: `development`, `dev-<sha>`)
   - Multi-stage Docker image build edilir
   - Image GHCR'ye push edilir: `ghcr.io/inheritance10/iceberg-backend:development`

3. **Notify Job**
   - Pipeline başarısız olursa bildirim gönderilir

#### 2. Production Branch Pipeline (`main`)

**Tetiklenme:**
- `main` branch'ine push yapıldığında
- `main` branch'ine pull request açıldığında

**Aşamalar:**

1. **Test Job**
   - Kod checkout edilir
   - Node.js 20 kurulur
   - Bağımlılıklar yüklenir (`npm ci`)
   - Linter çalıştırılır (test dosyaları hariç)
   - Unit testler çalıştırılır
   - Integration testler çalıştırılır
   - E2E testler çalıştırılır
   - Test coverage raporu oluşturulur
   - Coverage raporu Codecov'a yüklenir
   - Coverage threshold kontrolü yapılır

2. **Build Job** (Sadece push için)
   - Docker Buildx kurulur
   - GitHub Container Registry (GHCR) girişi yapılır
   - Docker image metadata'sı çıkarılır (tag'ler: `latest`, `prod-<sha>`, semver tag'leri)
   - Multi-stage Docker image build edilir
   - Image GHCR'ye push edilir: `ghcr.io/inheritance10/iceberg-backend:latest`

3. **Security Scan Job** (Sadece push için) Devsecops işlemlerini dahil edip kod ve sistem güvenliğini analiz ediyoruz.
   - Trivy vulnerability scanner çalıştırılır
   - Güvenlik açıkları taranır
   - Sonuçlar GitHub Security'a yüklenir

4. **Notify Job**
   - Pipeline başarılı/başarısız durumunda bildirim gönderilir

### Docker Build Süreci

Proje multi-stage Docker build kullanarak optimize edilmiş production image'ları oluşturur:

**Build Aşamaları:**

1. **Base Stage** (`node:20-alpine`)
   - Node.js 20 Alpine base image

2. **Dependencies Stage**
   - `package*.json` ve `tsconfig*.json` kopyalanır
   - `npm ci` ile production dependencies yüklenir

3. **Builder Stage**
   - Tüm kaynak kodlar kopyalanır
   - `npm run build` ile TypeScript derlenir
   - `dist/` klasörü oluşturulur

4. **Runner Stage** (Production)
   - Non-root user oluşturulur (`nestjs:nodejs`)
   - Sadece gerekli dosyalar kopyalanır:
     - `dist/` (derlenmiş kod)
     - `node_modules/` (production dependencies)
     - `package*.json`
   - Logs dizini oluşturulur
   - Health check tanımlanır
   - `node dist/main.js` ile uygulama başlatılır

**Docker Image Özellikleri:**
- Multi-stage build ile küçük image boyutu
- Non-root user ile güvenlik
- Health check desteği
- Production-ready optimizasyonlar

### Railway Deployment

Railway, GitHub Container Registry'den Docker image'ları çekerek otomatik deployment yapar.

#### Railway Kurulum Adımları

1. **Railway Projesi Oluşturma**
   - [Railway](https://railway.app) hesabı oluştur
   - Yeni proje oluştur
   - GitHub repository'yi bağla

2. **Service Oluşturma**
   - Yeni service ekle
   - "Deploy from GitHub Container Registry" seçeneğini seç
   - Image: `ghcr.io/inheritance10/iceberg-backend:latest` (production için)
   - Image: `ghcr.io/inheritance10/iceberg-backend:development` (development için)

3. **Environment Variables Ayarlama**

   **Production Environment:**
   ```env
   NODE_ENV=production
   PORT=3000
   DATABASE_URI=<mongodb-atlas-connection-string>
   LOKI_ENABLED=true
   LOKI_HOST=<loki-service-url>
   APP_NAME=iceberg-backend
   ```

   **Development Environment:**
   ```env
   NODE_ENV=development
   PORT=3000
   DATABASE_URI=<mongodb-atlas-connection-string>
   LOKI_ENABLED=true
   LOKI_HOST=<loki-service-url>
   APP_NAME=iceberg-backend
   ```

4. **Auto-Deploy Ayarları**
   - Settings → Source → Auto Deploy: **Enabled**
   - Branch: `main` (production için) veya `development` (development için)
   - Railway, ilgili branch'e push yapıldığında otomatik olarak yeni image'ı çeker ve deploy eder

5. **Networking Ayarları**
   - Service → Settings → Networking
   - Generate Domain: Railway otomatik domain oluşturur
   - Custom Domain: İsteğe bağlı custom domain eklenebilir

6. **Health Check**
   - Railway, Dockerfile'daki `HEALTHCHECK` komutunu kullanır
   - `/health` endpoint'i kontrol edilir
   - Sağlıksız container'lar otomatik olarak yeniden başlatılır

#### Deployment Akışı

**Development Branch:**
```
1. Developer → development branch'e push
2. GitHub Actions → Test job çalışır
3. GitHub Actions → Build job çalışır
4. Docker image → GHCR'ye push edilir (tag: development)
5. Railway → Yeni image'ı algılar
6. Railway → Container'ı yeniden başlatır
7. Deployment → Tamamlandı 
```

**Production Branch:**
```
1. Developer → main branch'e merge/push
2. GitHub Actions → Test job çalışır
3. GitHub Actions → Build job çalışır
4. GitHub Actions → Security scan job çalışır
5. Docker image → GHCR'ye push edilir (tag: latest)
6. Railway → Yeni image'ı algılar
7. Railway → Container'ı yeniden başlatır
8. Deployment → Tamamlandı 
```

### Canlı API URL'leri

**Production:**
- API: https://iceberg-backend-production.up.railway.app
- Swagger: https://iceberg-backend-production.up.railway.app/api
- Health Check: https://iceberg-backend-production.up.railway.app/health


### Deployment İzleme

- **GitHub Actions:** `.github/workflows/` klasöründeki workflow'ları izle
- **Railway Dashboard:** Deployment loglarını ve metrikleri görüntüle

## Proje Yapısı

```
src/
├── agents/              # Acente yönetimi modülü
├── transactions/        # İşlem yönetimi modülü
├── commissions/         # Komisyon hesaplama modülü
├── common/              # Ortak servisler, interceptors, filters
│   ├── services/       # AuditService, ValidationService, AlertingService
│   ├── interceptors/   # AuditInterceptor, TransformInterceptor
│   ├── filters/        # HttpExceptionFilter
│   └── logger/         # Winston ve Loki konfigürasyonları
├── config/             # Konfigürasyon modülleri
├── simulation/         # Sistem simülasyon modülü
└── main.ts             # Uygulama bootstrap
```

## Logging ve Monitoring

### Log Dosyaları

Loglar `logs/` dizininde saklanır:

- `combined-YYYY-MM-DD.log`: Tüm loglar
- `error-YYYY-MM-DD.log`: Sadece hatalar
- `audit-YYYY-MM-DD.log`: Audit logları

### Grafana Loki Entegrasyonu

Loki entegrasyonu aktifse, loglar Grafana Loki'ye gönderilir. Grafana dashboard'unda logları görüntüleyebilir ve alertler oluşturabiliyoruz.

Loki ve Grafana'yı başlatmak için:

```bash
docker-compose up -d loki grafana
```

Grafana: `http://localhost:3001` (admin/admin)

