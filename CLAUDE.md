# CoinKeeper Development Guide - Dual-Agent AI Workflow

## Dual-Agent Architecture: Claude + Gemini

1. **Claude Code (Primary Agent)** - Implementation, orchestration, file operations
2. **Gemini CLI (Analysis Agent)** - Large-scale codebase scanning with 1M+ token context

---

## When to Use Which Agent

| Task | Agent | Why |
|------|-------|-----|
| Code implementation | Claude Code | Precise file editing, structured workflow |
| Full codebase analysis | Gemini CLI | 1M+ token context window, deep scanning |
| Architecture planning | Gemini CLI | Comprehensive pattern detection |
| Multi-file refactoring | Claude Code | Tool-based file operations |
| Security audit | Gemini CLI | Full context security analysis |
| Performance analysis | Gemini CLI | Cross-file bottleneck detection |
| File editing & creation | Claude Code | Read/Write/Edit tools |
| Workflow orchestration | Claude Code | Task management, project coordination |

---

## Gemini CLI Commands for CoinKeeper

**IMPORTANT:** Always use Gemini CLI for codebase analysis and scanning instead of manual exploration.

```bash
# Full codebase scan for missing implementations
gemini -p "@./ Scan this React Native admin app codebase. Based on the roadmap requirements, identify: 1) What screens are complete 2) What's missing 3) Security issues 4) Performance bottlenecks. Format as actionable todo list."

# Scan specific modules
gemini -p "@src/screens/admin/ What admin screens exist? What's missing from a complete admin dashboard suite?"

# Check theme consistency
gemini -p "@src/theme/ @src/components/ Analyze theme usage across components. Are design tokens used consistently?"

# Security audit
gemini -p "@src/services/ @src/hooks/ Review Firebase integration, authentication, and data handling for security vulnerabilities."

# Performance analysis
gemini -p "@src/screens/ @src/components/ Identify performance bottlenecks in React Native screens and components. Check for unnecessary re-renders, heavy computations, or memory leaks."

# Navigation structure analysis
gemini -p "@src/navigation/ Analyze the navigation architecture. Is it scalable? Any issues with deep linking or state management?"

# Component reusability check
gemini -p "@src/components/ List all reusable components. What's missing for a complete admin UI toolkit? What components should be created?"
```

---

## Dual-Agent Workflow Patterns

### Pattern 1: Roadmap-Driven Development

```bash
# Step 1: Gemini scans codebase against roadmap
gemini -p "@./ @IMPLEMENTATION_STATUS.md Compare implemented features against roadmap. Create a priority matrix."

# Step 2: Claude implements based on Gemini's gap analysis
# Step 3: Gemini validates implementation
gemini -p "@src/screens/admin/[feature]/ Review newly implemented screens. Do they follow existing design patterns?"
```

### Pattern 2: Feature Implementation Workflow

```bash
# Before implementing a feature:
gemini -p "@src/ I need to implement [FEATURE_NAME]. What existing components can I reuse? What patterns should I follow? What's the best file location?"

# After implementing:
gemini -p "@src/screens/admin/[feature]/ Review this implementation for: code quality, design consistency, performance, security."
```

### Pattern 3: Design System Consistency

```bash
# Check design token usage
gemini -p "@src/theme/ @src/screens/admin/newfeature/ Does the new feature use design tokens correctly?"

# Component pattern validation
gemini -p "@src/components/ @src/screens/admin/newfeature/ Compare new components against existing patterns."
```

---

## CoinKeeper-Specific Instructions

### Project Architecture
- **Stack:** React Native, TypeScript, Firebase/Firestore, Reanimated v3
- **Design:** Neumorphic banking aesthetic with soft blues, glassmorphism
- **Navigation:** Stack + Tab navigators with custom ExpandingTabBar
- **State:** Custom hooks pattern (useGroups, useMembers, useTransactions)
- **Charts:** Victory Native + React Native Chart Kit installed
- **Firebase Project:** `coinkeeper-c53e7` (Android: `com.coinkeeper`)

