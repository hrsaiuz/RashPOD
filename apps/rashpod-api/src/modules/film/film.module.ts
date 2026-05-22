import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { FilmController } from "./film.controller";
import { FilmService } from "./film.service";

@Module({
  imports: [AuditModule],
  controllers: [FilmController],
  providers: [FilmService],
  exports: [FilmService],
})
export class FilmModule {}
