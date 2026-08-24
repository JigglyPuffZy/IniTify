/**
 * Heat first-aid guidance — general steps plus condition-specific add-ons.
 * Decision-support only; not a medical device.
 */
import {
  formatConditionLabel,
  getActiveHealthConditions,
  isOtherConditionDetail,
} from '@/src/constants/health-conditions';

export interface FirstAidSection {
  heading: string;
  body: string;
}

export interface FirstAidConditionBlock {
  conditionKey: string;
  conditionLabel: string;
  sections: FirstAidSection[];
}

export interface FirstAidGuidance {
  isApproved: boolean;
  title: string;
  notice: string;
  generalSections: FirstAidSection[];
  conditionBlocks: FirstAidConditionBlock[];
}

const GENERAL_HEAT_SECTIONS: FirstAidSection[] = [
  {
    heading: 'Move to a cooler place',
    body: 'Get the person out of direct sun. Move indoors or to shade with airflow if possible.',
  },
  {
    heading: 'Rest and loosen clothing',
    body: 'Have the person lie down and rest. Remove excess clothing and equipment.',
  },
  {
    heading: 'Cool the body',
    body: 'Apply cool (not ice-cold) water to skin, use wet cloths on neck, armpits, and groin, or use a fan while misting with water.',
  },
  {
    heading: 'Hydrate if conscious',
    body: 'If the person is awake and able to swallow, give small sips of water or oral rehydration solution. Do not force fluids if confused or vomiting.',
  },
  {
    heading: 'Watch for emergency signs',
    body: 'Seek urgent medical help if there is hot dry skin, confusion, fainting, seizures, very high body temperature, or no improvement within 30 minutes.',
  },
  {
    heading: 'Call for help',
    body: 'Use the emergency contact notification in this app and go to the nearest hospital when symptoms are severe or worsening.',
  },
];

/** Extra heat first-aid steps keyed by profile health condition name */
const CONDITION_FIRST_AID: Record<string, FirstAidSection[]> = {
  'Hypertension / High Blood Pressure': [
    {
      heading: 'Avoid sudden exertion',
      body: 'Heat raises cardiovascular strain. Help the person rest and avoid standing up quickly after lying down.',
    },
    {
      heading: 'Continue prescribed medicines',
      body: 'Do not skip blood pressure medicines unless a doctor tells you to. Heat and dehydration can worsen dizziness.',
    },
    {
      heading: 'Watch for warning signs',
      body: 'Seek urgent care for severe headache, chest pain, vision changes, confusion, or fainting.',
    },
  ],
  'Heart Disease': [
    {
      heading: 'Limit physical strain',
      body: 'Heat increases heart workload. Keep activity minimal and stay in a cool, calm environment.',
    },
    {
      heading: 'Monitor breathing and chest symptoms',
      body: 'Watch for chest pain, pressure, shortness of breath, or irregular heartbeat — call emergency services if these occur.',
    },
    {
      heading: 'Follow your cardiac plan',
      body: 'Take prescribed medicines as directed and contact your doctor if symptoms worsen in hot weather.',
    },
  ],
  Asthma: [
    {
      heading: 'Move to cleaner, cooler air',
      body: 'Heat and poor air quality can trigger symptoms. Go indoors with ventilation or air conditioning if available.',
    },
    {
      heading: 'Use rescue inhaler as prescribed',
      body: 'If wheezing or shortness of breath develops, follow the person’s asthma action plan and use a rescue inhaler if directed.',
    },
    {
      heading: 'Seek help if breathing worsens',
      body: 'Call emergency services if lips turn blue, speech is difficult, or breathing does not improve after rescue medicine.',
    },
  ],
  Diabetes: [
    {
      heading: 'Check how the person feels',
      body: 'Heat and dehydration can affect blood sugar. Watch for shakiness, confusion, excessive thirst, sweating, or weakness.',
    },
    {
      heading: 'Offer fluids if allowed',
      body: 'Give small sips of water if awake and swallowing safely, unless fluids are restricted by a doctor.',
    },
    {
      heading: 'Have glucose ready if prescribed',
      body: 'If the person uses insulin or diabetes medicines, keep fast-acting glucose nearby per their care plan.',
    },
    {
      heading: 'Get urgent help for severe symptoms',
      body: 'Seek emergency care for unresponsiveness, persistent vomiting, fruity breath, or confusion that does not improve.',
    },
  ],
  'Chronic Respiratory Disease': [
    {
      heading: 'Reduce breathing triggers',
      body: 'Stay in cool, shaded areas away from smoke, dust, and strong fumes that can worsen breathing.',
    },
    {
      heading: 'Use prescribed treatments',
      body: 'Follow the person’s respiratory action plan, including inhalers or oxygen if prescribed.',
    },
    {
      heading: 'Watch breathing closely',
      body: 'Seek urgent care if breathing is fast, labored, or does not improve with usual treatment.',
    },
  ],
  'Kidney Disease': [
    {
      heading: 'Follow fluid guidance',
      body: 'Some kidney conditions limit fluids. Offer sips only as allowed by the person’s doctor or care plan.',
    },
    {
      heading: 'Avoid overheating',
      body: 'Heat stress can worsen fatigue and dizziness. Rest in a cool place and avoid heavy activity.',
    },
    {
      heading: 'Seek care for red flags',
      body: 'Get urgent help for little or no urine output, swelling, confusion, or chest pain.',
    },
  ],
  'Heat Sensitivity': [
    {
      heading: 'Cool down early',
      body: 'People with heat sensitivity may worsen quickly. Start cooling at the first sign of dizziness, nausea, or heavy sweating.',
    },
    {
      heading: 'Shorten heat exposure',
      body: 'Move indoors early and avoid returning outside until fully recovered.',
    },
  ],
  'Cold Sensitivity': [
    {
      heading: 'Warm gradually after cooling',
      body: 'After heat exposure, warm the person slowly. Sudden cold showers or ice can shock the body.',
    },
    {
      heading: 'Protect extremities',
      body: 'Watch fingers and toes for numbness or color changes after moving to air-conditioned areas.',
    },
  ],
  Other: [
    {
      heading: 'Follow your care plan',
      body: 'Use condition-specific medicines and limits advised by your doctor during hot weather.',
    },
    {
      heading: 'Watch for unusual symptoms',
      body: 'Heat can worsen many chronic conditions. Seek help if symptoms are new, severe, or not improving.',
    },
  ],
};