### Key Design Principles
1. **Always use design tokens** from `src/theme/designTokens.ts`
2. **Spring animations** with standard config: `{ damping: 16, stiffness: 140, mass: 1 }`
3. **Haptic feedback** on all interactions
4. **Glassmorphism** for premium surfaces (tab bars, modals)
5. **Neumorphic shadows** for depth
6. **4px spacing grid** for all layouts

### Code Patterns to Follow

**Component Structure:**
```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS, SPACING, TYPOGRAPHY } from '@/theme/designTokens';

interface Props {
  // Define props
}

export const ComponentName: React.FC<Props> = ({ ...props }) => {
  return (
    <Animated.View
      entering={FadeInDown.springify()}
      style={styles.container}
    >
      {/* Content */}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 16,
  },
});
```

**Service Pattern:**
```typescript
import firestore from '@react-native-firebase/firestore';

export const serviceName = {
  async getData(id: string) {
    try {
      const doc = await firestore().collection('collectionName').doc(id).get();
      return doc.data();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  },

  onSnapshot(callback: (data: Type[]) => void) {
    return firestore()
      .collection('collectionName')
      .onSnapshot(
        snapshot => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          callback(data);
        },
        error => console.error('Error:', error)
      );
  },
};
```

**Hook Pattern:**
```typescript
import { useState, useEffect } from 'react';
import { serviceName } from '@/services/serviceName';

export const useDataHook = (id: string) => {
  const [data, setData] = useState<Type[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = serviceName.onSnapshot(
      (newData) => {
        setData(newData);
        setIsLoading(false);
      },
    );
    return () => unsubscribe();
  }, [id]);

  return { data, isLoading, error };
};
```

### Gemini Pre-Implementation Checklist

Before implementing any new feature, run:

```bash
# 1. Check what exists
gemini -p "@src/ I need to implement [FEATURE]. Show me: existing similar components, relevant services, applicable hooks, navigation structure, theme tokens to use."

# 2. Check dependencies
gemini -p "@package.json Do we have required packages for [FEATURE]? What needs to be installed?"

# 3. Identify reusable code
gemini -p "@src/components/ @src/screens/ What components/patterns can I reuse for [FEATURE]?"
```

---

## Priority Implementation Order (Updated)

**MVP (Must Have):**
1. ✅ Admin Dashboard
2. ✅ Groups Management
3. ✅ Members Management
4. ✅ Transactions Management
5. ✅ Analytics Dashboard (Victory charts)
6. ✅ Collection Management (9 screens built)
7. ✅ Draw & Lottery Management (4 screens built)
8. 🔴 Payment Confirmation Module (NEW - replaces Wallet)
9. 🔴 Notifications Center

**Advanced:**
10. ⚠️ System Settings (needs Legal Disclaimer, T&C, Audit Viewer)
11. 🔴 Integrations
12. 🔴 Support System

**Future:**
13. 🔴 AI & Automation

---

## Gemini Validation Commands

After Claude implements features:

```bash
# Code quality check
gemini -p "@src/screens/admin/newfeature/ Rate this implementation 1-10 on: code quality, TypeScript usage, error handling, performance, design consistency."

# Security review
gemini -p "@src/screens/admin/newfeature/ @src/services/newService.ts Security review: input validation, data sanitization, auth checks, Firebase security rules compliance."

# Performance audit
gemini -p "@src/screens/admin/newfeature/ Identify performance issues: unnecessary re-renders, heavy computations in render, missing memoization, large list optimizations."

# Accessibility check
gemini -p "@src/screens/admin/newfeature/ Accessibility audit: proper labels, contrast ratios, touch target sizes, screen reader support."
```

---

## Continuous Improvement Workflow

### Weekly Review
```bash
gemini -p "@src/ Weekly review: identify technical debt, outdated patterns, optimization opportunities, security updates needed."
```

