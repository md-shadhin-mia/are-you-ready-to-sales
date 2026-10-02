import { Injectable, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

// Kept in sync with PresignedUrlRequestDto's @IsIn allow-list.
const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    const isProduction =
      this.configService.get<string>("NODE_ENV") === "production";
    const endpoint =
      this.configService.get<string>("STORAGE_ENDPOINT") ||
      this.configService.get<string>("MINIO_PUBLIC_URL") ||
      "http://localhost:8333";
    const publicUrl =
      this.configService.get<string>("STORAGE_PUBLIC_URL") ||
      this.configService.get<string>("MINIO_PUBLIC_URL") ||
      endpoint;
    const accessKey =
      this.configService.get<string>("STORAGE_ACCESS_KEY") ||
      this.configService.get<string>("MINIO_ACCESS_KEY");
    const secretKey =
      this.configService.get<string>("STORAGE_SECRET_KEY") ||
      this.configService.get<string>("MINIO_SECRET_KEY");

    if (isProduction && (!accessKey || !secretKey)) {
      throw new Error(
        "STORAGE_ACCESS_KEY and STORAGE_SECRET_KEY (or MINIO_*) must be set in production (see .env.example)",
      );
    }

    this.bucketName =
      this.configService.get<string>("STORAGE_BUCKET_NAME") ||
      this.configService.get<string>("MINIO_BUCKET_NAME") ||
      "platform-media";
    this.publicUrl = publicUrl;

    this.s3Client = new S3Client({
      endpoint,
      region: "us-east-1",
      credentials: {
        accessKeyId: accessKey || "seaweedadmin",
        secretAccessKey: secretKey || "seaweedadmin",
      },
      forcePathStyle: true,
    });
  }

  async generatePresignedUploadUrl(
    fileName: string,
    contentType: string,
    fileSize: number,
  ) {
    if (fileSize > 5 * 1024 * 1024) {
      throw new BadRequestException("File size must not exceed 5 MB");
    }

    const extension = ALLOWED_CONTENT_TYPES[contentType];
    if (!extension) {
      throw new BadRequestException(
        `Unsupported content type. Allowed: ${Object.keys(ALLOWED_CONTENT_TYPES).join(", ")}`,
      );
    }

    const sanitizedBase =
      fileName
        .split(".")[0]
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .toLowerCase()
        .slice(0, 100) || "file";
    const key = `uploads/${randomUUID()}_${sanitizedBase}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
      ContentLength: fileSize,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 300, // 5 minutes
    });

    const fileUrl = `${this.publicUrl}/${this.bucketName}/${key}`;

    return {
      uploadUrl,
      fileKey: key,
      publicUrl: fileUrl,
      expiresIn: 300,
    };
  }
}
