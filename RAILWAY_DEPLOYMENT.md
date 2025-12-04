# Railway Deployment Rehberi

## 🚀 Railway'e Deploy Etme

### 1. Railway'de Proje Oluştur

1. [Railway.app](https://railway.app) hesabına giriş yap
2. **New Project** → **Deploy from GitHub repo** (veya **Empty Project**)
3. GitHub repo'nu seç veya bağla

### 2. Environment Variables Ayarla

Railway dashboard'da **Variables** sekmesine git ve şunları ekle:

#### Zorunlu Variables:
```
DATABASE_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
# veya
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority

PORT=3000  # Railway otomatik set eder, manuel ekleme gerekmez
NODE_ENV=production
```

#### Opsiyonel Variables:
```
LOKI_ENABLED=false
LOKI_HOST=http://localhost:3100
APP_NAME=iceberg-backend
```

### 3. Build Ayarları

Railway otomatik olarak:
- `Dockerfile`'ı bulur
- Build eder
- Deploy eder

**Manuel ayar gerekirse:**
- **Settings → Build Command:** (boş bırak, Dockerfile kullanılacak)
- **Settings → Start Command:** `node dist/main.js`

### 4. Domain Ayarla (Opsiyonel)

1. **Settings → Generate Domain** tıkla
2. Railway otomatik domain verir: `iceberg-backend.up.railway.app`
3. Custom domain eklemek için **Settings → Custom Domain**

---

## 🐳 Docker ile Lokal Test

### Build ve Run

```bash
# Build
docker build -t iceberg-backend .

# Run
docker run -p 3000:3000 \
  -e DATABASE_URI="mongodb+srv://..." \
  -e PORT=3000 \
  -e NODE_ENV=production \
  iceberg-backend
```

### Docker Compose ile

```bash
# .env dosyasını düzenle
cp .env.example .env

# Çalıştır
docker-compose -f docker-compose.backend.yml up -d
```

---

## 📋 Environment Variables Listesi

### Zorunlu
- `DATABASE_URI` - MongoDB Atlas connection string
- `PORT` - Server port (Railway otomatik set eder)

### Opsiyonel
- `NODE_ENV` - `production` veya `development`
- `LOKI_ENABLED` - `true` veya `false`
- `LOKI_HOST` - Loki server URL
- `APP_NAME` - Application name (log labels için)

---

## ✅ Deployment Kontrol Listesi

- [ ] GitHub repo'ya push edildi
- [ ] Railway'de proje oluşturuldu
- [ ] Environment variables ayarlandı
- [ ] Build başarılı
- [ ] Health check çalışıyor (`/health`)
- [ ] Swagger erişilebilir (`/api`)
- [ ] MongoDB bağlantısı çalışıyor

---

## 🔍 Troubleshooting

### Build Hatası
- Dockerfile syntax kontrol et
- `node_modules` .dockerignore'da mı kontrol et

### Port Hatası
- Railway otomatik PORT set eder
- `main.ts`'de `0.0.0.0` kullanıldığından emin ol

### MongoDB Bağlantı Hatası
- `DATABASE_URI` doğru mu kontrol et
- MongoDB Atlas IP whitelist'te Railway IP'leri var mı?

### Health Check Hatası
- `/health` endpoint çalışıyor mu?
- Health check timeout yeterli mi?

---

## 📊 Railway Monitoring

Railway dashboard'da:
- **Metrics:** CPU, Memory, Network kullanımı
- **Logs:** Real-time log görüntüleme
- **Deployments:** Deployment geçmişi
- **Settings:** Environment variables, domain ayarları

---

## 🚀 Hızlı Deploy

1. **GitHub'a push:**
   ```bash
   git add .
   git commit -m "Add Dockerfile for Railway"
   git push origin main
   ```

2. **Railway'de:**
   - New Project → Deploy from GitHub
   - Repo seç
   - Environment variables ekle
   - Deploy!

3. **Test:**
   ```bash
   curl https://your-app.railway.app/health
   ```

---

**Hazır! Railway'e deploy edebilirsin! 🎉**

