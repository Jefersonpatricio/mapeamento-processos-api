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
} from "@nestjs/common";
import { DepartmentsService } from "./departments.service.js";
import { CreateDepartmentDto } from "./dto/create-department.dto.js";
import { UpdateDepartmentDto } from "./dto/update-department.dto.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import type { JwtPayload } from "../auth/guards/auth.guard.js";

@Controller("departments")
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  findAll() {
    return this.departmentsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.departmentsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateDepartmentDto, @CurrentUser() user: JwtPayload) {
    return this.departmentsService.create(dto, user.sub);
  }

  @Put(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateDepartmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.departmentsService.update(id, dto, user.sub);
  }

  @Patch(":id/status")
  @HttpCode(HttpStatus.OK)
  toggleStatus(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.departmentsService.toggleStatus(id, user.sub);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string) {
    return this.departmentsService.remove(id);
  }
}
