/**
 * Service Container - Dependency Injection container
 */

import { debugLog } from '../logger/logger.js';
import type { IServiceContainer } from '../types.js';

export class ServiceContainer implements IServiceContainer {
  private services = new Map<string, any>();

  register<T>(name: string, instance: T): void {
    if (this.services.has(name)) {
      debugLog('CONTAINER', `Overwriting service: ${name}`);
    }
    this.services.set(name, instance);
    debugLog('CONTAINER', `Registered service: ${name}`);
  }

  get<T>(name: string): T | undefined {
    const service = this.services.get(name);
    if (!service) {
      debugLog('CONTAINER', `Service not found: ${name}`);
    }
    return service as T | undefined;
  }

  has(name: string): boolean {
    return this.services.has(name);
  }

  getRequired<T>(name: string): T {
    const service = this.get<T>(name);
    if (!service) {
      throw new Error(`Required service not found: ${name}`);
    }
    return service;
  }

  clear(): void {
    this.services.clear();
    debugLog('CONTAINER', 'Cleared all services');
  }

  list(): string[] {
    return Array.from(this.services.keys());
  }
}

// Singleton instance
export const container = new ServiceContainer();

// Service names constants
export const Services = {
  ZALO_API: 'zalo:api',
  AI_PROVIDER: 'ai:provider',
  CONFIG: 'config',
  EVENT_BUS: 'event:bus',
  TOOL_REGISTRY: 'tool:registry',
  MODULE_MANAGER: 'module:manager',
  DATABASE: 'database',
} as const;
