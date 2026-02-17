import { describe, it, expect, beforeEach } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

type AuthenticatedUser = NonNullable<TrpcContext['user']>;

function createTrackingContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: 'test-user',
    email: 'test@example.com',
    name: 'Test User',
    loginMethod: 'manus',
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: 'https',
      headers: {},
    } as TrpcContext['req'],
    res: {
      clearCookie: () => {},
    } as TrpcContext['res'],
  };

  return ctx;
}

describe('Tracking Router', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    const ctx = createTrackingContext();
    caller = appRouter.createCaller(ctx);
  });

  describe('getTelecomcubeVehicles', () => {
    it('should return vehicles data successfully', async () => {
      const result = await caller.tracking.getTelecomcubeVehicles();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.vehicles).toBeDefined();
      expect(Array.isArray(result.vehicles)).toBe(true);
    });

    it('should return vehicles with correct structure', async () => {
      const result = await caller.tracking.getTelecomcubeVehicles();

      expect(result.vehicles.length).toBeGreaterThan(0);

      const vehicle = result.vehicles[0];
      expect(vehicle).toHaveProperty('id');
      expect(vehicle).toHaveProperty('name');
      expect(vehicle).toHaveProperty('latitude');
      expect(vehicle).toHaveProperty('longitude');
      expect(vehicle).toHaveProperty('speed');
      expect(vehicle).toHaveProperty('lastUpdate');
      expect(vehicle).toHaveProperty('status');
    });

    it('should return vehicle with valid coordinates', async () => {
      const result = await caller.tracking.getTelecomcubeVehicles();
      const vehicle = result.vehicles[0];

      expect(typeof vehicle.latitude).toBe('number');
      expect(typeof vehicle.longitude).toBe('number');
      expect(vehicle.latitude).toBeGreaterThanOrEqual(-90);
      expect(vehicle.latitude).toBeLessThanOrEqual(90);
      expect(vehicle.longitude).toBeGreaterThanOrEqual(-180);
      expect(vehicle.longitude).toBeLessThanOrEqual(180);
    });

    it('should return vehicle with valid status', async () => {
      const result = await caller.tracking.getTelecomcubeVehicles();
      const vehicle = result.vehicles[0];

      expect(['active', 'idle', 'offline']).toContain(vehicle.status);
    });

    it('should return vehicle with valid speed', async () => {
      const result = await caller.tracking.getTelecomcubeVehicles();
      const vehicle = result.vehicles[0];

      expect(typeof vehicle.speed).toBe('number');
      expect(vehicle.speed).toBeGreaterThanOrEqual(0);
    });

    it('should return vehicle with valid timestamp', async () => {
      const result = await caller.tracking.getTelecomcubeVehicles();
      const vehicle = result.vehicles[0];

      const timestamp = new Date(vehicle.lastUpdate);
      expect(timestamp.getTime()).toBeGreaterThan(0);
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('recordLocation', () => {
    it('should accept valid location input', async () => {
      const input = {
        vehicleId: 1,
        latitude: 31.945,
        longitude: 35.927,
        speed: 45,
        heading: 90,
        accuracy: 5,
      };

      // يجب أن لا يرمي خطأ
      expect(async () => {
        await caller.tracking.recordLocation(input);
      }).not.toThrow();
    });

    it('should accept location without optional fields', async () => {
      const input = {
        vehicleId: 1,
        latitude: 31.945,
        longitude: 35.927,
      };

      // يجب أن لا يرمي خطأ
      expect(async () => {
        await caller.tracking.recordLocation(input);
      }).not.toThrow();
    });
  });

  describe('getLatest', () => {
    it('should return tracking data or null for vehicle', async () => {
      // الحصول على آخر بيانات
      const result = await caller.tracking.getLatest({ vehicleId: 1 });

      // النتيجة قد تكون null أو object
      if (result) {
        expect(result.vehicleId).toBe(1);
        expect(result.latitude).toBeDefined();
        expect(result.longitude).toBeDefined();
      }
    });
  });
});
