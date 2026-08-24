/**
 * Major hospitals in Tuguegarao City, Cagayan (study area).
 * Coordinates verified against OpenStreetMap amenity locations (Aug 2026)
 * for nearest-facility guidance (not an official DOH registry).
 */
export interface StaticHospitalRecord {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  category: 'government' | 'private';
}

export const TUGUEGARAO_HOSPITALS: StaticHospitalRecord[] = [
  {
    id: 'cvmc',
    name: 'Cagayan Valley Medical Center (CVMC)',
    address: 'Dalan na Pagayaya, Carig Sur, Tuguegarao City, Cagayan',
    latitude: 17.6566106,
    longitude: 121.7470166,
    phone: '(078) 302-0000',
    category: 'government',
  },
  {
    id: 'tcpgh',
    name: "Tuguegarao City People's General Hospital",
    address: 'Blumentritt Street, Centro 7, Tuguegarao City, Cagayan',
    latitude: 17.6129003,
    longitude: 121.7294533,
    phone: '(078) 304-1114',
    category: 'government',
  },
  {
    id: 'st-paul',
    name: 'St. Paul Hospital of Tuguegarao',
    address: 'Luna Street Extension, Ugac, Tuguegarao City, Cagayan',
    latitude: 17.6140503,
    longitude: 121.7074356,
    phone: '(078) 844-2520',
    category: 'private',
  },
  {
    id: 'divine-mercy',
    name: 'Divine Mercy Wellness Center',
    address: 'Arellano Street, Centro 6, Tuguegarao City, Cagayan',
    latitude: 17.6112955,
    longitude: 121.7273876,
    phone: '(078) 844-4624',
    category: 'private',
  },
  {
    id: 'holy-infant',
    name: 'Holy Infant Hospital',
    address: 'Magallanes Street, Centro 8, Tuguegarao City, Cagayan',
    latitude: 17.6156545,
    longitude: 121.7258677,
    phone: '(078) 844-1039',
    category: 'private',
  },
  {
    id: 'de-leon',
    name: 'Dr. Domingo S. de Leon General Hospital',
    address: 'Bonifacio Street, Centro 10, Tuguegarao City, Cagayan',
    latitude: 17.6102305,
    longitude: 121.7281608,
    phone: null,
    category: 'private',
  },
  {
    id: 'cudmc',
    name: 'Cagayan United Doctors Medical Center (CUDMC)',
    address: 'Bagay Road, Caritan Centro, Tuguegarao City, Cagayan',
    latitude: 17.6242327,
    longitude: 121.7214578,
    phone: '(078) 304-8888',
    category: 'private',
  },
  {
    id: 'guzman',
    name: 'Dr. Ronald P. Guzman Medical Center',
    address: 'Enrile Boulevard, Carig, Tuguegarao City, Cagayan',
    latitude: 17.649502,
    longitude: 121.7559016,
    phone: '(078) 304-0925',
    category: 'private',
  },
  {
    id: 'raphael',
    name: 'Raphael General Hospital',
    address: 'Bagay Road, Caritan Centro, Tuguegarao City, Cagayan',
    latitude: 17.6334666,
    longitude: 121.7126868,
    phone: '(078) 846-0815',
    category: 'private',
  },
  {
    id: 'ace',
    name: 'ACE Medical Center - Tuguegarao',
    address: 'Ugac-Pallua Road, Pallua, Tuguegarao City, Cagayan',
    latitude: 17.6202283,
    longitude: 121.7070237,
    phone: '(078) 846-8888',
    category: 'private',
  },
];

export const TUGUEGARAO_HOSPITAL_COUNT = TUGUEGARAO_HOSPITALS.length;
