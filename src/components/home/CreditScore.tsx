import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Svg, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, spacing, typography, radii, shadows } from '../../theme/designTokens';
import { SectionHeader } from './SectionHeader';

const SIZE = 120;
const STROKE_WIDTH = 14;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const CreditScore = () => {
    const score = 750;
    const percentage = (score - 300) / (850 - 300);
    const strokeDashoffset = CIRCUMFERENCE * (1 - percentage);

  return (
    <View style={styles.wrapper}>
        <SectionHeader title="Credit Health" />
        <View style={styles.container}>
            <View style={styles.chartContainer}>
                <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
                    <Defs>
                        <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                            <Stop offset="0%" stopColor={colors.chartGradient1[0]} />
                            <Stop offset="100%" stopColor={colors.chartGradient1[1]} />
                        </LinearGradient>
                    </Defs>
                    <Circle
                        cx={SIZE / 2}
                        cy={SIZE / 2}
                        r={RADIUS}
                        stroke={colors.pillBackground}
                        strokeWidth={STROKE_WIDTH}
                    />
                    <Circle
                        cx={SIZE / 2}
                        cy={SIZE / 2}
                        r={RADIUS}
                        stroke="url(#grad)"
                        strokeWidth={STROKE_WIDTH}
                        strokeDasharray={CIRCUMFERENCE}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                    />
                </Svg>
                <View style={styles.textContainer}>
                    <Text style={styles.score}>{score}</Text>
                    <Text style={styles.rating}>Good</Text>
                </View>
            </View>
            <Text style={styles.footerText}>
                Your score is better than 80% of users.
            </Text>
        </View>
    </View>
  );
};

const styles = StyleSheet.create({
    wrapper: {
        marginTop: spacing.l,
    },
    container: {
        marginHorizontal: spacing.l,
        backgroundColor: colors.card,
        borderRadius: radii.card,
        ...shadows.card,
        padding: spacing.l,
        alignItems: 'center',
    },
    chartContainer: {
        position: 'relative',
        width: SIZE,
        height: SIZE,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.m,
    },
    textContainer: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    score: {
        ...typography.title,
        fontSize: 28,
        lineHeight: 34,
    },
    rating: {
        ...typography.body,
        color: colors.textMuted,
    },
    footerText: {
        ...typography.body,
        textAlign: 'center',
        maxWidth: '80%',
    }
});
