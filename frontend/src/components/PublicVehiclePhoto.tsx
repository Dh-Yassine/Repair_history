import { useState } from 'react';
import { CarFront } from 'lucide-react';
import { publicVehiclePhotoSrc } from '../lib/vehiclePhoto';
import type { PublicVehicle } from '../types';

export default function PublicVehiclePhoto({
  vehicle,
  token,
}: {
  vehicle: PublicVehicle;
  token: string;
}) {
  const [broken, setBroken] = useState(false);
  const src = publicVehiclePhotoSrc(vehicle, token);
  const showImage = src && !broken;

  return (
    <div className="public-vehicle-photo">
      {showImage ? (
        <img
          src={src}
          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
          className="public-vehicle-photo__img"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="public-vehicle-photo__placeholder" aria-hidden="true">
          <div className="public-vehicle-photo__grid" />
          <div className="public-vehicle-photo__glow" />
          <CarFront size={52} strokeWidth={1.15} className="public-vehicle-photo__icon" />
          <p className="public-vehicle-photo__make mono">
            {vehicle.year} {vehicle.make}
          </p>
          <p className="public-vehicle-photo__model">{vehicle.model}</p>
        </div>
      )}
    </div>
  );
}