### Pre-Commit Validation
```bash
gemini -p "@$(git diff --name-only --staged) Review staged changes for: breaking changes, security issues, design inconsistencies, missing tests."
```

### Architecture Review
```bash
gemini -p "@src/ Architectural review: Is the codebase scalable? Any anti-patterns? Suggest refactoring opportunities."
```

---

## Integration Flow

1. **Gemini** scans codebase and provides analysis
2. **Claude** implements based on Gemini's guidance
3. **Gemini** validates Claude's implementation
4. Repeat for continuous improvement

## Quick Commands Reference

| Task | Gemini Command |
|------|----------------|
| Full scan | `gemini -p "@./ Comprehensive analysis"` |
| Feature gap analysis | `gemini -p "@src/ What's missing from roadmap?"` |
| Security audit | `gemini -p "@src/services/ Security review"` |
| Performance check | `gemini -p "@src/screens/ Performance analysis"` |
| Design consistency | `gemini -p "@src/theme/ @src/components/ Design token usage"` |
| Dependencies audit | `gemini -p "@package.json Dependency analysis"` |
| Navigation review | `gemini -p "@src/navigation/ Navigation structure"` |

---

## Agent Decision Tree

```
START
  │
  ├─ Need full codebase context? ──YES──> Use Gemini (1M+ tokens)
  │                                │
  │                                NO
  ├─ Need to edit files? ──────────YES──> Use Claude (file operations)
  │                                │
  │                                NO
  ├─ Architecture planning? ───────YES──> Use Gemini (pattern detection)
  │                                │
  │                                NO
  └─ Default ──────────────────────────> Use Claude (orchestration)
```

---

## Troubleshooting

### Gemini Issues
- Rate limits → Break into smaller context chunks
- Token limits → Use targeted file patterns instead of `@./`
- Latency → Use specific module paths for faster scans

### Claude Issues
- Context overflow → Use Gemini for large scans first
- File operation errors → Check file permissions
- Ambiguous requests → Provide Gemini reports as context

---

## Coding Principles (ALWAYS FOLLOW)

### Keep It Simple
- **Don't overthink** - If the code already handles edge cases, trust it
- **Don't over-engineer** - Simple, working code > clever abstractions
- **If it works, leave it** - Don't add unnecessary checks or complexity
- **Example**: If a hook checks `if (user_id?.trim())` internally, don't check `isLoggedIn` before passing it

### SOLID Principles Always
- **Single Responsibility**: Each function/hook does one thing well
- **Open/Closed**: Extensible through config, not modification
- **Liskov Substitution**: Use proper TypeScript interfaces
- **Interface Segregation**: Minimal, focused APIs
- **Dependency Inversion**: Use abstractions, not concrete implementations

### Code Quality Standards
- **Clean & Readable**: Code should be self-documenting
- **Practical over Perfect**: Ship working code, not theoretical perfection
- **No Premature Optimization**: Optimize when there's a proven need
- **Trust Working Code**: Don't refactor what works without good reason

### Problem-Solving Approach
- **Look at working examples first**: Before implementing, find existing working code in the codebase and match their pattern
- **Simplest approach wins**: Avoid absolute positioning or animated transforms when a simple inline render works
- **Don't iterate with band-aids**: If an approach keeps needing fixes (offset hacks, padding adjustments), the approach itself is wrong. Step back and choose a simpler pattern
- **Think through full layout implications BEFORE implementing**: Trace the entire layout tree mentally before writing code

---

## Best Practices

1. **Use Gemini** for comprehensive codebase analysis (large context)
2. **Use Claude** for implementation and orchestration (file operations)
3. **Workflow:** Gemini scans → Claude implements → Gemini validates
4. **Let Claude orchestrate** the workflow and manage files
5. **Always validate** with Gemini after major implementations

---

**Remember:**

- **Gemini** = Analysis (cloud, deep, 1M+ context)
- **Claude** = Implementation (orchestration, files, precision)

This dual-agent workflow maximizes productivity and code quality.
