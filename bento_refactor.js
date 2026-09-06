const fs = require('fs');

const path = 'src/screens/user/UserDashboardScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace margins and groupings to create a bento box layout
// 1. Remove marginBottom from Animated.View wrapping MoneyMap
content = content.replace(
  /<Animated\.View\s+entering=\{FadeInDown\.delay\(30\)\.springify\(\)\}\s+style=\{\{\s*marginBottom:\s*32\s*\}\}\s*>/g,
  '<Animated.View entering={FadeInDown.delay(30).springify()}>'
);

// 2. Remove marginBottom from GoalTrackerCard wrapper
content = content.replace(
  /\{goal && \(\s*<View style=\{\{\s*marginBottom:\s*32\s*\}\}>\s*<GoalTrackerCard/g,
  '{goal && (\n          <View>\n            <GoalTrackerCard'
);

// 3. Remove marginBottom from StreakBanner wrapper
content = content.replace(
  /\{streakDays > 0 && \(\s*<View style=\{\{\s*marginBottom:\s*16\s*\}\}>\s*<StreakBanner/g,
  '{streakDays > 0 && (\n          <View>\n            <StreakBanner'
);

// 4. Wrap everything after Header inside a Bento Box container (a View with gap: 16)
content = content.replace(
  /\{(\/\*\s*═══════════════════ MONEY MAP — month at a glance ═══════════════════\s*\*\/)\}/g,
  '<View style={st.bentoContainer}>\n        {$1}'
);

content = content.replace(
  /(\{\/\*\s*═══════════════════ CHITS \(pro flavor only\) ═══════════════════\s*\*\/\})/g,
  '</View>\n\n        $1'
);

// 5. Add bentoContainer to StyleSheet
content = content.replace(
  /header: \{ marginBottom: 16 \},/g,
  'header: { marginBottom: 24 },\n    bentoContainer: { display: "flex", flexDirection: "column", gap: 16, paddingBottom: 24 },'
);

// Write back
fs.writeFileSync(path, content);
console.log('Modified UserDashboardScreen.tsx');
