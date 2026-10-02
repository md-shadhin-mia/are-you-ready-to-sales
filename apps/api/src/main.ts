import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";

async function bootstrap() {
  // rawBody lets webhook controllers verify HMAC signatures over the exact bytes received.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT") || 4000;

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Swagger OpenAPI 3.0 Configuration
  const config = new DocumentBuilder()
    .setTitle("Commercial E-Commerce Reseller Platform API")
    .setDescription(
      "RESTful API for the Multi-Tenant Commercial E-Commerce Reseller & Training Platform. Serves institute administration, student stores, master product catalog, and storefront operations.",
    )
    .setVersion("1.0.0")
    .addBearerAuth()
    .addTag("Authentication", "Student & Staff Authentication and JWT rotation")
    .addTag("Categories", "Master Product Category Taxonomy")
    .addTag("Admin Master Products", "Institute-level Master Product Catalog")
    .addTag("Student Product Marketplace", "Reseller Catalog Discovery for Students")
    .addTag("Storage & Media", "MinIO / S3 Presigned URL Media Ingestion")
    .addTag("Stores", "Tenant Store Utilities")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port);
  console.log(`🚀 Platform API monolith listening on http://localhost:${port}`);
  console.log(`📚 OpenAPI Documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();
