import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Navigation, AlertCircle, RefreshCw } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { MapView } from '@/components/Map';
import { formatDateTime, formatDate as formatDateLib } from '@/lib/dateFormatter';


interface Vehicle {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  speed: number;
  lastUpdate: string;
  status: 'active' | 'idle' | 'offline';
}

export default function Tracking() {
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

   // استدعاء البيانات من tRPC
  const { data: vehiclesData, isLoading: isDataLoading, refetch } = trpc.tracking.getTelecomcubeVehicles.useQuery();
  
  // Auto-refresh كل 15 ثانية
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 15000); // 15 ثانية
    
    return () => clearInterval(interval);
  }, [refetch]);

  useEffect(() => {
    if (vehiclesData?.vehicles) {
      // تحويل البيانات إلى الصيغة المطلوبة
      const typedVehicles = vehiclesData.vehicles.map((v: any) => ({
        id: v.id || v.vehicleId || 'unknown',
        name: v.name || v.licensePlate || `المركبة ${v.id}`,
        latitude: parseFloat(v.latitude) || 31.945,
        longitude: parseFloat(v.longitude) || 35.927,
        speed: parseFloat(v.speed) || 0,
        lastUpdate: v.timestamp || new Date().toISOString(),
        status: (v.status || 'offline') as 'active' | 'idle' | 'offline'
      }));
      
      setAllVehicles(typedVehicles);
      
      // تحديد أول مركبة كافتراضية
      if (typedVehicles.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(typedVehicles[0].id);
        setSelectedVehicle(typedVehicles[0]);
      }
    }
  }, [vehiclesData]);

  // تحديث المركبة المختارة عند تغيير الفلتر
  useEffect(() => {
    if (selectedVehicleId) {
      const vehicle = allVehicles.find(v => v.id === selectedVehicleId);
      if (vehicle) {
        setSelectedVehicle(vehicle);
        updateMarkers([vehicle]);
        if (mapRef.current) {
          mapRef.current.setCenter({
            lat: vehicle.latitude,
            lng: vehicle.longitude,
          });
          mapRef.current.setZoom(14);
        }
      }
    }
  }, [selectedVehicleId, allVehicles]);

  const handleMapReady = (map: any) => {
    mapRef.current = map;
    if (selectedVehicle) {
      updateMarkers([selectedVehicle]);
      map.setCenter({
        lat: selectedVehicle.latitude,
        lng: selectedVehicle.longitude,
      });
      map.setZoom(14);
    }
  };

  const updateMarkers = (vehicles: Vehicle[]) => {
    if (!mapRef.current) return;

    // حذف العلامات القديمة
    markersRef.current.forEach((marker: any) => marker.setMap(null));
    markersRef.current = [];

    // إضافة علامات جديدة للمركبات
    vehicles.forEach((vehicle) => {
      try {
        const marker = new google.maps.Marker({
          position: { lat: vehicle.latitude, lng: vehicle.longitude },
          map: mapRef.current,
          title: vehicle.name,
          icon: getMarkerIcon(vehicle.status),
        });

        marker.addListener('click', () => {
          setSelectedVehicleId(vehicle.id);
          mapRef.current.panTo({ lat: vehicle.latitude, lng: vehicle.longitude });
        });

        markersRef.current.push(marker);
      } catch (error) {
        console.error('Error creating marker:', error);
      }
    });
  };

  const getMarkerIcon = (status: string) => {
    const colors: { [key: string]: string } = {
      active: '#EF4444',    // أحمر للمركبات النشطة
      idle: '#F59E0B',      // برتقالي للمركبات المتوقفة
      offline: '#9CA3AF',   // رمادي للمركبات غير المتصلة
    };
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: colors[status] || '#9CA3AF',
      fillOpacity: 1,
      strokeColor: '#fff',
      strokeWeight: 2,
    };
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await refetch();
    setIsLoading(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ar-JO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // استخدام formatDate من المكتبة بدلاً من دالة محلية
  const formatDate = formatDateLib;

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: any } = {
      active: { variant: 'default', label: 'نشطة' },
      idle: { variant: 'secondary', label: 'متوقفة' },
      offline: { variant: 'outline', label: 'غير متصلة' },
    };
    return variants[status] || { variant: 'outline', label: 'غير معروف' };
  };

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">تتبع المركبات</h1>
          <p className="text-muted-foreground">عرض مواقع المركبات في الوقت الفعلي</p>
        </div>
        <Button onClick={handleRefresh} disabled={isLoading} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          {isLoading ? 'جاري التحديث...' : 'تحديث'}
        </Button>
      </div>

      {/* فلتر اختيار المركبة */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">اختيار المركبة</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="اختر مركبة" />
            </SelectTrigger>
            <SelectContent>
              {allVehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.name} - {vehicle.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* الخريطة والقائمة */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* الخريطة */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>خريطة المركبات</CardTitle>
              <CardDescription>
                {selectedVehicle ? `موقع ${selectedVehicle.name}` : 'لا توجد مركبة مختارة'}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              {selectedVehicle ? (
                <MapView onMapReady={handleMapReady} />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">يرجى اختيار مركبة</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* معلومات المركبة */}
        <div className="space-y-4">
          {selectedVehicle && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{selectedVehicle.name}</CardTitle>
                <CardDescription>
                  <Badge className="mt-2">
                    {getStatusBadge(selectedVehicle.status).label}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">السرعة</p>
                  <p className="font-semibold">{selectedVehicle.speed} km/h</p>
                </div>
                <div>
                  <p className="text-muted-foreground">خط العرض</p>
                  <p className="font-semibold text-xs">{selectedVehicle.latitude.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">خط الطول</p>
                  <p className="font-semibold text-xs">{selectedVehicle.longitude.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">آخر تحديث</p>
                  <p className="font-semibold text-xs">
                    {formatDate(selectedVehicle.lastUpdate)} {formatTime(selectedVehicle.lastUpdate)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* تفاصيل المركبة المختارة */}
      {selectedVehicle && (
        <Card>
          <CardHeader>
            <CardTitle>تفاصيل المركبة</CardTitle>
            <CardDescription>{selectedVehicle.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">الاسم</p>
                <p className="font-semibold">{selectedVehicle.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الحالة</p>
                <Badge className="mt-1">
                  {getStatusBadge(selectedVehicle.status).label}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">السرعة</p>
                <p className="font-semibold">{selectedVehicle.speed} km/h</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">آخر تحديث</p>
                <p className="font-semibold text-sm">
                  {formatTime(selectedVehicle.lastUpdate)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">خط العرض</p>
                <p className="font-semibold">{selectedVehicle.latitude.toFixed(6)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">خط الطول</p>
                <p className="font-semibold">{selectedVehicle.longitude.toFixed(6)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">معرف المركبة</p>
                <p className="font-semibold text-xs">{selectedVehicle.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
