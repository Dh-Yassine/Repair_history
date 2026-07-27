import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Plus } from 'lucide-react';
import { formatKm } from '../lib/format';
import VehiclePhoto from './VehiclePhoto';
import { useLanguage } from '../i18n/LanguageContext';
import type { Vehicle } from '../types';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function VehicleSwitcher({
  vehicles,
  activeId,
  canAdd,
  onSelect,
  onAdd,
}: {
  vehicles: Vehicle[];
  activeId: string;
  canAdd?: boolean;
  onSelect: (id: string, direction: number) => void;
  onAdd: () => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activeIndex = Math.max(0, vehicles.findIndex((v) => v.id === activeId));
  const active = vehicles[activeIndex];

  useEffect(() => {
    if (open) setHighlight(activeIndex);
  }, [open, activeIndex]);

  /** Roving tabindex: keep DOM focus on the highlighted option while open. */
  useEffect(() => {
    if (!open) return;
    optionRefs.current[highlight]?.focus();
  }, [open, highlight]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  /** Left/right arrows cycle vehicles while the list is closed. */
  useEffect(() => {
    if (open) return;
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.key === 'ArrowLeft' && activeIndex > 0) {
        e.preventDefault();
        onSelect(vehicles[activeIndex - 1].id, -1);
      }
      if (e.key === 'ArrowRight' && activeIndex < vehicles.length - 1) {
        e.preventDefault();
        onSelect(vehicles[activeIndex + 1].id, 1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, activeIndex, vehicles, onSelect]);

  function close(refocus = true) {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }

  function pick(index: number) {
    const next = vehicles[index];
    if (!next) return;
    onSelect(next.id, index > activeIndex ? 1 : index < activeIndex ? -1 : 0);
    close();
  }

  /** Handled on the popover so it works no matter which option holds focus. */
  function onPopKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(vehicles.length - 1, h + 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    }
    if (e.key === 'Home') {
      e.preventDefault();
      setHighlight(0);
    }
    if (e.key === 'End') {
      e.preventDefault();
      setHighlight(vehicles.length - 1);
    }
  }

  if (!active) return null;

  const activeName = active.nickname || `${active.year} ${active.make} ${active.model}`;

  return (
    <div className="vsw" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`vsw__trigger ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('dashboard.switchVehicle')}
      >
        <VehiclePhoto vehicle={active} className="vsw__thumb" />
        <span className="vsw__trigger-text">
          <span className="vsw__eyebrow">{t('dashboard.switchVehicle')}</span>
          <span className="vsw__name">{activeName}</span>
        </span>
        <span className="vsw__counter mono">
          {activeIndex + 1}/{vehicles.length}
        </span>
        <ChevronDown size={16} className="vsw__chevron" aria-hidden />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="vsw__pop"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: EASE }}
            onKeyDown={onPopKeyDown}
          >
            <ul className="vsw__list" role="listbox" aria-label={t('dashboard.switchVehicle')}>
              {vehicles.map((v, i) => {
                const selected = v.id === active.id;
                const name = v.nickname || `${v.year} ${v.make} ${v.model}`;
                const sub = v.nickname ? `${v.year} ${v.make} ${v.model}` : formatKm(v.mileage);
                return (
                  <li key={v.id} role="none">
                    <button
                      ref={(el) => {
                        optionRefs.current[i] = el;
                      }}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      tabIndex={i === highlight ? 0 : -1}
                      className={`vsw__option ${selected ? 'is-selected' : ''} ${i === highlight ? 'is-highlighted' : ''}`}
                      onClick={() => pick(i)}
                      onMouseEnter={() => setHighlight(i)}
                    >
                      <VehiclePhoto vehicle={v} className="vsw__thumb" />
                      <span className="vsw__option-text">
                        <span className="vsw__option-name">{name}</span>
                        <span className="vsw__option-sub mono">{sub}</span>
                      </span>
                      <span className="vsw__option-count mono">{v._count?.events ?? 0}</span>
                      {selected && <Check size={15} className="vsw__check" aria-hidden />}
                    </button>
                  </li>
                );
              })}
            </ul>
            {canAdd && (
              <button
                type="button"
                className="vsw__add"
                onClick={() => {
                  close(false);
                  onAdd();
                }}
              >
                <Plus size={15} /> {t('dashboard.addVehicle')}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
