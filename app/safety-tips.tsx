import { useEffect, useMemo, useState } from 'react';

import { StyleSheet, View, Text } from 'react-native';

import { Redirect } from 'expo-router';

import { useIniTify, useRecommendations } from '@/src/context/IniTifyContext';

import { Screen } from '@/src/components/layout/Screen';

import { EmptyState, SectionHeader } from '@/src/components/ScreenContainer';

import { RecommendationCard } from '@/src/components/UiComponents';

import { RiskLevelBadge } from '@/src/components/RiskLevelBadge';

import {

  healthSafetyKbService,

  type PersonalizedSafetyTip,

} from '@/src/services/health-safety/health-safety-kb.service';

import { useResponsive } from '@/src/utils/responsive';

import { useAppTheme } from '@/src/theme/useAppTheme';

import { spacing, radius, typography, cardShadow } from '@/src/theme';



export default function SafetyTipsScreen() {

  const { profile, heatReading, currentWeather, assessment } = useIniTify();

  const recommendations = useRecommendations();

  const { horizontalPadding } = useResponsive();

  const { palette } = useAppTheme();

  const [tips, setTips] = useState<PersonalizedSafetyTip[]>([]);

  const [message, setMessage] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);



  const healthConditions = profile?.riskFactors.healthConditions ?? [];

  const healthCondition = profile?.riskFactors.healthCondition ?? null;

  const conditionsKey = useMemo(

    () => [...healthConditions, healthCondition ?? ''].join('|'),

    [healthConditions, healthCondition],

  );



  useEffect(() => {

    if (!profile) return;

    void (async () => {

      setLoading(true);

      const result = await healthSafetyKbService.getTipsForProfile({

        healthConditions: profile.riskFactors.healthConditions ?? [

          profile.riskFactors.healthCondition ?? 'None',

        ],

        healthCondition: profile.riskFactors.healthCondition,

        heatIndexC: heatReading?.heatIndex ?? null,

        conditionText: currentWeather?.conditionText ?? null,

        limit: 3,

      });

      setLoading(false);

      if (result.status === 'success' && result.data) {

        setTips(result.data);

        setMessage(result.message);

      } else {

        setTips([]);

        setMessage(result.message);

      }

    })();

  }, [profile, conditionsKey, heatReading, currentWeather, assessment?.level]);



  if (!profile) return <Redirect href="/" />;



  const hasRiskGuidance = Boolean(assessment?.level && recommendations.length > 0);

  const hasKbTips = tips.length > 0;



  const tipsByCondition = useMemo(() => {

    const groups = new Map<string, PersonalizedSafetyTip[]>();

    for (const tip of tips) {

      const key = tip.healthCondition;

      const list = groups.get(key) ?? [];

      list.push(tip);

      groups.set(key, list);

    }

    return [...groups.entries()];

  }, [tips]);



  return (

    <Screen

      overline="Guidance"

      title="Safety Tips"

      subtitle="Risk-based actions plus health-condition tips for current weather."

      back

      horizontalPadding={horizontalPadding}

    >

      {assessment?.level ? (

        <View style={styles.heroBadge}>

          <RiskLevelBadge level={assessment.level} size="small" />

        </View>

      ) : null}



      {assessment?.level && recommendations.length > 0 ? (

        <View style={styles.section}>

          <SectionHeader

            title="What to do now"

            subtitle={`Based on your ${assessment.level.toLowerCase()} heat risk`}

          />

          <View style={styles.list}>

            {recommendations.map((rec) => (

              <RecommendationCard key={rec.type} title={rec.title} description={rec.description} />

            ))}

          </View>

        </View>

      ) : !assessment?.level ? (

        <EmptyState

          title="Check your risk first"

          message="Complete a heat-risk check on Home to unlock personalized actions."

          icon="heart-outline"

        />

      ) : null}



      <View style={styles.section}>

        <SectionHeader

          title="Health & weather tips"

          subtitle="Approved guidance for your conditions and today's conditions"

        />

        {loading ? (

          <Text style={{ color: palette.textMuted }}>Loading tips…</Text>

        ) : hasKbTips ? (

          <View style={styles.list}>

            {tipsByCondition.map(([condition, conditionTips]) => (

              <View key={condition} style={styles.conditionGroup}>

                <Text style={[styles.conditionLabel, { color: palette.primary }]}>

                  For {condition}

                </Text>

                {conditionTips.map((tip) => (

                  <View

                    key={tip.tipId}

                    style={[

                      styles.card,

                      cardShadow(),

                      { backgroundColor: palette.surface, borderColor: palette.border },

                    ]}

                  >

                    <Text style={[styles.hazard, { color: palette.primary }]}>

                      {tip.weatherHazard}

                    </Text>

                    <Text style={[styles.title, { color: palette.text }]}>{tip.title}</Text>

                    <Text style={[styles.body, { color: palette.textMuted }]}>{tip.safetyTip}</Text>

                    {tip.warningSigns ? (

                      <Text style={[styles.meta, { color: palette.textMuted }]}>

                        Watch for: {tip.warningSigns}

                      </Text>

                    ) : null}

                  </View>

                ))}

              </View>

            ))}

          </View>

        ) : (

          <EmptyState

            title="No tips loaded"

            message={

              message ??

              'Update your health profile, then reopen this screen to load condition-specific tips.'

            }

            icon="book-outline"

          />

        )}

      </View>



      {!hasRiskGuidance && !hasKbTips && !loading && assessment?.level ? (

        <EmptyState

          title="You're in good shape"

          message="Keep hydrated, limit outdoor activity during peak heat, and check in regularly."

          icon="checkmark-circle-outline"

        />

      ) : null}

    </Screen>

  );

}



const styles = StyleSheet.create({

  heroBadge: { flexDirection: 'row', marginTop: -spacing.sm, marginBottom: spacing.md },

  section: { marginBottom: spacing.lg },

  list: { gap: spacing.lg },

  conditionGroup: { gap: spacing.md },

  conditionLabel: { ...typography.overline, letterSpacing: 1.2 },

  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.xs },

  hazard: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },

  title: { ...typography.h3, fontWeight: '700' },

  body: { ...typography.body, lineHeight: 22 },

  meta: { ...typography.caption, marginTop: spacing.xs },

});


