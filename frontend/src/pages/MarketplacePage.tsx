import { useEffect, useState } from 'react';
import { ExternalLink, PackageCheck, Search, ShoppingBag, Wrench } from 'lucide-react';
import { api } from '../api';
import PageTransition from '../components/layout/PageTransition';
import type { Vehicle, SparePart } from '../types';

export default function MarketplacePage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [parts, setParts] = useState<SparePart[]>([]);
  const [vehicleLabel, setVehicleLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [partsLoading, setPartsLoading] = useState(false);

  useEffect(() => {
    api
      .vehicles()
      .then((d) => {
        setVehicles(d.vehicles);
        if (d.vehicles[0]) setSelectedId(d.vehicles[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setPartsLoading(true);
    api
      .marketplaceParts(selectedId)
      .then((d) => {
        setParts(d.parts);
        setVehicleLabel(`${d.vehicle.year} ${d.vehicle.make} ${d.vehicle.model}`);
      })
      .catch(() => setParts([]))
      .finally(() => setPartsLoading(false));
  }, [selectedId]);

  if (loading) {
    return (
      <PageTransition>
        <div className="skeleton" style={{ height: 120 }} />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="hero-panel page-hero compact">
        <div className="hero-copy">
          <div className="hero-icon" style={{ marginBottom: 14 }}>
            <ShoppingBag size={24} />
          </div>
          <p className="section-eyebrow">Partner Marketplace</p>
          <h1 className="display page-title">Parts matched to your car</h1>
          <p className="muted" style={{ marginTop: 10 }}>
            Pick a vehicle and AutoHistory filters compatible parts, supplier links, and universal accessories.
          </p>
        </div>
        <div className="hero-actions">
          <span className="tag tag-green">
            <PackageCheck size={12} /> Affiliate-ready catalog
          </span>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <div className="card empty-panel">
          <div>
            <div className="feature-card-icon" style={{ margin: '0 auto 12px' }}>
              <Wrench size={20} />
            </div>
            <p>Add a vehicle on the dashboard to see recommended parts.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="control-bar">
            <div className="control-group">
              <Search size={18} style={{ color: 'var(--color-accent)' }} />
              <label className="mono muted" htmlFor="vehicle-select">
                Select vehicle
              </label>
              <select
                id="vehicle-select"
                className="input"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                style={{ minWidth: 260 }}
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.year} {v.make} {v.model}
                  </option>
                ))}
              </select>
            </div>
            {vehicleLabel && (
              <span className="tag tag-green">{parts.length} parts for {vehicleLabel}</span>
            )}
          </div>

          {partsLoading ? (
            <div className="grid-cards">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card skeleton" style={{ height: 140 }} />
              ))}
            </div>
          ) : parts.length === 0 ? (
            <div className="card">
              <p>No parts matched this vehicle yet. Universal accessories may appear after catalog updates.</p>
            </div>
          ) : (
            <div className="grid-cards">
              {parts.map((p) => (
                <article key={p.id} className="card feature-card card-hover">
                  <div className="feature-card-top">
                    <div className="feature-card-icon">
                      <Wrench size={18} />
                    </div>
                    <span className="tag">{p.category}</span>
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>{p.partName}</h3>
                  <p className="mono" style={{ color: 'var(--color-accent)', fontSize: 18 }}>
                    ${p.price.toFixed(2)}
                  </p>
                  <p className="muted" style={{ fontSize: 13 }}>
                    via {p.supplier}
                    {p.fitsVehicle === false && ' · may need fit check'}
                  </p>
                  <a
                    href={p.buyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-sm"
                    style={{ marginTop: 'auto', alignSelf: 'flex-start' }}
                  >
                    Buy <ExternalLink size={14} />
                  </a>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </PageTransition>
  );
}
