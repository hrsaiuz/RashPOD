import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { json, raw } from "express";
import { AppModule } from "./app.module";
import { DESIGN_ORIGINAL_MAX_BYTES } from "./modules/files/asset-upload-policy";
import { assertEnvironment } from "./common/config/platform-config.service";
import { SafeExceptionFilter } from "./common/observability/safe-exception.filter";
import { requestContextMiddleware } from "./common/observability/request-context.middleware";
import { createRateLimitMiddleware } from "./common/security/rate-limit.middleware";
import { securityHeadersMiddleware } from "./common/security/security-headers.middleware";

async function bootstrap() {
  assertEnvironment("api");
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(requestContextMiddleware);
  app.use(securityHeadersMiddleware);
  app.use(createRateLimitMiddleware());
  app.use("/files/local-upload", raw({ type: "*/*", limit: DESIGN_ORIGINAL_MAX_BYTES + 1024 * 1024 }));
  app.use(json({ limit: "2mb" }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new SafeExceptionFilter());

  const allowedOrigins = [
    ...(process.env.CORS_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? []),
    process.env.WEB_URL,
    process.env.DASHBOARD_URL,
    ...(process.env.NODE_ENV === "production" ? [] : ["http://localhost:3000", "http://localhost:3001"]),
  ].filter((o): o is string => Boolean(o));

  app.enableCors({
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin ${origin} not allowed`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  await app.listen(parseInt(process.env.PORT ?? "3002", 10), "0.0.0.0");
}

bootstrap();
