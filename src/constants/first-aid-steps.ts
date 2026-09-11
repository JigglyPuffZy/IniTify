import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IonIcon = ComponentProps<typeof Ionicons>['name'];

export interface FirstAidStepMeta {
  icon: IonIcon;
  color: string;
  bg: string;
}

const DEFAULT_META: FirstAidStepMeta = {
  icon: 'medkit-outline',
  color: '#2563EB',
  bg: '#EFF6FF',
};

/** Visual hints for heat first-aid steps on the Emergency screen */
export const FIRST_AID_STEP_META: Record<string, FirstAidStepMeta> = {
  'Move to a cooler place': {
    icon: 'home-outline',
    color: '#0284C7',
    bg: '#E0F2FE',
  },
  'Rest and loosen clothing': {
    icon: 'bed-outline',
    color: '#7C3AED',
    bg: '#EDE9FE',
  },
  'Cool the body': {
    icon: 'snow-outline',
    color: '#0891B2',
    bg: '#CFFAFE',
  },
  'Hydrate if conscious': {
    icon: 'water-outline',
    color: '#059669',
    bg: '#D1FAE5',
  },
  'Watch for emergency signs': {
    icon: 'eye-outline',
    color: '#D97706',
    bg: '#FEF3C7',
  },
  'Call for help': {
    icon: 'call-outline',
    color: '#DC2626',
    bg: '#FEE2E2',
  },
  'Avoid sudden exertion': {
    icon: 'walk-outline',
    color: '#7C3AED',
    bg: '#EDE9FE',
  },
  'Continue prescribed medicines': {
    icon: 'medical-outline',
    color: '#2563EB',
    bg: '#EFF6FF',
  },
  'Watch for warning signs': {
    icon: 'alert-circle-outline',
    color: '#DC2626',
    bg: '#FEE2E2',
  },
  'Limit physical strain': {
    icon: 'fitness-outline',
    color: '#EA580C',
    bg: '#FFEDD5',
  },
  'Monitor breathing and chest symptoms': {
    icon: 'heart-outline',
    color: '#DB2777',
    bg: '#FCE7F3',
  },
};

export function getFirstAidStepMeta(heading: string): FirstAidStepMeta {
  return FIRST_AID_STEP_META[heading] ?? DEFAULT_META;
}
