import { HotspotLocation } from '../types';

export const COLLEGE_HOTSPOTS: HotspotLocation[] = [
  {
    name: 'College Main Gate (Gate 1)',
    short_name: 'Gate 1',
    category: 'gate',
    lat: 18.5308,
    lng: 73.8553,
  },
  {
    name: 'Hostel Block A & Mess',
    short_name: 'Hostel A',
    category: 'hostel',
    lat: 18.5342,
    lng: 73.8541,
  },
  {
    name: 'Central Library Circle',
    short_name: 'Library',
    category: 'library',
    lat: 18.5335,
    lng: 73.8561,
  },
  {
    name: 'Metro Station (Gate 2)',
    short_name: 'Metro Stn',
    category: 'transit',
    lat: 18.529,
    lng: 73.862,
  },
  {
    name: 'Railway Station Junction',
    short_name: 'Railway Stn',
    category: 'transit',
    lat: 18.5284,
    lng: 73.8744,
  },
  {
    name: 'Tech Park & Cafeteria',
    short_name: 'Tech Park',
    category: 'cafeteria',
    lat: 18.5529,
    lng: 73.8821,
  },
  {
    name: 'City Center Mall',
    short_name: 'City Mall',
    category: 'transit',
    lat: 18.5372,
    lng: 73.8812,
  },
  {
    name: 'Girls Hostel Campus',
    short_name: 'Girls Hostel',
    category: 'hostel',
    lat: 18.536,
    lng: 73.8525,
  },
];

export const DEFAULT_MAP_CENTER: [number, number] = [18.532, 73.86];
export const DEFAULT_MAP_ZOOM = 14;
