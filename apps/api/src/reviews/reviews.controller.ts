import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { ReviewsService } from "./reviews.service";
import {
  SubmitReviewDto,
  QueryReviewsDto,
  TogglePublishReviewDto,
} from "./dto/review.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "@repo/db";
import { Request } from "express";

@ApiTags("Reviews & Ratings")
@Controller("api/v1")
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // 1. Submit review (public)
  @Post("stores/:slug/reviews")
  @ApiOperation({ summary: "Submit verified customer review (Product, Store, Delivery)" })
  @ApiResponse({ status: 201, description: "Review submitted and ratings updated" })
  submitReview(
    @Param("slug") slug: string,
    @Body() dto: SubmitReviewDto,
  ) {
    return this.reviewsService.submitReview(slug, dto);
  }

  // 2. Verify token (public)
  @Get("stores/:slug/reviews/verify-token")
  @ApiOperation({ summary: "Verify 1-click review invitation token" })
  @ApiQuery({ name: "token", required: true })
  verifyToken(
    @Param("slug") slug: string,
    @Query("token") token: string,
  ) {
    return this.reviewsService.verifyReviewToken(slug, token);
  }

  // 3. Verify manual order lookup (public)
  @Get("stores/:slug/reviews/verify-order")
  @ApiOperation({ summary: "Verify order number and phone for review eligibility" })
  @ApiQuery({ name: "orderNumber", required: true })
  @ApiQuery({ name: "phone", required: true })
  verifyOrder(
    @Param("slug") slug: string,
    @Query("orderNumber") orderNumber: string,
    @Query("phone") phone: string,
  ) {
    return this.reviewsService.verifyOrderForReview(slug, orderNumber, phone);
  }

  // 4. Product reviews with 3D breakdown (public)
  @Get("stores/:slug/products/:productId/reviews")
  @ApiOperation({ summary: "Get public reviews and star meter breakdown for a product" })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 10 })
  getProductReviews(
    @Param("slug") slug: string,
    @Param("productId") productId: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.reviewsService.getProductReviews(slug, productId, { page, limit });
  }

  // 5. Store reviews (public)
  @Get("stores/:slug/reviews")
  @ApiOperation({ summary: "Get public reviews for a student store" })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 10 })
  getStoreReviews(
    @Param("slug") slug: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.reviewsService.getStoreReviews(slug, { page, limit });
  }

  // 6. Student store reviews list (authenticated student)
  @Get("student/reviews")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List reviews for authenticated student store" })
  listStudentReviews(
    @Req() req: Request & { user: { id: string } },
    @Query() query: QueryReviewsDto,
  ) {
    return this.reviewsService.listStudentReviews(req.user.id, query);
  }

  // 7. Admin platform reviews list (authenticated admin)
  @Get("admin/reviews")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTITUTE_ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT_AGENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List all platform reviews for institute moderation" })
  listAdminReviews(@Query() query: QueryReviewsDto) {
    return this.reviewsService.listAdminReviews(query);
  }

  // 8. Admin publish toggle (authenticated admin)
  @Patch("admin/reviews/:id/publish")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTITUTE_ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT_AGENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Toggle review publication status" })
  togglePublish(
    @Param("id") id: string,
    @Body() dto: TogglePublishReviewDto,
  ) {
    return this.reviewsService.togglePublishStatus(id, dto.isPublished);
  }
}
