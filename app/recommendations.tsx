import { ScrollView, Text, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useIniTify, useRecommendations } from '@/src/context/IniTifyContext';
import { ScreenContainer, EmptyState } from '@/src/components/ScreenContainer';
import { RecommendationCard } from '@/src/components/UiComponents';
import { DISCLAIMER } from '@/src/constants/risk-levels';

export default function RecommendationsScreen() {
  const { profile, assessment } = useIniTify();
  const recommendations = useRecommendations();

  if (!profile) return <Redirect href="/" />;

  return (
    <ScrollView style={styles.scroll}>
      <ScreenContainer title="Personalized Recommendations">
        {!assessment?.level ? (
          <EmptyState message="Complete a risk assessment to receive personalized recommendations." />
        ) : recommendations.length === 0 ? (
          <EmptyState message="No additional recommendations for current risk level." />
        ) : (
          recommendations.map((rec) => (
            <RecommendationCard
              key={rec.type}
              title={rec.title}
              description={rec.description}
            />
          ))
        )}
        <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
      </ScreenContainer>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  disclaimer: {
    fontSize: 11,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: 16,
    lineHeight: 16,
  },
});
