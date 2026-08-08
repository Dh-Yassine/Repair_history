import { useState } from 'react';
import { CarFront } from 'lucide-react';
import { vehiclePhotoSrc } from '../lib/vehiclePhoto';
import type { Vehicle } from '../types';

export default function VehiclePhoto({
  vehicle,
  className = '',
}: {
  vehicle: Pick<Vehicle, 'id' | 'make' | 'model' | 'year' | 'photoPath' | 'photoUrl'>;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const src = vehiclePhotoSrc(vehicle);
  const showImage = src && !broken;

  return (
    <div className={`vehicle-photo ${className}`}>
      {showImage ? (
        <img
          src={src}
          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="vehicle-photo-default">
          <CarFront size={42} />
          <span className="mono">{vehicle.make || 'AUTO'}</span>
        </div>
      )}
    </div>
  );
}
