import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useIniTify } from '@/src/context/IniTifyContext';
import { notifyEmergencyActive } from '@/src/services/emergency/emergency-alert.service';
import { notificationService } from '@/src/services/notifications/notification.service';

/**
 * Step 2 — alerts the user when emergency status becomes ACTIVE
 * (local popup + push notification on the user's phone).
 */
export function EmergencyActiveMonitor() {
  const router = useRouter();
  const { profile, emergencyState, isLoading } = useIniTify();
  const wasActiveRef = useRef(false);

  useEffect(() => {
    if (isLoading || !profile) return;

    void notificationService.requestPermission();
  }, [isLoading, profile]);

  useEffect(() => {
    if (isLoading || !profile) return;

    const isActive = emergencyState.isActive;

    if (isActive && !wasActiveRef.current) {
      wasActiveRef.current = true;
      void notifyEmergencyActive(emergencyState, () => {
        router.push('/emergency');
      });
    }

    if (!isActive) {
      wasActiveRef.current = false;
    }
  }, [emergencyState, isLoading, profile, router]);

  return null;
}
