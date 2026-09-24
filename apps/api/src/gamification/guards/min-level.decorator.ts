import { SetMetadata } from "@nestjs/common";

export const MIN_LEVEL_KEY = "min_level";
export const MinLevel = (level: number) => SetMetadata(MIN_LEVEL_KEY, level);
