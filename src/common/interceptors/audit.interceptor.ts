import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request } from 'express';
import { Reflector, ModuleRef } from '@nestjs/core';
import { AuditService } from '../services/audit.service';
import { AUDIT_LOG_KEY } from '../decorators/audit-log.decorator';
import {
  AuditAction,
  AuditEntityType,
} from '../entities/audit-log.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Decorator'dan audit log ayarlarını al
    const auditOptions = this.reflector.get<{
      action: AuditAction;
      entityType: AuditEntityType;
      skipResponse?: boolean;
    }>(AUDIT_LOG_KEY, handler);

    // Eğer audit log aktif değilse, normal devam et
    if (!auditOptions) {
      return next.handle();
    }

    const startTime = Date.now();
    const requestId = uuidv4();

    // Request bilgilerini al
    const ipAddress =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      request.ip ||
      request.socket.remoteAddress ||
      'unknown';

    const userAgent = request.headers['user-agent'] || 'unknown';
    const httpMethod = request.method;
    const endpoint = request.url;

    // Entity ID'yi bul (parametrelerden veya body'den)
    const entityId = this.extractEntityId(request, auditOptions.entityType);

    // Before data - Update ve Delete için mevcut entity'yi al
    // Promise olarak başlat (async işlem)
    const beforeDataPromise = this.getBeforeDataIfNeeded(
      entityId,
      auditOptions,
      context,
    );

    // Response'u yakala ve logla
    return next.handle().pipe(
      tap(async (response) => {
        const duration = Date.now() - startTime;
        const statusCode = context.switchToHttp().getResponse().statusCode;

        // Before data'yı bekle
        const beforeData = await beforeDataPromise;

        // After data - Response'dan entity'yi al
        const afterData = auditOptions.skipResponse
          ? undefined
          : this.extractEntityData(response, auditOptions.entityType);

        // Değişiklikleri tespit et
        const changes =
          beforeData && afterData
            ? this.auditService.detectChanges(beforeData, afterData)
            : [];

        // Audit log kaydet
        await this.auditService.log({
          action: auditOptions.action,
          entityType: auditOptions.entityType,
          entityId,
          ipAddress,
          userAgent,
          httpMethod,
          endpoint,
          requestId,
          before: beforeData,
          after: afterData,
          changes,
          statusCode,
          duration,
        });
      }),
      catchError(async (error) => {
        const duration = Date.now() - startTime;
        const statusCode = error.status || 500;

        // Before data'yı bekle
        const beforeData = await beforeDataPromise;

        // Hata durumunda da log kaydet
        await this.auditService.log({
          action: auditOptions.action,
          entityType: auditOptions.entityType,
          entityId: this.extractEntityId(request, auditOptions.entityType),
          ipAddress,
          userAgent,
          httpMethod,
          endpoint,
          requestId,
          before: beforeData,
          error: error.message,
          statusCode,
          duration,
        });

        throw error;
      }),
    );
  }

  /**
   * Request'ten entity ID'yi çıkarır
   */
  private extractEntityId(
    request: Request,
    entityType: AuditEntityType,
  ): string | undefined {
    // URL parametrelerinden (/:id)
    if (request.params?.id) {
      return request.params.id;
    }

    // Body'den (create işlemleri için)
    if (request.body?._id) {
      return request.body._id;
    }

    return undefined;
  }

  /**
   * Response'dan entity verisini çıkarır
   */
  private extractEntityData(
    response: any,
    entityType: AuditEntityType,
  ): Record<string, any> | undefined {
    if (!response) {
      return undefined;
    }

    // Eğer response bir entity ise
    if (response._id || response.id) {
      return this.auditService.sanitizeEntity(response);
    }

    // Eğer response bir data wrapper içindeyse (TransformInterceptor'dan geliyorsa)
    if (response.data) {
      return this.auditService.sanitizeEntity(response.data);
    }

    return undefined;
  }

  /**
   * Update/Delete işlemleri için before data'yı alır (eğer gerekliyse)
   */
  private async getBeforeDataIfNeeded(
    entityId: string | undefined,
    auditOptions: {
      action: AuditAction;
      entityType: AuditEntityType;
    },
    context: ExecutionContext,
  ): Promise<Record<string, any> | undefined> {
    // Eğer entity ID yoksa veya before data gerekmiyorsa
    if (
      !entityId ||
      !(
        auditOptions.action === AuditAction.UPDATE ||
        auditOptions.action === AuditAction.DELETE ||
        auditOptions.action === AuditAction.SOFT_DELETE
      )
    ) {
      return undefined;
    }

    try {
      // Service'i al
      const service = this.getServiceFromContext(
        context,
        auditOptions.entityType,
      );
      if (!service) {
        return undefined;
      }

      // Service'den entity'yi al
      const entity = await service.findOne(entityId);
      if (!entity) {
        return undefined;
      }

      // Entity'yi sanitize et ve döndür
      return this.auditService.sanitizeEntity(entity);
    } catch (error) {
      // Hata durumunda undefined döndür (before data zorunlu değil)
      return undefined;
    }
  }

  /**
   * Context'ten doğru service'i alır
   */
  private getServiceFromContext(
    context: ExecutionContext,
    entityType: AuditEntityType,
  ): any {
    try {
      switch (entityType) {
        case AuditEntityType.AGENT:
          return this.moduleRef.get('AgentsService', { strict: false });
        case AuditEntityType.TRANSACTION:
          return this.moduleRef.get('TransactionsService', { strict: false });
        default:
          return null;
      }
    } catch (error) {
      return null;
    }
  }
}

