import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { CreateProcessDto } from "./dto/create-process.dto.js";
import { UpdateProcessDto } from "./dto/update-process.dto.js";
import { ProcessFiltersDto } from "./dto/process-filters.dto.js";
import type { Prisma } from "../../generated/prisma/client.js";

@Injectable()
export class ProcessesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: ProcessFiltersDto) {
    const where: Prisma.ProcessWhereInput = {};

    if (filters.departmentId) {
      where.departmentId = filters.departmentId;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status) {
      where.active = filters.status === "active";
    }

    if (filters.documented !== undefined) {
      where.documented = filters.documented === "true";
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return this.prisma.process.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        department: { select: { id: true, name: true, slug: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
        parent: { select: { id: true, name: true } },
        _count: { select: { children: true, documents: true } },
      },
    });
  }

  async findOne(id: string) {
    const process = await this.prisma.process.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true, slug: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
        parent: { select: { id: true, name: true } },
        children: {
          select: {
            id: true,
            name: true,
            type: true,
            criticality: true,
            active: true,
            documented: true,
          },
        },
        documents: true,
        _count: { select: { children: true, documents: true } },
      },
    });

    if (!process) {
      throw new NotFoundException(`Processo ${id} não encontrado`);
    }

    return process;
  }

  async findChildren(id: string) {
    await this.findOne(id);

    return this.prisma.process.findMany({
      where: { parentId: id },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { children: true, documents: true } },
      },
    });
  }

  async create(dto: CreateProcessDto, userId: string) {
    return this.prisma.process.create({
      data: {
        ...dto,
        createdById: userId,
      },
      include: {
        department: { select: { id: true, name: true, slug: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async update(id: string, dto: UpdateProcessDto, userId: string) {
    await this.findOne(id);

    const { departmentId, parentId, documentLink, ...rest } = dto;

    return this.prisma.process.update({
      where: { id },
      data: {
        ...rest,
        documentLink: documentLink ?? null,
        ...(departmentId && {
          department: { connect: { id: departmentId } },
        }),
        ...(parentId !== undefined && parentId !== null
          ? { parent: { connect: { id: parentId } } }
          : parentId === null
            ? { parent: { disconnect: true } }
            : {}),
        updatedBy: { connect: { id: userId } },
      },
      include: {
        department: { select: { id: true, name: true, slug: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async toggleStatus(id: string, userId: string) {
    const process = await this.findOne(id);

    return this.prisma.process.update({
      where: { id },
      data: {
        active: !process.active,
        updatedById: userId,
      },
    });
  }

  async toggleDocumented(id: string, userId: string) {
    const process = await this.findOne(id);

    return this.prisma.process.update({
      where: { id },
      data: {
        documented: !process.documented,
        updatedById: userId,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.process.delete({ where: { id } });
  }
}
