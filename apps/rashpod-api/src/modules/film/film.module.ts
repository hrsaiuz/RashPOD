import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { FilmController } from "./film.controller";
import { FilmService } from "./film.service";
import { PublicFilmController } from "./public-film.controller";

@Module({
  imports: [AuditModule],
  controllers: [FilmController, PublicFilmController],
  providers: [FilmService],
  exports: [FilmService],
})
export class FilmModule {}
