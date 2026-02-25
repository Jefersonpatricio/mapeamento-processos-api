import { Module } from "@nestjs/common";
import { DepartmentsController } from "./departments.controller.js";
import { DepartmentsService } from "./departments.service.js";
import { PrismaModule } from "../prisma/prisma.module.js";

@Module({
  imports: [PrismaModule],
  controllers: [DepartmentsController],
  providers: [DepartmentsService],
})
export class DepartmentsModule {}
