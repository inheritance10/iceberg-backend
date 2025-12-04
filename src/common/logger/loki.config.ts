import * as winston from 'winston';
import LokiTransport from 'winston-loki';

/**
 * Grafana Loki Transport Configuration
 * Log dosyalarını Grafana Loki'ye gönderir ve Grafana'da görüntülenebilir hale getirir.
 * 
 * Not: Bu transport opsiyoneldir, sadece Grafana Loki kuruluysa aktif olur
 * Environment variable ile kontrol edilir: LOKI_ENABLED=true
 */
export function createLokiTransport(): winston.transport | null {
  const lokiEnabled = process.env.LOKI_ENABLED === 'true';
  const lokiHost = process.env.LOKI_HOST || 'http://localhost:3100';
  const lokiApiKey = process.env.LOKI_API_KEY; // Grafana Cloud için API key
  const lokiLabels = {
    app: process.env.APP_NAME || 'iceberg-backend',
    environment: process.env.NODE_ENV || 'development',
  };

  if (!lokiEnabled) {
    return null;
  }

  try {
    const transportConfig: any = {
      host: lokiHost,
      labels: lokiLabels,
      json: true,
      format: winston.format.json(),
      replaceTimestamp: true,
      onConnectionError: (err) => {
        console.error('Loki connection error:', err);
      },
      gracefulShutdown: true,
    };

    // Grafana Cloud için API key ekle
    // Grafana Cloud için basicAuth formatı: username boş, password API key
    if (lokiApiKey) {
      transportConfig.basicAuth = `:${lokiApiKey}`;
    }

    return new LokiTransport(transportConfig);
  } catch (error) {
    console.error('Failed to create Loki transport:', error);
    return null;
  }
}

