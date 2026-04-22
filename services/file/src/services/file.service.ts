import fs from "node:fs/promises";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import {
  NotFoundError,
  ForbiddenError,
  InternalError,
  ValidationError,
} from "@techorbit/errors";
import type { FilePurpose } from "../generated/client/index.js";
import { fileRepository } from "../repositories/file.repository.js";
import type { Config } from "../config.js";

type UploadUrlResult = {
  fileId: string;
  uploadUrl: string;
  method: "PUT";
  expiresAt: string;
  isLocal: boolean;
};

type FileInfo = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  purpose: string;
  status: string;
  downloadUrl?: string;
  createdAt: string;
};

const ALLOWED_CONTENT_TYPES: Record<FilePurpose, string[]> = {
  RESUME: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  CONTRACT: ["application/pdf"],
  W9: ["application/pdf", "image/png", "image/jpeg"],
  VIDEO_INTRO: ["video/mp4", "video/webm"],
  PROFILE_PHOTO: ["image/png", "image/jpeg", "image/webp"],
};

export function createFileService(config: Config) {
  async function ensureLocalDir(): Promise<void> {
    await fs.mkdir(config.FILE_STORAGE_LOCAL_DIR, { recursive: true });
  }

  return {
    async requestUploadUrl(
      uploadedBy: string,
      filename: string,
      contentType: string,
      sizeBytes: number,
      purpose: FilePurpose,
    ): Promise<UploadUrlResult> {
      const allowed = ALLOWED_CONTENT_TYPES[purpose];
      if (!allowed.includes(contentType)) {
        throw new ValidationError(
          `Content type ${contentType} is not allowed for purpose ${purpose}`,
        );
      }

      const fileId = uuidv4();
      const ext = filename.includes(".") ? filename.split(".").pop() : "";
      const storedFilename = ext ? `${fileId}.${ext}` : fileId;

      if (config.FILE_STORAGE_MODE === "local") {
        await ensureLocalDir();
        const localPath = path.join(config.FILE_STORAGE_LOCAL_DIR, storedFilename);

        await fileRepository.create({
          id: fileId,
          uploadedBy,
          filename,
          contentType,
          sizeBytes,
          purpose,
          localPath,
        });

        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        return {
          fileId,
          uploadUrl: `${config.FILE_BASE_URL}/api/v1/files/${fileId}/upload`,
          method: "PUT",
          expiresAt,
          isLocal: true,
        };
      }

      throw new InternalError("S3 storage mode not implemented yet");
    },

    async handleLocalUpload(
      fileId: string,
      uploadedBy: string,
      data: Buffer,
    ): Promise<void> {
      const record = await fileRepository.findById(fileId);
      if (!record) throw new NotFoundError("File not found");
      if (record.uploadedBy !== uploadedBy) {
        throw new ForbiddenError("Cannot upload to this file slot");
      }
      if (record.status !== "PENDING") {
        throw new ValidationError("File already uploaded");
      }
      if (!record.localPath) {
        throw new InternalError("No local path for this file");
      }

      await fs.writeFile(record.localPath, data);
    },

    async confirmUpload(fileId: string, uploadedBy: string): Promise<FileInfo> {
      const record = await fileRepository.findById(fileId);
      if (!record) throw new NotFoundError("File not found");
      if (record.uploadedBy !== uploadedBy) {
        throw new ForbiddenError("Cannot confirm this file");
      }

      if (config.FILE_STORAGE_MODE === "local" && record.localPath) {
        try {
          await fs.access(record.localPath);
        } catch {
          throw new InternalError("File not found on disk — upload may have failed");
        }
      }

      // Mock virus scan: always passes in local dev
      const updated = await fileRepository.updateStatus(fileId, "CONFIRMED", "CLEAN");
      return toFileInfo(updated, config);
    },

    async getById(fileId: string, requesterId: string): Promise<FileInfo> {
      const record = await fileRepository.findById(fileId);
      if (!record || record.status === "DELETED") {
        throw new NotFoundError("File not found");
      }
      if (record.uploadedBy !== requesterId) {
        throw new ForbiddenError("Cannot access this file");
      }
      return toFileInfo(record, config);
    },

    async getDownloadUrl(fileId: string, requesterId: string): Promise<string> {
      const record = await fileRepository.findById(fileId);
      if (!record || record.status === "DELETED") {
        throw new NotFoundError("File not found");
      }
      if (record.uploadedBy !== requesterId) {
        throw new ForbiddenError("Cannot access this file");
      }
      if (record.status !== "CONFIRMED") {
        throw new ValidationError("File is not confirmed yet");
      }

      if (config.FILE_STORAGE_MODE === "local") {
        return `${config.FILE_BASE_URL}/api/v1/files/${fileId}/serve`;
      }

      throw new InternalError("S3 download URL not implemented");
    },
  };
}

type RecordForInfo = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  purpose: string;
  status: string;
  createdAt: Date;
};

function toFileInfo(record: RecordForInfo, config: Config): FileInfo {
  const downloadUrl =
    record.status === "CONFIRMED" && config.FILE_STORAGE_MODE === "local"
      ? `${config.FILE_BASE_URL}/api/v1/files/${record.id}/serve`
      : undefined;

  return {
    id: record.id,
    filename: record.filename,
    contentType: record.contentType,
    sizeBytes: record.sizeBytes,
    purpose: record.purpose,
    status: record.status,
    downloadUrl,
    createdAt: record.createdAt.toISOString(),
  };
}
