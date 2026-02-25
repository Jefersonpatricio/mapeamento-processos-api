import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { AuthModule } from "./auth/auth.module.js";
import { DepartmentsModule } from "./departments/departments.module.js";
import { ProcessesModule } from "./processes/processes.module.js";

@Module({
  imports: [AuthModule, DepartmentsModule, ProcessesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
