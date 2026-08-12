import { appConfig } from '@/src/config/app.config';
import { emergencyThresholdConfig, EMERGENCY_DEV_MODE } from '@/src/config/emergency.config';
import { FIRST_AID_GUIDANCE } from '@/src/constants/first-aid';
import decisionTreeRules from '@/src/config/decision-tree.rules';
import { environmentalService } from '@/src/services/environmental/environmental.service';
import { hospitalService } from '@/src/services/hospital/hospital.service';
import { databaseService } from '@/src/services/database/database.service';
import type { SetupChecklistItem, SystemSetupStatus } from '@/src/models/setup-status';
import type { UserProfile } from '@/src/models/user';
import type { EmergencyContact } from '@/src/models/user';

function item(
  id: string,
  title: string,
  status: SetupChecklistItem['status'],
  detail: string,
  action: string,
): SetupChecklistItem {
  return { id, title, status, detail, action };
}

/** Audits what is configured vs still missing in IniTify */
export function getSystemSetupStatus(params: {
  profile: UserProfile | null;
  emergencyContact: EmergencyContact | null;
}): SystemSetupStatus {
  const items: SetupChecklistItem[] = [];

  const pagasa = environmentalService.getProviderStatus();
  const hasPagasaToken =
    appConfig.pagasaApiKey !== null || appConfig.pagasaApiUrl !== null;

  items.push(
    item(
      'pagasa',
      'DOST-PAGASA API credentials',
      hasPagasaToken
        ? pagasa.configured
          ? 'done'
          : 'needs_you'
        : 'in_progress',
      hasPagasaToken
        ? pagasa.message
        : 'Request letter in progress. TenDay API token still needed.',
      hasPagasaToken
        ? 'Add token to .env and restart Expo.'
        : 'Submit TenDay request at tenday.pagasa.dost.gov.ph.',
    ),
  );

  items.push(
    item(
      'pagasa-location',
      'PAGASA location (province/municity)',
      appConfig.pagasaProvince || appConfig.pagasaMunicity ? 'done' : 'needs_you',
      appConfig.pagasaProvince || appConfig.pagasaMunicity
        ? `${appConfig.pagasaMunicity ?? '?'}, ${appConfig.pagasaProvince ?? '?'}`
        : 'TenDay API needs exact PAGASA location names.',
      'Set EXPO_PUBLIC_PAGASA_PROVINCE and EXPO_PUBLIC_PAGASA_MUNICITY in .env.',
    ),
  );

  items.push(
    item(
      'decision-tree',
      'Decision Tree rules',
      decisionTreeRules.enabled ? 'done' : 'blocked',
      decisionTreeRules.enabled
        ? `Trained model active — ${decisionTreeRules.version}. See ml/output/TRAINING_RESULTS.md.`
        : 'Decision Tree disabled.',
      decisionTreeRules.enabled
        ? 'Retrain with ml/train_decision_tree.py when you add more dataset rows.'
        : 'Enable rules in src/config/decision-tree.rules.ts.',
    ),
  );

  items.push(
    item(
      'user-profile',
      'User risk-factor profile',
      params.profile ? 'done' : 'needs_you',
      params.profile
        ? `Saved for ${params.profile.name}`
        : 'Age, health, activity, hydration required.',
      'Complete Setup screen.',
    ),
  );

  items.push(
    item(
      'emergency-contact',
      'Emergency contact',
      params.emergencyContact?.phone ? 'done' : 'optional',
      params.emergencyContact?.phone
        ? `${params.emergencyContact.name} — ${params.emergencyContact.phone}`
        : 'Optional but required for emergency notifications.',
      'Add contact in Setup screen.',
    ),
  );

  items.push(
    item(
      'emergency-thresholds',
      'Emergency activation thresholds',
      emergencyThresholdConfig.failedSafetyPromptCount !== null &&
        emergencyThresholdConfig.inactivityDurationMinutes !== null
        ? 'done'
        : 'needs_you',
      emergencyThresholdConfig.failedSafetyPromptCount === null
        ? 'Failed prompt count not set.'
        : `Failed prompts: ${emergencyThresholdConfig.failedSafetyPromptCount}`,
      'Set values in src/config/emergency.config.ts from your research document.',
    ),
  );

  items.push(
    item(
      'first-aid',
      'Approved first-aid content',
      FIRST_AID_GUIDANCE.isApproved ? 'done' : 'needs_you',
      FIRST_AID_GUIDANCE.isApproved
        ? 'Approved content loaded.'
        : FIRST_AID_GUIDANCE.notice,
      'Add approved text to src/constants/first-aid.ts.',
    ),
  );

  items.push(
    item(
      'hospital',
      'Nearest hospital data source',
      hospitalService.isConfigured() ? 'needs_you' : 'optional',
      hospitalService.isConfigured()
        ? 'Provider set but integration not implemented.'
        : 'Not configured.',
      'Set EXPO_PUBLIC_HOSPITAL_DATA_PROVIDER when provider is chosen.',
    ),
  );

  items.push(
    item(
      'maps',
      'Hospital navigation / maps',
      appConfig.mapsProvider ? 'needs_you' : 'optional',
      appConfig.mapsProvider
        ? `Provider: ${appConfig.mapsProvider} — integration pending.`
        : 'Not configured.',
      'Set EXPO_PUBLIC_MAPS_PROVIDER (e.g. google).',
    ),
  );

  items.push(
    item(
      'database',
      'Cloud database (Firebase/MySQL)',
      databaseService.isConfigured() ? 'needs_you' : 'optional',
      databaseService.isConfigured()
        ? `Provider: ${databaseService.getProvider()} — integration pending.`
        : 'Using local storage (AsyncStorage) for now.',
      'Choose Firebase or MySQL and set EXPO_PUBLIC_DATABASE_PROVIDER.',
    ),
  );

  items.push(
    item(
      'emergency-dev-mode',
      'Emergency message delivery',
      EMERGENCY_DEV_MODE ? 'in_progress' : 'done',
      EMERGENCY_DEV_MODE
        ? 'Dev mode ON — emergency messages are NOT sent to real contacts.'
        : 'Production delivery configured.',
      'Keep dev mode ON until SMS/call integration is approved for testing.',
    ),
  );

  const pagasaReady = pagasa.configured;
  const treeReady = decisionTreeRules.enabled;
  const profileReady = params.profile !== null;

  return {
    readyForAssessment:
      treeReady &&
      profileReady &&
      (pagasaReady || appConfig.devManualHeatEnabled),
    readyForProduction: items.every(
      (i) => i.status === 'done' || i.status === 'optional',
    ),
    items,
  };
}

export function getBlockingItems(status: SystemSetupStatus): SetupChecklistItem[] {
  return status.items.filter(
    (i) => i.status === 'blocked' || i.status === 'needs_you',
  );
}

export function getNextPriorityItem(
  status: SystemSetupStatus,
): SetupChecklistItem | null {
  const priority = ['decision-tree', 'pagasa', 'pagasa-location', 'user-profile'];
  for (const id of priority) {
    const found = status.items.find((i) => i.id === id);
    if (found && (found.status === 'blocked' || found.status === 'needs_you')) {
      return found;
    }
  }
  return getBlockingItems(status)[0] ?? null;
}
