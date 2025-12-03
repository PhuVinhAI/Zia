/**
 * App Module - Đăng ký các module sẽ chạy
 */
import { AcademicModule } from "../modules/academic/academic.module.js";
import { EntertainmentModule } from "../modules/entertainment/entertainment.module.js";
import { SystemModule } from "../modules/system/system.module.js";
import { GatewayModule } from "../modules/gateway/gateway.module.js";

// Chỉ cần thêm vào đây là tính năng tự động chạy
export const registeredModules = [
  GatewayModule,
  AcademicModule,
  EntertainmentModule,
  SystemModule,
];

export { AcademicModule, EntertainmentModule, SystemModule, GatewayModule };
