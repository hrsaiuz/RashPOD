import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { FilmQuoteDto } from "./dto/film-quote.dto";
import { FilmService } from "./film.service";

@Controller("shop")
export class PublicFilmController {
  constructor(private readonly film: FilmService) {}

  @Post("film/quote")
  quote(@Body() dto: FilmQuoteDto) {
    return this.film.quote(dto);
  }
}
