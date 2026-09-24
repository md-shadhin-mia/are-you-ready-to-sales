import { Injectable, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint =
      this.configService.get<string>("MINIO_PUBLIC_URL") ||
      "http://localhost:9100";
    const accessKey =
      this.configService.get<string>("MINIO_ACCESS_KEY") || "minioadmin";
    const secretKey =
      this.configService.get<string>("MINIO_SECRET_KEY") || "minioadmin";

    this.bucketName =
      this.configService.get<string>("MINIO_BUCKET_NAME") || "platform-media";
    this.publicUrl = endpoint;

    this.s3Client = new S3Client({
      endpoint,
      region: "us-east-1",
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
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

    const extension = fileName.split(".").pop() || "jpg";
    const sanitizedBase = fileName
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .toLowerCase();
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
