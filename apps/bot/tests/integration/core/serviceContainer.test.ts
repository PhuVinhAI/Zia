/**
 * Test: ServiceContainer
 */
import { describe, expect, it, beforeEach } from 'bun:test';
import { ServiceContainer } from '../../../src/core/container/service-container.js';

describe('ServiceContainer', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  it('should register and get service', () => {
    const service = { name: 'TestService' };
    container.register('test', service);
    
    const retrieved = container.get<typeof service>('test');
    expect(retrieved).toBe(service);
  });

  it('should return undefined for non-existent service', () => {
    const result = container.get('non-existent');
    expect(result).toBeUndefined();
  });

  it('should check if service exists', () => {
    container.register('exists', { value: 1 });
    
    expect(container.has('exists')).toBe(true);
    expect(container.has('not-exists')).toBe(false);
  });

  it('should get required service or throw', () => {
    container.register('required', { data: 'test' });
    
    const service = container.getRequired<{ data: string }>('required');
    expect(service.data).toBe('test');

    expect(() => container.getRequired('missing')).toThrow('Required service not found: missing');
  });

  it('should overwrite existing service', () => {
    container.register('service', { version: 1 });
    container.register('service', { version: 2 });
    
    const service = container.get<{ version: number }>('service');
    expect(service?.version).toBe(2);
  });

  it('should clear all services', () => {
    container.register('a', 1);
    container.register('b', 2);
    
    expect(container.has('a')).toBe(true);
    expect(container.has('b')).toBe(true);
    
    container.clear();
    
    expect(container.has('a')).toBe(false);
    expect(container.has('b')).toBe(false);
  });

  it('should list all service names', () => {
    container.register('service1', {});
    container.register('service2', {});
    container.register('service3', {});
    
    const names = container.list();
    expect(names).toContain('service1');
    expect(names).toContain('service2');
    expect(names).toContain('service3');
    expect(names.length).toBe(3);
  });
});