function resolveConditionKey(condition: string): string {
  if (isOtherConditionDetail(condition) || condition === 'Other') return 'Other';
  return condition;
}

export function getFirstAidGuidanceForConditions(
  healthConditions: string[] | undefined,
  healthCondition?: string | null,
): FirstAidGuidance {
  const active = getActiveHealthConditions(healthConditions, healthCondition);

  const conditionBlocks: FirstAidConditionBlock[] = [];
  const seen = new Set<string>();

  for (const condition of active) {
    const key = resolveConditionKey(condition);
    if (seen.has(key)) continue;
    seen.add(key);

    const sections = CONDITION_FIRST_AID[key];
    if (!sections?.length) continue;

    conditionBlocks.push({
      conditionKey: key,
      conditionLabel: formatConditionLabel(condition),
      sections,
    });
  }

  return {
    isApproved: true,
    title: 'Heat Illness First-Aid Guidance',
    notice:
      'General guidance for early warning support only. Call emergency services (911 / local hotline) if the person is unconscious, confused, or not improving.',
    generalSections: GENERAL_HEAT_SECTIONS,
    conditionBlocks,
  };
}

export function getFirstAidGuidanceForProfile(profile: {
  riskFactors: {
    healthConditions?: string[];
    healthCondition?: string | null;
  };
}): FirstAidGuidance {
  return getFirstAidGuidanceForConditions(
    profile.riskFactors.healthConditions,
    profile.riskFactors.healthCondition,
  );
}

/** @deprecated Use getFirstAidGuidanceForProfile — kept for system status / legacy callers */
export const FIRST_AID_GUIDANCE = {
  isApproved: true,
  title: 'Heat Illness First-Aid Guidance',
  notice:
    'General guidance for early warning support only. Call emergency services (911 / local hotline) if the person is unconscious, confused, or not improving.',
  sections: GENERAL_HEAT_SECTIONS,
};
