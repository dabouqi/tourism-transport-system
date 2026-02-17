import { useEffect, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";

export interface VehicleTrackingData {
  vehicleId: number;
  licensePlate: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  altitude: number;
  accuracy: number;
  lastUpdated: Date;
  status: "available" | "in_trip" | "maintenance" | "inactive";
}

export interface UseVehicleTrackingOptions {
  vehicleId?: number;
  pollingInterval?: number; // بالميلي ثانية، الافتراضي 30 ثانية
  enabled?: boolean;
}

/**
 * Hook للتتبع المباشر الحي للمركبات
 * يقوم بتحديث موقع المركبة تلقائياً كل 30 ثانية
 */
export function useVehicleTracking(options: UseVehicleTrackingOptions = {}) {
  const {
    vehicleId,
    pollingInterval = 30000, // 30 ثانية
    enabled = true,
  } = options;

  const [trackingData, setTrackingData] = useState<VehicleTrackingData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // استدعاء tRPC للحصول على بيانات التتبع
  const { data: vehicleData, refetch } = trpc.vehicles.getTracking.useQuery(
    { vehicleId: vehicleId || 0 },
    {
      enabled: enabled && !!vehicleId,
      refetchInterval: pollingInterval,
    }
  );

  // تحديث البيانات عند تغيير vehicleData
  useEffect(() => {
    if (vehicleData) {
      setTrackingData({
        vehicleId: vehicleData.id,
        licensePlate: vehicleData.licensePlate,
        latitude: vehicleData.latitude,
        longitude: vehicleData.longitude,
        speed: vehicleData.speed,
        heading: vehicleData.heading,
        altitude: vehicleData.altitude,
        accuracy: vehicleData.accuracy,
        lastUpdated: new Date(vehicleData.lastUpdated),
        status: vehicleData.status,
      });
      setError(null);
    }
  }, [vehicleData]);

  // دالة لتحديث البيانات يدوياً
  const updateTracking = useCallback(async () => {
    if (!vehicleId) return;
    setIsLoading(true);
    try {
      await refetch();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "فشل تحديث بيانات التتبع"
      );
    } finally {
      setIsLoading(false);
    }
  }, [vehicleId, refetch]);

  return {
    trackingData,
    isLoading,
    error,
    updateTracking,
  };
}

/**
 * Hook للتتبع المتعدد (عدة مركبات)
 */
export function useMultipleVehicleTracking(
  vehicleIds: number[],
  options: Omit<UseVehicleTrackingOptions, "vehicleId"> = {}
) {
  const [trackingDataMap, setTrackingDataMap] = useState<
    Record<number, VehicleTrackingData>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // استدعاء tRPC للحصول على بيانات التتبع المتعددة
  const { data: vehiclesData, refetch } =
    trpc.vehicles.getMultipleTracking.useQuery(
      { vehicleIds },
      {
        enabled: vehicleIds.length > 0,
        refetchInterval: options.pollingInterval || 30000,
      }
    );

  // تحديث البيانات عند تغيير vehiclesData
  useEffect(() => {
    if (vehiclesData && Array.isArray(vehiclesData)) {
      const newMap: Record<number, VehicleTrackingData> = {};
      vehiclesData.forEach((vehicle: any) => {
        newMap[vehicle.id] = {
          vehicleId: vehicle.id,
          licensePlate: vehicle.licensePlate,
          latitude: vehicle.latitude,
          longitude: vehicle.longitude,
          speed: vehicle.speed,
          heading: vehicle.heading,
          altitude: vehicle.altitude,
          accuracy: vehicle.accuracy,
          lastUpdated: new Date(vehicle.lastUpdated),
          status: vehicle.status,
        };
      });
      setTrackingDataMap(newMap);
      setError(null);
    }
  }, [vehiclesData]);

  // دالة لتحديث البيانات يدوياً
  const updateTracking = useCallback(async () => {
    if (vehicleIds.length === 0) return;
    setIsLoading(true);
    try {
      await refetch();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "فشل تحديث بيانات التتبع"
      );
    } finally {
      setIsLoading(false);
    }
  }, [vehicleIds, refetch]);

  return {
    trackingDataMap,
    isLoading,
    error,
    updateTracking,
  };
}
