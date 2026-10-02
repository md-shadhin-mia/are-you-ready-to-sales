import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { DynamicPermissionsGuard } from "../auth/dynamic-permissions.guard";
import { RequirePermission } from "../auth/permissions.decorator";
import { CmsService } from "./cms.service";
import { BannersService } from "./banners.service";
import {
  CreateBannerDto,
  CreateFaqDto,
  CreatePageDto,
  ReorderBannersDto,
  UpdateAboutDto,
  UpdateBannerDto,
  UpdateFaqDto,
  UpdatePageDto,
  UpdateSiteSettingsDto,
} from "./cms.dto";

@Controller("api/v1/admin/cms")
@UseGuards(JwtAuthGuard, DynamicPermissionsGuard)
@RequirePermission("cms:manage")
export class CmsAdminController {
  constructor(
    private readonly cms: CmsService,
    private readonly banners: BannersService,
  ) {}

  @Get("settings")
  getSettings() {
    return this.cms.getSettings();
  }

  @Put("settings")
  updateSettings(@Body() dto: UpdateSiteSettingsDto) {
    return this.cms.updateSettings(dto);
  }

  @Get("pages")
  listPages() {
    return this.cms.listPages();
  }

  @Post("pages")
  createPage(@Body() dto: CreatePageDto) {
    return this.cms.createPage(dto);
  }

  @Put("pages/:id")
  updatePage(@Param("id") id: string, @Body() dto: UpdatePageDto) {
    return this.cms.updatePage(id, dto);
  }

  @Delete("pages/:id")
  deletePage(@Param("id") id: string) {
    return this.cms.deletePage(id);
  }

  @Get("about")
  getAbout() {
    return this.cms.getAbout();
  }

  @Put("about")
  updateAbout(@Body() dto: UpdateAboutDto) {
    return this.cms.updateAbout(dto);
  }

  @Get("banners")
  listBanners() {
    return this.banners.list();
  }

  @Post("banners")
  createBanner(@Body() dto: CreateBannerDto) {
    return this.banners.create(dto);
  }

  @Put("banners/reorder")
  reorderBanners(@Body() dto: ReorderBannersDto) {
    return this.banners.reorder(dto.orderedIds);
  }

  @Put("banners/:id")
  updateBanner(@Param("id") id: string, @Body() dto: UpdateBannerDto) {
    return this.banners.update(id, dto);
  }

  @Delete("banners/:id")
  deleteBanner(@Param("id") id: string) {
    return this.banners.remove(id);
  }

  @Get("faqs")
  listFaqs() {
    return this.cms.listFaqs();
  }

  @Post("faqs")
  createFaq(@Body() dto: CreateFaqDto) {
    return this.cms.createFaq(dto);
  }

  @Put("faqs/:id")
  updateFaq(@Param("id") id: string, @Body() dto: UpdateFaqDto) {
    return this.cms.updateFaq(id, dto);
  }

  @Delete("faqs/:id")
  deleteFaq(@Param("id") id: string) {
    return this.cms.deleteFaq(id);
  }
}

@Controller("api/v1/public")
export class CmsPublicController {
  constructor(
    private readonly cms: CmsService,
    private readonly banners: BannersService,
  ) {}

  @Get("settings")
  settings() {
    return this.cms.getPublicSettings();
  }

  @Get("pages/:slug")
  page(@Param("slug") slug: string) {
    return this.cms.getPublishedPage(slug);
  }

  @Get("about")
  about() {
    return this.cms.getAbout();
  }

  @Get("banners")
  liveBanners(@Query("placement") placement?: string) {
    return this.banners.listLive(placement);
  }

  @Get("faqs")
  faqs(@Query("q") q?: string) {
    return this.cms.searchFaqs(q);
  }
}
