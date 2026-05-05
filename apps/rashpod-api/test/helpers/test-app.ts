import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/prisma/prisma.service";
import { createFakePrisma } from "./fake-prisma";

export async function createTestApp() {
  const fakePrisma = createFakePrisma();
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(fakePrisma)
    .compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return { app: app as INestApplication, fakePrisma };
}
