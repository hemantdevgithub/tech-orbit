-- CreateEnum
CREATE TYPE "interview"."RecordingStatus" AS ENUM ('NONE', 'RECORDING', 'PROCESSING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "interview"."interview" ADD COLUMN     "video_recording_duration_sec" INTEGER,
ADD COLUMN     "video_recording_ended_at" TIMESTAMP(3),
ADD COLUMN     "video_recording_file_id" TEXT,
ADD COLUMN     "video_recording_started_at" TIMESTAMP(3),
ADD COLUMN     "video_recording_status" "interview"."RecordingStatus" NOT NULL DEFAULT 'NONE';
