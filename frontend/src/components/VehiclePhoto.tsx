import { CarFront } from 'lucide-react';
import { api } from '../api';
import type { Vehicle } from '../types';

export default function VehiclePhoto({
  vehicle,
  className = '',
}: {
  vehicle: Pick<Vehicle, 'id' | 'make' | 'model' | 'year' | 'photoPath' | 'photoUrl'>;
  className?: string;
}) {
  const src =
    vehicle.photoUrl ||
    (vehicle.photoPath
      ? `/uploads/vehicles/${encodeURIComponent(vehicle.photoPath)}`
      : api.vehiclePhotoUrl(vehicle.id));

  return (
    <div className={`vehicle-photo ${className}`}>
      {vehicle.photoPath || vehicle.photoUrl ? (
        <img src={src} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} />
      ) : (
        <div className="vehicle-photo-default">
          <CarFront size={42} />
          <span className="mono">{vehicle.make || 'AUTO'}</span>
        </div>
      )}
    </div>
  );
}
