import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useIniTify } from '@/src/context/IniTifyContext';
import {
  ScreenContainer,
  InfoBanner,
} from '@/src/components/ScreenContainer';
import { PrimaryButton } from '@/src/components/UiComponents';
import {
  ACTIVITY_LEVELS,
  HYDRATION_STATUSES,
  type UserProfile,
} from '@/src/models/user';
import { validateAge, validateRequired } from '@/src/utils/validation';
import { DISCLAIMER } from '@/src/constants/risk-levels';

export default function SetupScreen() {
  const router = useRouter();
  const { saveProfile, saveEmergencyContact, refreshLocation } = useIniTify();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [healthCondition, setHealthCondition] = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  const [hydrationStatus, setHydrationStatus] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function validate(): boolean {
    const next: Record<string, string> = {};
    const nameErr = validateRequired(name, 'Name');
    if (nameErr) next.name = nameErr;
    const ageErr = validateAge(age);
    if (ageErr) next.age = ageErr;
    const healthErr = validateRequired(healthCondition, 'Health condition');
    if (healthErr) next.healthCondition = healthErr;
    if (!activityLevel) next.activityLevel = 'Activity level is required.';
    if (!hydrationStatus) next.hydrationStatus = 'Hydration status is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const profile: UserProfile = {
        name: name.trim(),
        riskFactors: {
          age: Number(age),
          healthCondition: healthCondition.trim(),
          activityLevel,
          hydrationStatus,
        },
      };
      await saveProfile(profile);
      if (contactName.trim() && contactPhone.trim()) {
        await saveEmergencyContact({
          name: contactName.trim(),
          phone: contactPhone.trim(),
        });
      }
      await refreshLocation();
      router.replace('/dashboard');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.scroll}>
      <ScreenContainer title="Risk Factor Setup">
        <InfoBanner message={DISCLAIMER} variant="info" />

        <Field label="Name" error={errors.name}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            autoCapitalize="words"
          />
        </Field>

        <Field label="Age" error={errors.age}>
          <TextInput
            style={styles.input}
            value={age}
            onChangeText={setAge}
            placeholder="Age"
            keyboardType="number-pad"
          />
        </Field>

        <Field label="Health Condition" error={errors.healthCondition}>
          <TextInput
            style={styles.input}
            value={healthCondition}
            onChangeText={setHealthCondition}
            placeholder="e.g. None, Hypertension"
          />
        </Field>

        <Field label="Activity Level" error={errors.activityLevel}>
          <OptionPicker
            options={[...ACTIVITY_LEVELS]}
            selected={activityLevel}
            onSelect={setActivityLevel}
          />
        </Field>

        <Field label="Hydration Status" error={errors.hydrationStatus}>
          <OptionPicker
            options={[...HYDRATION_STATUSES]}
            selected={hydrationStatus}
            onSelect={setHydrationStatus}
          />
        </Field>

        <Text style={styles.sectionTitle}>Emergency Contact (optional)</Text>
        <Field label="Contact Name">
          <TextInput
            style={styles.input}
            value={contactName}
            onChangeText={setContactName}
            placeholder="Emergency contact name"
          />
        </Field>
        <Field label="Contact Phone">
          <TextInput
            style={styles.input}
            value={contactPhone}
            onChangeText={setContactPhone}
            placeholder="Phone number"
            keyboardType="phone-pad"
          />
        </Field>

        <PrimaryButton
          label={saving ? 'Saving...' : 'Save & Continue'}
          onPress={handleSave}
          disabled={saving}
        />
      </ScreenContainer>
    </ScrollView>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function OptionPicker({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <View style={styles.options}>
      {options.map((opt) => (
        <Pressable
          key={opt}
          onPress={() => onSelect(opt)}
          style={[styles.option, selected === opt && styles.optionSelected]}
        >
          <Text
            style={[
              styles.optionText,
              selected === opt && styles.optionTextSelected,
            ]}
          >
            {opt}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 6 },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  error: { fontSize: 12, color: '#dc2626', marginTop: 4 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 8,
    marginBottom: 12,
  },
  options: { gap: 8 },
  option: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
  },
  optionSelected: {
    borderColor: '#006AB1',
    backgroundColor: '#eff6ff',
  },
  optionText: { fontSize: 14, color: '#64748b' },
  optionTextSelected: { color: '#006AB1', fontWeight: '600' },
});
