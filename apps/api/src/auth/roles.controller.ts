import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { DynamicPermissionsGuard } from "./dynamic-permissions.guard";
import { RequirePermission } from "./permissions.decorator";
import { RolesService } from "./roles.service";

import { IsString, IsNotEmpty, IsOptional, IsArray } from "class-validator";

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  permissionIds?: string[];
}

export class UpdateRolePermissionsDto {
  @IsArray()
  permissionIds!: string[];
}

export class AssignRoleDto {
  @IsString()
  @IsNotEmpty()
  roleId!: string;
}

@Controller("api/v1/admin/roles")
@UseGuards(JwtAuthGuard, DynamicPermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermission("roles:manage")
  async getAllRoles() {
    return this.rolesService.getAllRoles();
  }

  @Post()
  @RequirePermission("roles:manage")
  async createRole(@Body() dto: CreateRoleDto) {
    return this.rolesService.createRole(dto);
  }

  @Get("permissions")
  @RequirePermission("roles:manage")
  async getAllPermissions() {
    return this.rolesService.getAllPermissions();
  }

  @Put(":id/permissions")
  @RequirePermission("roles:manage")
  async updateRolePermissions(
    @Param("id") id: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.rolesService.updateRolePermissions(id, dto.permissionIds || []);
  }

  @Post("users/:userId/assign")
  @RequirePermission("roles:manage")
  async assignRole(
    @Param("userId") userId: string,
    @Body() dto: AssignRoleDto,
  ) {
    return this.rolesService.assignRoleToUser(userId, dto.roleId);
  }

  @Delete("users/:userId/remove/:roleId")
  @RequirePermission("roles:manage")
  async removeRole(
    @Param("userId") userId: string,
    @Param("roleId") roleId: string,
  ) {
    return this.rolesService.removeRoleFromUser(userId, roleId);
  }

  @Get("users/:userId")
  @RequirePermission("roles:manage")
  async getUserRoles(@Param("userId") userId: string) {
    return this.rolesService.getUserRoles(userId);
  }
}
