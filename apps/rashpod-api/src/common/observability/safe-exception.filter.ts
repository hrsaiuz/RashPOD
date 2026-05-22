import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Request, Response } from "express";
import { redactSecrets } from "../config/platform-config.service";

@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SafeExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const errorResponse = isHttp ? exception.getResponse() : undefined;
    const requestId = request.requestId;
    const durationMs = request.startedAtMs ? Date.now() - request.startedAtMs : undefined;
    const message = this.messageFor(status, errorResponse, exception);
    const code = this.codeFor(status, errorResponse);

    const logPayload = redactSecrets({
      event: "api.request.error",
      requestId,
      method: request.method,
      route: request.originalUrl,
      status,
      code,
      userId: (request as any).user?.sub,
      userRole: (request as any).user?.role,
      durationMs,
      message: exception instanceof Error ? exception.message : message,
      stack: process.env.NODE_ENV === "production" ? undefined : exception instanceof Error ? exception.stack : undefined,
    });
    if (status >= 500) this.logger.error(JSON.stringify(logPayload));
    else this.logger.warn(JSON.stringify(logPayload));

    response.status(status).json({
      ok: false,
      statusCode: status,
      code,
      message,
      requestId,
    });
  }

  private messageFor(status: number, response: unknown, exception: unknown) {
    if (process.env.NODE_ENV === "production" && status >= 500) return "Internal server error";
    if (typeof response === "string") return response;
    if (response && typeof response === "object") {
      const value = (response as { message?: unknown }).message;
      if (Array.isArray(value)) return value.join("; ");
      if (typeof value === "string") return value;
    }
    return exception instanceof Error ? exception.message : "Request failed";
  }

  private codeFor(status: number, response: unknown) {
    if (response && typeof response === "object" && typeof (response as { error?: unknown }).error === "string") {
      return String((response as { error: string }).error).toUpperCase().replace(/\s+/g, "_");
    }
    return `HTTP_${status}`;
  }
}
