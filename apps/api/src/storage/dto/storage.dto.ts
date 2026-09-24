import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumber, IsString, Max } from "class-validator";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export class PresignedUrlRequestDto {
  @ApiProperty({ example: "product-image.jpg" })
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @ApiProperty({ example: "image/jpeg", enum: ALLOWED_MIME_TYPES })
  @IsString()
  @IsIn(ALLOWED_MIME_TYPES, {
    message: "File type must be image/jpeg, image/png, or image/webp",
  })
  contentType!: string;

  @ApiProperty({ example: 1048576, description: "File size in bytes (max 5MB)" })
  @IsNumber()
  @Max(MAX_FILE_SIZE_BYTES, {
    message: "File size must not exceed 5 MB",
  })
  fileSize!: number;
}
