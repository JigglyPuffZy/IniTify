import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useIniTify } from '@/src/context/IniTifyContext';
import { notifyEmergencyActive } from '@/src/services/emergency/emergency-alert.service';
import { emergencyContactService } from '@/src/services/emergency/emergency.service';
import { databaseService } from '@/src/services/database/database.service';

/**
 * Shows an on-screen alert when emergency status becomes ACTIVE.
 * Opens a real SMS draft to the emergency contact (user taps Send).
 * Push notifications are skipped in Expo Go (SDK 53+).
 */
export function EmergencyActiveMonitor() {
  const router = useRouter();
  const { profile, emergencyContact, assessment, location, emergencyState, isLoading } =
    useIniTify();
  const wasActiveRef = useRef(false);

  useEffect(() => {
    if (isLoading || !profile) return;

    const isActive = emergencyState.isActive;

    if (isActive && !wasActiveRef.current) {
      wasActiveRef.current = true;

      const reasons = [
        emergencyState.indicators.extremeHeatRisk ? 'Extreme heat risk' : null,
        emergencyState.indicators.repeatedFailedSafetyPrompts
          ? 'Repeated failed safety prompts'
          : null,
        emergencyState.indicators.prolongedInactivity ? 'Prolonged inactivity' : null,
      ]
        .filter(Boolean)
        .join(', ');

      void databaseService.sync.syncEmergencyActiveAlert(profile, reasons);

      if (emergencyContact?.phone) {
        void emergencyContactService
          .prepareNotification({
            userName: profile.name,
            heatRiskLevel: assessment?.level ?? null,
            lastKnownLocation: location,
            contact: emergencyContact,
            openSms: true,
          })
          .then((result) => {
            if (result.notification) {
              void databaseService.sync.syncContactNotification(
                profile,
                emergencyContact,
                result.notification,
                result.sent ? 'sent' : 'prepared',
              );
            }
          });
      }

      void notifyEmergencyActive(
        emergencyState,
        () => {
          router.push('/emergency');
        },
        {
          userName: profile.name,
          contact: emergencyContact,
          heatRiskLevel: assessment?.level ?? null,
          location,
        },
      );
    }

    if (!isActive) {
      wasActiveRef.current = false;
    }
  }, [
    emergencyState,
    isLoading,
    profile,
    emergencyContact,
    assessment?.level,
    location,
    router,
  ]);

  return null;
}
