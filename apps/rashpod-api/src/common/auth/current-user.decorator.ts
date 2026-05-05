import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface RequestUser {
  sub: string;
  role: string;
  email: string;
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): RequestUser | undefined => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
