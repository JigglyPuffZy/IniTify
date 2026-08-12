/**
 * Major hospitals in Tuguegarao City, Cagayan (study area).
 * Curated from DOH/HMO/public listings — coordinates are map-derived approximations
 * for nearest-facility guidance only (not an official DOH registry).
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
    address: 'Maharlika Highway, Carig Sur, Tuguegarao City, Cagayan',
    latitude: 17.6097,
    longitude: 121.7283,
    phone: '(078) 302-0000',
    category: 'government',
  },
  {
    id: 'tcpgh',
    name: "Tuguegarao City People's General Hospital",
    address: 'Luna Street, Centro 6, Tuguegarao City, Cagayan',
    latitude: 17.6131,
    longitude: 121.7269,
    phone: '(078) 304-1114',
    category: 'government',
  },
  {
    id: 'st-paul',
    name: 'St. Paul Hospital of Tuguegarao',
    address: 'Luna Street Extension, Ugac Norte, Tuguegarao City, Cagayan',
    latitude: 17.61397,
    longitude: 121.70727,
    phone: '(078) 844-2520',
    category: 'private',
  },
  {
    id: 'divine-mercy',
    name: 'Divine Mercy Wellness Center',
    address: 'Arellano cor. Burgos Street, Centro 6, Tuguegarao City, Cagayan',
    latitude: 17.615616,
    longitude: 121.729309,
    phone: '(078) 844-4624',
    category: 'private',
  },
  {
    id: 'holy-infant',
    name: 'Holy Infant Hospital',
    address: '54 Washington Street, Tuguegarao City, Cagayan',
    latitude: 17.615953,
    longitude: 121.725845,
    phone: '(078) 844-1039',
    category: 'private',
  },
  {
    id: 'cudmc',
    name: 'Cagayan United Doctors Medical Center (CUDMC)',
    address: '7 Bagay Road, Caritan Centro, Tuguegarao City, Cagayan',
    latitude: 17.6035,
    longitude: 121.7178,
    phone: '(078) 304-8888',
    category: 'private',
  },
  {
    id: 'guzman',
    name: 'Dr. Ronald P. Guzman Medical Center',
    address: 'Enrile Boulevard, Carig, Tuguegarao City, Cagayan',
    latitude: 17.6008,
    longitude: 121.7195,
    phone: '(078) 304-0925',
    category: 'private',
  },
  {
    id: 'raphael',
    name: 'Raphael General Hospital',
    address: 'Bagay Road, Atulayan Sur, Tuguegarao City, Cagayan',
    latitude: 17.5988,
    longitude: 121.7135,
    phone: '(078) 846-0815',
    category: 'private',
  },
  {
    id: 'maricar',
    name: 'Maricar Hospital',
    address: 'Bagay Road, Tuguegarao City, Cagayan',
    latitude: 17.6012,
    longitude: 121.7154,
    phone: null,
    category: 'private',
  },
  {
    id: 'ace',
    name: 'ACE Medical Center - Tuguegarao',
    address: 'Pallua Road, Pallua Norte, Tuguegarao City, Cagayan',
    latitude: 17.6285,
    longitude: 121.732,
    phone: '(078) 846-8888',
    category: 'private',
  },
];

export const TUGUEGARAO_HOSPITAL_COUNT = TUGUEGARAO_HOSPITALS.length;
