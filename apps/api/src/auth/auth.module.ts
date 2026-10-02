import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { PasswordService } from "./password.service";
import { JwtStrategy } from "./jwt.strategy";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { RolesGuard } from "./roles.guard";
import { DynamicPermissionsGuard } from "./dynamic-permissions.guard";
import { RolesService } from "./roles.service";
import { RolesController } from "./roles.controller";

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>("JWT_ACCESS_SECRET") ||
          "dev-access-super-secret-key-at-least-32-chars-long",
        signOptions: {
          expiresIn: configService.get<string>("JWT_ACCESS_EXPIRES_IN") || "15m",
        },
      }),
    }),
  ],
  controllers: [AuthController, RolesController],
  providers: [
    AuthService,
    PasswordService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    DynamicPermissionsGuard,
    RolesService,
  ],
  exports: [
    AuthService,
    PasswordService,
    JwtAuthGuard,
    RolesGuard,
    DynamicPermissionsGuard,
    RolesService,
  ],
})
export class AuthModule {}

