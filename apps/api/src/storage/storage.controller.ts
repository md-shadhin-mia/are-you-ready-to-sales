import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { StorageService } from "./storage.service";
import { PresignedUrlRequestDto } from "./dto/storage.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "@repo/db";

@ApiTags("Storage & Media")
@Controller("api/v1/admin/media")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post("presigned-url")
  @Roles(UserRole.SUPER_ADMIN, UserRole.INSTITUTE_ADMIN, UserRole.PRODUCT_MANAGER)
  @ApiOperation({
    summary: "Generate presigned MinIO/S3 upload URL for product media",
  })
  @ApiResponse({
    status: 201,
    description: "Presigned upload URL generated successfully",
  })
  async generatePresignedUrl(@Body() dto: PresignedUrlRequestDto) {
    return this.storageService.generatePresignedUploadUrl(
      dto.fileName,
      dto.contentType,
      dto.fileSize,
    );
  }
}
