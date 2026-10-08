import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, X, Crosshair, AlertTriangle } from 'lucide-react';
import { searchLocations, GeocodeResult } from '../../services/geocoding';
import { COLLEGE_HOTSPOTS } from '../../constants/hotspots';

interface LocationSearchProps {
  label: string;
  placeholder?: string;
  value: string;
  onSelect: (result: { name: string; lat: number; lng: number }) => void;
  dotColor?: 'emerald' | 'amber' | 'neon';
  onPickOnMap?: () => void;
  isPickingOnMap?: boolean;
}

export const LocationSearch: React.FC<LocationSearchProps> = ({
  label,
  placeholder = 'Search college landmark...',
  value,
  onSelect,
  dotColor = 'neon',
  onPickOnMap,
  isPickingOnMap = false,
}) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal query with external value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchLocations(query);
        setSuggestions(results);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLocation = (loc: GeocodeResult) => {
    setQuery(loc.name);
    setIsOpen(false);
    if (loc.warning) {
      setWarningMessage(loc.warning);
      setTimeout(() => setWarningMessage(null), 4500);
    } else {
      setWarningMessage(null);
    }
    onSelect(loc);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              dotColor === 'neon' || dotColor === 'emerald'
                ? 'bg-[#6366F1] shadow-[0_0_6px_#6366F1]'
                : 'bg-zinc-400'
            }`}
          />
          {label}
        </label>
        {onPickOnMap && (
          <button
            type="button"
            onClick={onPickOnMap}
            className={`text-[11px] font-medium flex items-center gap-1 px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
              isPickingOnMap
                ? 'bg-[#6366F1]/20 text-[#6366F1] border-[#6366F1]/50 shadow-[0_0_8px_rgba(99,102,241,0.3)]'
                : 'bg-[#161822] text-zinc-300 border-[#222634] hover:bg-[#1C1F2E]'
            }`}
          >
            <Crosshair className="w-3 h-3" />
            {isPickingOnMap ? 'Click map now' : 'Pick on map'}
          </button>
        )}
      </div>

      <div className="relative flex items-center">
        <div className="absolute left-2.5 text-zinc-400 pointer-events-none">
          <MapPin className="w-3.5 h-3.5" />
        </div>
        <input
          type="text"
          value={query}
          onFocus={() => {
            setIsOpen(true);
            if (suggestions.length === 0) {
              setSuggestions(
                COLLEGE_HOTSPOTS.map((h) => ({
                  name: h.name,
                  lat: h.lat,
                  lng: h.lng,
                }))
              );
            }
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full bg-[#0F1117] border border-[#222634] rounded-lg py-2 pl-8 pr-8 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#6366F1] focus:border-[#6366F1] transition-colors shadow-sm"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(true);
            }}
            className="absolute right-2.5 text-zinc-400 hover:text-zinc-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Geocoding Warning Banner */}
      {warningMessage && (
        <div className="mt-1.5 p-2 bg-[#161822] border border-[#6366F1]/60 rounded-lg text-[11px] text-[#6366F1] flex items-center gap-1.5 shadow-[0_0_10px_rgba(99,102,241,0.2)] animate-in fade-in duration-200">
          <AlertTriangle className="w-3.5 h-3.5 text-[#6366F1] shrink-0" />
          <span>{warningMessage}</span>
        </div>
      )}

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-[#161822] border border-[#222634] rounded-lg shadow-2xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-[#222634]">
          {/* Quick chip presets */}
          <div className="p-2 bg-[#0F1117] border-b border-[#222634]">
            <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-400 block mb-1">
              Campus Hotspots
            </span>
            <div className="flex flex-wrap gap-1">
              {COLLEGE_HOTSPOTS.slice(0, 4).map((h) => (
                <button
                  key={h.name}
                  type="button"
                  onClick={() => handleSelectLocation(h)}
                  className="text-[11px] font-medium bg-[#161822] hover:bg-[#1C1F2E] text-zinc-200 px-2 py-0.5 rounded-md transition-colors border border-[#222634] shadow-xs cursor-pointer"
                >
                  {h.short_name}
                </button>
              ))}
            </div>
          </div>

          {/* Results list */}
          {isLoading ? (
            <div className="p-3 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
              <Search className="w-3.5 h-3.5 animate-spin text-[#6366F1]" /> Searching...
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((loc, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectLocation(loc)}
                className="w-full text-left px-3 py-2 hover:bg-[#1C1F2E] flex items-center gap-2 transition-colors group cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#6366F1] shrink-0" />
                <span className="text-xs text-zinc-200 group-hover:text-white truncate">
                  {loc.name}
                </span>
                {loc.isFallback && (
                  <span className="ml-auto text-[9px] bg-[#0F1117] text-[#6366F1] px-1 py-0.2 rounded border border-[#6366F1]/30">
                    Grid
                  </span>
                )}
              </button>
            ))
          ) : (
            <div className="p-3 text-center text-xs text-zinc-400">
              No matching campus landmarks found
            </div>
          )}
        </div>
      )}
    </div>
  );
};
