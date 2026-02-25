import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { CreateDepartmentDto } from "./dto/create-department.dto.js";
import { UpdateDepartmentDto } from "./dto/update-department.dto.js";

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.department.findMany({
      orderBy: { name: "asc" },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
        _count: { select: { processes: true } },
      },
    });
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
        _count: { select: { processes: true } },
      },
    });

    if (!department) {
      throw new NotFoundException(`Departamento ${id} não encontrado`);
    }

    return department;
  }

  async create(dto: CreateDepartmentDto, userId: string) {
    const existing = await this.prisma.department.findFirst({
      where: { OR: [{ name: dto.name }, { slug: dto.slug }] },
    });

    if (existing) {
      throw new ConflictException(
        "Já existe um departamento com esse nome ou slug",
      );
    }

    return this.prisma.department.create({
      data: {
        ...dto,
        createdById: userId,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async update(id: string, dto: UpdateDepartmentDto, userId: string) {
    await this.findOne(id);

    if (dto.name || dto.slug) {
      const existing = await this.prisma.department.findFirst({
        where: {
          OR: [
            dto.name ? { name: dto.name } : {},
            dto.slug ? { slug: dto.slug } : {},
          ],
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException(
          "Já existe um departamento com esse nome ou slug",
        );
      }
    }

    return this.prisma.department.update({
      where: { id },
      data: {
        ...dto,
        updatedById: userId,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async toggleStatus(id: string, userId: string) {
    const department = await this.findOne(id);

    return this.prisma.department.update({
      where: { id },
      data: {
        active: !department.active,
        updatedById: userId,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.department.delete({ where: { id } });
  }
}
