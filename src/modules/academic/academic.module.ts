/**
 * Academic Module - TVU Student Portal Tools
 */

export { tvuLoginTool } from "./tools/tvuLogin.js";
export { tvuStudentInfoTool } from "./tools/tvuStudentInfo.js";
export { tvuSemestersTool } from "./tools/tvuSemesters.js";
export { tvuScheduleTool } from "./tools/tvuSchedule.js";
export { tvuGradesTool } from "./tools/tvuGrades.js";
export { tvuTuitionTool } from "./tools/tvuTuition.js";
export { tvuCurriculumTool } from "./tools/tvuCurriculum.js";
export { tvuNotificationsTool } from "./tools/tvuNotifications.js";

// Re-export client utilities
export {
  setTvuToken,
  getTvuToken,
  clearTvuToken,
} from "./services/tvuClient.js";

// Module metadata
export const AcademicModule = {
  name: "Academic",
  description: "TVU Student Portal integration",
};
