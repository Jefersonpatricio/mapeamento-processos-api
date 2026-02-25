import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ProcessesService } from "./processes.service.js";
import { CreateProcessDto } from "./dto/create-process.dto.js";
import { UpdateProcessDto } from "./dto/update-process.dto.js";
import { ProcessFiltersDto } from "./dto/process-filters.dto.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import type { JwtPayload } from "../auth/guards/auth.guard.js";

@Controller()
export class ProcessesController {
  constructor(private readonly processesService: ProcessesService) {}

  @Get("processes")
  findAll(@Query() filters: ProcessFiltersDto) {
    return this.processesService.findAll(filters);
  }

  @Get("processes/:id")
  findOne(@Param("id") id: string) {
    return this.processesService.findOne(id);
  }

  @Get("processes/:id/children")
  findChildren(@Param("id") id: string) {
    return this.processesService.findChildren(id);
  }

  @Get("departments/:id/processes")
  findByDepartment(
    @Param("id") departmentId: string,
    @Query() filters: ProcessFiltersDto,
  ) {
    return this.processesService.findAll({ ...filters, departmentId });
  }

  @Post("processes")
  create(@Body() dto: CreateProcessDto, @CurrentUser() user: JwtPayload) {
    return this.processesService.create(dto, user.sub);
  }

  @Put("processes/:id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateProcessDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.processesService.update(id, dto, user.sub);
  }

  @Patch("processes/:id/status")
  @HttpCode(HttpStatus.OK)
  toggleStatus(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.processesService.toggleStatus(id, user.sub);
  }

  @Patch("processes/:id/documented")
  @HttpCode(HttpStatus.OK)
  toggleDocumented(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.processesService.toggleDocumented(id, user.sub);
  }

  @Delete("processes/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string) {
    return this.processesService.remove(id);
  }
}
