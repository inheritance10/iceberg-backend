import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { createLokiTransport } from './loki.config';

/**
 * Winston Logger Configuration
 * Günlük log dosyaları oluşturur ve rotate ederiz.Bunun amacı logların sürekli artmasını önlemek ve bellek tüketimini azaltmaktır.
 * Grafana Loki entegrasyonu opsiyonel olarak eklenebilir.Bunun amacı logları Grafana'da görüntülenebilir hale getirmek ve monitoring yapmaktır.
 */
const transports: winston.transport[] = [
    // Console transport - Development için
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.colorize(),
        winston.format.printf(
          (info) =>
            `${info.timestamp} [${info.level}]: ${info.message} ${
              info.stack ? `\n${info.stack}` : ''
            }`,
        ),
      ),
    }),

    // Error log dosyası
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      maxSize: '20m',
      maxFiles: '14d', // 14 gün sakla
    }),

    // Combined log dosyası (tüm loglar)
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      maxSize: '20m',
      maxFiles: '30d', // 30 gün sakla
    }),

    // Audit log dosyası (audit loglar için özel)
    new DailyRotateFile({
      filename: 'logs/audit-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      maxSize: '20m',
      maxFiles: '90d', // 90 gün sakla (audit loglar daha uzun saklanır)
    }),
];

// Grafana Loki transport'u ekle (eğer aktifse)
const lokiTransport = createLokiTransport();
if (lokiTransport) {
  transports.push(lokiTransport);
}

export const winstonConfig = WinstonModule.forRoot({
  transports,
});

