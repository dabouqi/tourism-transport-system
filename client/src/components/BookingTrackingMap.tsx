import { useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Clock, Gauge } from 'lucide-react';

interface VehicleTracking {
  id: number;
  vehicleId: number;
  latitude: string;
  longitude: string;
  speed: string | null;
  heading: string | null;
  accuracy: string | null;
  timestamp: string | Date;
  createdAt: string | Date;
}

interface Vehicle {
  id: number;
  licensePlate: string;
  vehicleType: string;
  model: string;
  year: number;
  capacity: number;
  status: string;
  fuelLevel: string | null;
}

interface BookingTrackingMapProps {
  vehicle?: Vehicle | null;
  tracking?: VehicleTracking | null;
  isLoading?: boolean;
}

export function BookingTrackingMap({ vehicle, tracking, isLoading }: BookingTrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || !tracking) return;

    // Initialize map
    if (!mapInstanceRef.current && window.google) {
      const lat = parseFloat(tracking.latitude);
      const lng = parseFloat(tracking.longitude);

      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        zoom: 15,
        center: { lat, lng },
        mapTypeControl: true,
        fullscreenControl: true,
        zoomControl: true,
        streetViewControl: false,
      });

      // Add marker
      markerRef.current = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapInstanceRef.current,
        title: vehicle?.licensePlate || 'المركبة',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
    } else if (mapInstanceRef.current && tracking) {
      // Update marker position
      const lat = parseFloat(tracking.latitude);
      const lng = parseFloat(tracking.longitude);

      if (markerRef.current) {
        markerRef.current.setPosition({ lat, lng });
      }

      mapInstanceRef.current.panTo({ lat, lng });
    }
  }, [tracking, vehicle]);

  if (!vehicle || !tracking) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 text-center">
          <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">لم يتم تعيين مركبة لهذا الحجز</p>
        </CardContent>
      </Card>
    );
  }

  const speed = tracking.speed ? parseFloat(tracking.speed) : 0;
  const heading = tracking.heading ? parseFloat(tracking.heading) : 0;
  const lat = parseFloat(tracking.latitude);
  const lng = parseFloat(tracking.longitude);

  return (
    <div className="space-y-4">
      {/* خريطة التتبع */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg">موقع المركبة الحالي</CardTitle>
          <CardDescription>تحديث مباشر لموقع المركبة على الخريطة</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div
            ref={mapRef}
            className="w-full h-80 bg-gray-100"
            style={{ minHeight: '320px' }}
          />
        </CardContent>
      </Card>

      {/* تفاصيل المركبة والتتبع */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* بيانات المركبة */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">بيانات المركبة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm">لوحة الترخيص</span>
              <span className="font-semibold">{vehicle.licensePlate}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm">النوع</span>
              <span className="font-semibold">{vehicle.vehicleType}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm">الموديل</span>
              <span className="font-semibold">{vehicle.model}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm">السنة</span>
              <span className="font-semibold">{vehicle.year}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm">السعة</span>
              <span className="font-semibold">{vehicle.capacity} راكب</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm">الحالة</span>
              <Badge
                variant={vehicle.status === 'available' ? 'default' : 'secondary'}
                className={
                  vehicle.status === 'available'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }
              >
                {vehicle.status === 'available' ? 'متاحة' : vehicle.status}
              </Badge>
            </div>
            {vehicle.fuelLevel && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">مستوى الوقود</span>
                <span className="font-semibold">{vehicle.fuelLevel}%</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* بيانات التتبع */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">بيانات التتبع</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                الموقع
              </span>
              <span className="font-semibold text-sm">{lat.toFixed(4)}, {lng.toFixed(4)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                السرعة
              </span>
              <span className="font-semibold">{speed.toFixed(1)} km/h</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                الاتجاه
              </span>
              <span className="font-semibold">{heading.toFixed(0)}°</span>
            </div>
            {tracking.accuracy && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">دقة الموقع</span>
                <span className="font-semibold">{parseFloat(tracking.accuracy).toFixed(1)} م</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                آخر تحديث
              </span>
              <span className="font-semibold text-sm">
                {new Date(tracking.timestamp).toLocaleTimeString('ar-SA')}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
