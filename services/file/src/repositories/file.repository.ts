import type { FileRecord, FilePurpose, FileStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export type CreateFileInput = {
  id: string;
  uploadedBy: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  purpose: FilePurpose;
  localPath?: string;
  s3Key?: string;
};

export const fileRepository = {
  async create(input: CreateFileInput): Promise<FileRecord> {
    return prisma.fileRecord.create({ data: input });
  },

  async findById(id: string): Promise<FileRecord | null> {
    return prisma.fileRecord.findUnique({ where: { id } });
  },

  async updateStatus(
    id: string,
    status: FileStatus,
    virusScanResult?: string,
  ): Promise<FileRecord> {
    return prisma.fileRecord.update({
      where: { id },
      data: { status, virusScanResult },
    });
  },

  async softDelete(id: string): Promise<FileRecord> {
    return prisma.fileRecord.update({
      where: { id },
      data: { status: "DELETED" },
    });
  },
};
