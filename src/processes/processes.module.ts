import { Module } from "@nestjs/common";
import { ProcessesController } from "./processes.controler.js";
import { ProcessesService } from "./processes.service.js";
import { PrismaModule } from "../prisma/prisma.module.js";

@Module({
  imports: [PrismaModule],
  controllers: [ProcessesController],
  providers: [ProcessesService],
})
export class ProcessesModule {}
