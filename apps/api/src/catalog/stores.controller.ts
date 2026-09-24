import {
  Controller,
  Get,
  Query,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";

const RESERVED_SLUGS = [
  "admin",
  "api",
  "app",
  "auth",
  "dashboard",
  "mail",
  "static",
  "support",
  "www",
  "platform",
];

@ApiTags("Stores")
@Controller("api/v1/stores")
export class StoresController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("check-slug")
  @ApiOperation({
    summary: "Check if a subdomain slug is valid and available for registration",
  })
  @ApiQuery({ name: "slug", example: "nexus-tech", required: true })
  @ApiResponse({ status: 200, description: "Slug availability result" })
  async checkSlug(@Query("slug") slug: string) {
    if (!slug || typeof slug !== "string") {
      throw new BadRequestException("Slug parameter is required");
    }

    const cleanSlug = slug.trim().toLowerCase();

    // Slug validation: 3-30 chars, alphanumeric + hyphen, no consecutive hyphens
    const slugRegex = /^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])?$/;
    if (!slugRegex.test(cleanSlug)) {
      return {
        slug: cleanSlug,
        available: false,
        reason:
          "Slug must be 3-30 lowercase characters, alphanumeric and hyphens only, cannot start or end with a hyphen",
      };
    }

    if (RESERVED_SLUGS.includes(cleanSlug)) {
      return {
        slug: cleanSlug,
        available: false,
        reason: "This subdomain name is reserved by the platform",
      };
    }

    const existing = await this.prisma.store.findUnique({
      where: { slug: cleanSlug },
      select: { id: true },
    });

    return {
      slug: cleanSlug,
      available: !existing,
      reason: existing ? "Subdomain slug is already taken" : null,
    };
  }
}
