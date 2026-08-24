import { appConfig } from '@/src/config/app.config';
import { emergencyThresholdConfig, EMERGENCY_DEV_MODE } from '@/src/config/emergency.config';
import { FIRST_AID_GUIDANCE } from '@/src/constants/first-aid';
import decisionTreeRules from '@/src/config/decision-tree.rules';
import { hospitalService } from '@/src/services/hospital/hospital.service';
import { databaseService } from '@/src/services/database/database.service';
import { environmentalService } from '@/src/services/environmental/environmental.service';
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

  items.push(
    item(
      'weather-api',
      'Live weather & heat index',
      'done',
      'Open-Meteo provides live heat index for Tuguegarao (no API key).',
      'Uses api.open-meteo.com for current conditions.',
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
      hospitalService.isConfigured() ? 'done' : 'optional',
      hospitalService.isConfigured()
        ? `Provider: ${appConfig.hospitalDataProvider} — Tuguegarao static list active.`
        : 'Not configured.',
      'Set EXPO_PUBLIC_HOSPITAL_DATA_PROVIDER=static-tuguegarao in .env.',
    ),
  );

  items.push(
    item(
      'maps',
      'Hospital navigation / maps',
      appConfig.mapsProvider ? 'done' : 'optional',
      appConfig.mapsProvider
        ? `Provider: ${appConfig.mapsProvider} — opens device maps app.`
        : 'Not configured.',
      'Set EXPO_PUBLIC_MAPS_PROVIDER=google in .env.',
    ),
  );

  items.push(
    item(
      'database',
      'Cloud database (Supabase/MySQL)',
      databaseService.isConfigured() ? 'done' : 'optional',
      databaseService.isConfigured()
        ? appConfig.databaseProvider === 'supabase'
          ? `Supabase: ${appConfig.supabaseUrl ?? 'URL missing'}`
          : `MySQL API: ${appConfig.mysqlApiUrl ?? 'URL missing'}`
        : 'Using local storage (AsyncStorage) for now.',
      appConfig.databaseProvider === 'supabase'
        ? 'Set EXPO_PUBLIC_DATABASE_PROVIDER=supabase, URL, and anon key.'
        : 'Set EXPO_PUBLIC_DATABASE_PROVIDER=mysql and EXPO_PUBLIC_MYSQL_API_URL.',
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

  const treeReady = decisionTreeRules.enabled;
  const profileReady = params.profile !== null;
  const heatReady = environmentalService.isConfigured() || appConfig.devManualHeatEnabled;

  return {
    readyForAssessment: treeReady && profileReady && heatReady,
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
  const priority = ['decision-tree', 'weather-api', 'user-profile'];
  for (const id of priority) {
    const found = status.items.find((i) => i.id === id);
    if (found && (found.status === 'blocked' || found.status === 'needs_you')) {
      return found;
    }
  }
  return getBlockingItems(status)[0] ?? null;
}
