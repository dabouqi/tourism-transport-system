import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';

describe('Booking Tracking Integration', () => {
  let bookingId: number;
  let vehicleId: number;

  beforeAll(async () => {
    // Create a test vehicle
    const vehicleResult = await db.createVehicle({
      licensePlate: 'TEST-001',
      vehicleType: 'SUV',
      model: 'Toyota Fortuner',
      year: 2023,
      capacity: 7,
      status: 'available',
      fuelLevel: '80',
    });
    vehicleId = (vehicleResult as any).insertId || 1;

    // Create a test booking with vehicle
    const bookingResult = await db.createBooking({
      bookingNumber: 'BK-TEST-001',
      customerName: 'اختبار التتبع',
      customerPhone: '0123456789',
      pickupLocation: 'الفندق',
      dropoffLocation: 'المطار',
      numberOfPassengers: 4,
      pickupDateTime: new Date(),
      fare: '150',
      bookingSource: 'internal',
      status: 'confirmed',
      vehicleId: vehicleId,
    });
    bookingId = (bookingResult as any).insertId || 1;
  });

  afterAll(async () => {
    // Cleanup
    try {
      await db.deleteBooking(bookingId);
      await db.deleteVehicle(vehicleId);
    } catch (error) {
      console.warn('Cleanup error:', error);
    }
  });

  it('should get booking with vehicle tracking data', async () => {
    const booking = await db.getBookingById(bookingId);
    expect(booking).toBeDefined();
    expect(booking?.vehicleId).toBe(vehicleId);
  });

  it('should get vehicle by ID', async () => {
    const vehicle = await db.getVehicleById(vehicleId);
    expect(vehicle).toBeDefined();
    expect(vehicle?.licensePlate).toBe('TEST-001');
    expect(vehicle?.vehicleType).toBe('SUV');
  });

  it('should create vehicle tracking record', async () => {
    const trackingResult = await db.createVehicleTracking({
      vehicleId: vehicleId,
      latitude: '31.945',
      longitude: '35.927',
      speed: '45',
      heading: '90',
      accuracy: '5',
      timestamp: new Date(),
    });
    expect(trackingResult).toBeDefined();
  });

  it('should get latest vehicle tracking', async () => {
    // Create tracking record first
    await db.createVehicleTracking({
      vehicleId: vehicleId,
      latitude: '31.946',
      longitude: '35.928',
      speed: '50',
      heading: '95',
      accuracy: '4',
      timestamp: new Date(),
    });

    const tracking = await db.getLatestVehicleTracking(vehicleId);
    expect(tracking).toBeDefined();
    expect(tracking?.vehicleId).toBe(vehicleId);
    expect(tracking?.latitude).toBe('31.946');
    expect(tracking?.longitude).toBe('35.928');
  });

  it('should handle booking without vehicle', async () => {
    const bookingResult = await db.createBooking({
      bookingNumber: 'BK-NO-VEHICLE',
      customerName: 'بدون مركبة',
      customerPhone: '0987654321',
      pickupLocation: 'الفندق',
      dropoffLocation: 'المطار',
      numberOfPassengers: 2,
      pickupDateTime: new Date(),
      fare: '100',
      bookingSource: 'internal',
      status: 'pending',
    });

    const booking = await db.getBookingById((bookingResult as any).insertId || 1);
    expect(booking?.vehicleId).toBeNull();

    // Cleanup
    if ((bookingResult as any).insertId) {
      await db.deleteBooking((bookingResult as any).insertId);
    }
  });

  it('should track vehicle location updates', async () => {
    const locations = [
      { lat: '31.945', lng: '35.927', speed: '40' },
      { lat: '31.946', lng: '35.928', speed: '45' },
      { lat: '31.947', lng: '35.929', speed: '50' },
    ];

    for (const loc of locations) {
      await db.createVehicleTracking({
        vehicleId: vehicleId,
        latitude: loc.lat,
        longitude: loc.lng,
        speed: loc.speed,
        heading: '90',
        accuracy: '5',
        timestamp: new Date(),
      });
    }

    const latestTracking = await db.getLatestVehicleTracking(vehicleId);
    expect(latestTracking?.latitude).toBe('31.947');
    expect(latestTracking?.longitude).toBe('35.929');
    expect(latestTracking?.speed).toBe('50');
  });

  it('should handle multiple vehicles tracking', async () => {
    // Create second vehicle
    const vehicle2Result = await db.createVehicle({
      licensePlate: 'TEST-002',
      vehicleType: 'Sedan',
      model: 'Toyota Camry',
      year: 2023,
      capacity: 5,
      status: 'available',
      fuelLevel: '75',
    });
    const vehicleId2 = (vehicle2Result as any).insertId || 2;

    // Create tracking for both vehicles
    await db.createVehicleTracking({
      vehicleId: vehicleId,
      latitude: '31.945',
      longitude: '35.927',
      speed: '40',
      heading: '90',
      accuracy: '5',
      timestamp: new Date(),
    });

    await db.createVehicleTracking({
      vehicleId: vehicleId2,
      latitude: '31.950',
      longitude: '35.930',
      speed: '60',
      heading: '180',
      accuracy: '6',
      timestamp: new Date(),
    });

    const tracking1 = await db.getLatestVehicleTracking(vehicleId);
    const tracking2 = await db.getLatestVehicleTracking(vehicleId2);

    expect(tracking1?.vehicleId).toBe(vehicleId);
    expect(tracking2?.vehicleId).toBe(vehicleId2);
    expect(tracking1?.latitude).not.toBe(tracking2?.latitude);

    // Cleanup
    await db.deleteVehicle(vehicleId2);
  });
});
