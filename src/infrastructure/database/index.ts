/**
 * Database Module - Export tất cả components
 */

// Connection
export { initDatabase, getDatabase, closeDatabase } from "./connection.js";

// Schema
export * from "./schema.js";

// Repositories
export {
  historyRepository,
  HistoryRepository,
} from "./repositories/history.repository.js";
export {
  sentMessagesRepository,
  SentMessagesRepository,
} from "./repositories/sent-messages.repository.js";
export {
  usersRepository,
  UsersRepository,
  type UserRole,
} from "./repositories/users.repository.js";

// Service
export { databaseService, DatabaseService } from "./database.service.js";
