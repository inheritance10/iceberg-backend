# Iceberg Backend

Emlak danışmanlık şirketi için işlem takip ve komisyon dağıtım sistemi. Bu sistem, mülk satış ve kiralama işlemlerinin yaşam döngüsünü takip eder, otomatik komisyon hesaplaması yapar ve detaylı audit logging sağlar.

## Özellikler

- İşlem yaşam döngüsü yönetimi (Agreement → Earnest Money → Title Deed → Completed)
- Otomatik komisyon hesaplama ve dağıtım
- Acente yönetimi
- Soft delete desteği
- Kapsamlı audit logging
- Grafana Loki entegrasyonu ile log monitoring
- Swagger API dokümantasyonu
- Unit, integration ve E2E testler

## Teknoloji Yığını

- **Framework**: NestJS 11
- **Language**: TypeScript
- **Database**: MongoDB Atlas (Mongoose ODM)
- **Logging**: Winston + Grafana Loki
- **Testing**: Jest
- **API Documentation**: Swagger/OpenAPI

## Gereksinimler

- Node.js 20+ (LTS)
- npm veya yarn
- MongoDB Atlas hesabı (veya local MongoDB)
- (Opsiyonel) Docker ve Docker Compose

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

### Railway'e Deploy

1. GitHub repository'yi Railway'e bağla
2. Environment variables ekle:
   - `DATABASE_URI`: MongoDB Atlas connection string
   - `NODE_ENV=production`
   - (Opsiyonel) `LOKI_ENABLED`, `LOKI_HOST`, `APP_NAME`
3. Railway otomatik olarak `Dockerfile`'ı kullanarak deploy edecek

Detaylı bilgi için `RAILWAY_DEPLOYMENT.md` dosyasına bak.

### Canlı API URL

Deploy edildikten sonra Railway otomatik bir URL verecek:

```
https://your-app-name.railway.app
```

Swagger dokümantasyonu:

```
https://your-app-name.railway.app/api
```

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

Loki entegrasyonu aktifse, loglar Grafana Loki'ye gönderilir. Grafana dashboard'unda logları görüntüleyebilir ve alertler oluşturabilirsin.

Loki ve Grafana'yı başlatmak için:

```bash
docker-compose up -d loki grafana
```

Grafana: `http://localhost:3001` (admin/admin)

## Sorun Giderme

### MongoDB Bağlantı Hatası

- MongoDB Atlas connection string'in doğru olduğundan emin ol
- Network Access'te IP adresinin whitelist'te olduğunu kontrol et
- Kullanıcı adı ve şifrenin doğru olduğunu kontrol et

### Port Zaten Kullanılıyor

```bash
# Port'u değiştir
PORT=3001 npm run start:dev

# Veya kullanan process'i bul ve durdur
lsof -ti:3000 | xargs kill
```

### Testler Çalışmıyor

- MongoDB Memory Server'ın düzgün çalıştığından emin ol
- `node_modules` ve `dist` klasörlerini silip tekrar `npm install` yap

## Lisans

Bu proje özel bir projedir.
