/**
 * Academic Module - TVU Student Portal integration
 */
import {
  BaseModule,
  type ITool,
  type ModuleMetadata,
} from "../../core/index.js";

// Import tools
import { tvuLoginTool } from "./tools/tvuLogin.js";
import { tvuStudentInfoTool } from "./tools/tvuStudentInfo.js";
import { tvuSemestersTool } from "./tools/tvuSemesters.js";
import { tvuScheduleTool } from "./tools/tvuSchedule.js";
import { tvuGradesTool } from "./tools/tvuGrades.js";
import { tvuTuitionTool } from "./tools/tvuTuition.js";
import { tvuCurriculumTool } from "./tools/tvuCurriculum.js";
import { tvuNotificationsTool } from "./tools/tvuNotifications.js";

export class AcademicModule extends BaseModule {
  readonly metadata: ModuleMetadata = {
    name: "academic",
    description: "TVU Student Portal integration (grades, schedule, tuition)",
    version: "1.0.0",
  };

  private _tools: ITool[] = [
    tvuLoginTool,
    tvuStudentInfoTool,
    tvuSemestersTool,
    tvuScheduleTool,
    tvuGradesTool,
    tvuTuitionTool,
    tvuCurriculumTool,
    tvuNotificationsTool,
  ];

  get tools(): ITool[] {
    return this._tools;
  }

  async onLoad(): Promise<void> {
    console.log(`[Academic] 🎓 Loading ${this._tools.length} TVU tools`);
  }
}

// Export singleton instance
export const academicModule = new AcademicModule();

// Re-export tools and services
export * from "./tools/index.js";
export {
  setTvuToken,
  getTvuToken,
  clearTvuToken,
} from "./services/tvuClient.js";
