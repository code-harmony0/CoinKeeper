# CoinKeeper Development Guide - Multi-Agent AI Workflow

## ⚡ AUTOMATED WORKFLOW SYSTEM ACTIVE

**IMPORTANT:** This project has a **persistent multi-agent workflow system** configured!

📚 **Quick Start:**
- Read [`.ai-quick-reference.md`](.ai-quick-reference.md) for instant commands
- Read [`.ai-workflow-system.md`](.ai-workflow-system.md) for full documentation
- Use [`ai_delegate.sh`](ai_delegate.sh) for automated task delegation
- Configuration in [`.claude-config.json`](.claude-config.json)

**Claude MUST follow the workflow defined in `.ai-workflow-system.md` for ALL tasks.**

---

## Triple-Agent Architecture: Claude + Gemini + Qwen

**IMPORTANT:** Leverage all three AI agents for maximum development efficiency:

1. **Claude Code (Primary Agent)** - Implementation & orchestration
2. **Gemini CLI (Analysis Agent)** - Large-scale codebase scanning with 1M+ token context
3. **Qwen Local AI (Privacy Agent)** - Fast local inference for sensitive code, offline analysis, rapid iterations

---

## Quick Reference: When to Use Which Agent

| Task | Agent | Why |
|------|-------|-----|
| Code implementation | Claude Code | Precise file editing, structured workflow |
| Full codebase analysis | Gemini CLI | 1M+ token context window, deep scanning |
| Sensitive code review | Qwen Local | Privacy, no cloud upload, local processing |
| Rapid prototyping | Qwen Local | Fast inference, offline capability |
| Architecture planning | Gemini CLI | Comprehensive pattern detection |
| Quick code snippets | Qwen Local | Instant responses, low latency |
| Multi-file refactoring | Claude Code | Tool-based file operations |
| Security audit | Gemini CLI | Full context security analysis |
| Local debugging | Qwen Local | Private, fast, no rate limits |

---

## Gemini CLI - Cloud-Based Analysis

**Use Case:** Large-scale codebase analysis, comprehensive security audits, architectural reviews

**IMPORTANT:** Always use Gemini CLI for codebase analysis and scanning instead of manual exploration.

### Gemini CLI Commands for CoinKeeper

```bash
# Full codebase scan for missing implementations
gemini -p "@./ Scan this React Native admin app codebase. Based on the roadmap requirements, identify: 1) What screens are complete 2) What's missing 3) Security issues 4) Performance bottlenecks. Format as actionable todo list."

# Scan specific modules
gemini -p "@src/screens/admin/ What admin screens exist? What's missing from a complete admin dashboard suite?"

# Check theme consistency
gemini -p "@src/theme/ @src/components/ Analyze theme usage across components. Are design tokens used consistently?"

# Analytics and charting readiness
gemini -p "@src/ Does this codebase have charting libraries installed? What needs to be added for analytics dashboards with bar charts, line charts, and pie charts?"

# Security audit
gemini -p "@src/services/ @src/hooks/ Review Firebase integration, authentication, and data handling for security vulnerabilities."

# Performance analysis
gemini -p "@src/screens/ @src/components/ Identify performance bottlenecks in React Native screens and components. Check for unnecessary re-renders, heavy computations, or memory leaks."

# Navigation structure analysis
gemini -p "@src/navigation/ Analyze the navigation architecture. Is it scalable? Any issues with deep linking or state management?"

# Component reusability check
gemini -p "@src/components/ List all reusable components. What's missing for a complete admin UI toolkit? What components should be created?"
```

## Dual-Agent Workflow for CoinKeeper

### Pattern 1: Roadmap-Driven Development

```bash
# Step 1: Gemini scans codebase against roadmap
gemini -p "@./ @GROUP_MANAGEMENT_MODULE.md Compare implemented features against roadmap. Create a priority matrix: MVP (done/missing), Advanced (done/missing), Future (done/missing)."

# Step 2: Claude implements based on Gemini's gap analysis
# Step 3: Gemini validates implementation
gemini -p "@src/screens/admin/analytics/ Review newly implemented analytics screens. Do they follow existing design patterns? Are charts properly implemented?"
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
gemini -p "@src/theme/ @src/screens/admin/newfeature/ Does the new feature use design tokens correctly? Are colors, spacing, typography from theme system?"

# Component pattern validation
gemini -p "@src/components/ @src/screens/admin/newfeature/ Compare new components against existing patterns. Are naming conventions, props patterns, and animation styles consistent?"
```

## CoinKeeper-Specific Instructions

### Project Architecture
- **Stack:** React Native, TypeScript, Firebase/Firestore, Reanimated v3
- **Design:** Neumorphic banking aesthetic with soft blues, glassmorphism
- **Navigation:** Stack + Tab navigators with custom ExpandingTabBar
- **State:** Custom hooks pattern (useGroups, useMembers, useTransactions)

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
// Always use TypeScript with proper types
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
    // Use design tokens, not hardcoded values
  },
});
```

**Service Pattern:**
```typescript
// Use Firestore services with proper error handling
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

### Chart Library Integration

For Analytics & Reporting screens (Priority requirement):

```bash
# Check current state
gemini -p "@package.json @src/ What charting libraries are installed? What's the best option for React Native: Victory Native, React Native Chart Kit, or React Native Skia?"

# After installation, validate
gemini -p "@src/screens/admin/analytics/ Review chart implementations for performance and design consistency."
```

### Priority Implementation Order

Based on roadmap:

**MVP (Must Have):**
1. ✅ Admin Dashboard
2. ✅ Groups Management
3. ✅ Members Management
4. ✅ Transactions Management
5. ⚠️ Analytics & Reporting (CHARTS NEEDED)
6. 🔴 Collection Management
7. 🔴 Draw & Lottery Management
8. 🔴 Notifications Center

**Advanced:**
9. 🔴 System Settings
10. 🔴 Wallet/Funds
11. 🔴 Integrations
12. 🔴 Support System

### Gemini Validation Commands

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

## Integration with Claude Code

1. **Claude** asks **Gemini** for codebase analysis
2. **Gemini** provides comprehensive scan with actionable insights
3. **Claude** implements based on Gemini's guidance
4. **Gemini** validates Claude's implementation
5. Repeat for continuous improvement

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

## Qwen Local AI - Privacy-First Fast Inference

**Use Case:** Sensitive code analysis, offline development, rapid iterations, private debugging

### Qwen CLI Commands for CoinKeeper

```bash
# Quick code review (local, private)
qwen "Review this component for best practices" < src/components/ComponentName.tsx

# Fast security check (no cloud upload)
qwen "Check for security vulnerabilities" < src/services/authService.ts

# Generate code snippets
qwen "Generate a TypeScript interface for a transaction with fields: id, amount, date, type, status"

# Debug assistance
qwen "Explain this error: [ERROR_MESSAGE]"

# Refactoring suggestions
qwen "Suggest improvements for this function" < src/utils/helper.ts

# Type definitions
qwen "Create TypeScript types for Firebase Firestore collection with fields: groupId, members, contributions"

# Pattern detection (local file)
qwen "Analyze this file for anti-patterns and code smells" < src/screens/admin/SomeScreen.tsx

# Quick documentation
qwen "Generate JSDoc comments for this function" < src/services/groupService.ts
```

### Qwen Advantages

1. **Privacy:** No code leaves your machine
2. **Speed:** Instant responses, no API latency
3. **Offline:** Works without internet
4. **Unlimited:** No rate limits or token costs
5. **Sensitive Code:** Safe for proprietary algorithms, API keys, business logic

### Qwen Setup (if not installed)

```bash
# Install Qwen locally (example with Ollama)
ollama pull qwen2.5-coder:latest

# Or use LM Studio, Llama.cpp, etc.
# Configure your preferred local model runner

# Test installation
qwen "Hello, test response"
```

### Qwen Workflow Patterns

#### Pattern 1: Local-First Development

```bash
# Step 1: Qwen for quick design
qwen "Design a React Native screen for managing upcoming payments with filters and sorting"

# Step 2: Claude implements
# (Claude Code creates the actual files)

# Step 3: Qwen for local validation
qwen "Review this implementation for performance issues" < src/screens/admin/collections/UpcomingPaymentsScreen.tsx
```

#### Pattern 2: Sensitive Code Handling

```bash
# Use Qwen for anything with:
# - API keys
# - Business logic algorithms
# - Proprietary code
# - Private data schemas

qwen "Review this authentication flow for security issues" < src/services/authService.ts

# Qwen keeps everything local, unlike cloud APIs
```

#### Pattern 3: Rapid Prototyping

```bash
# Fast iterations without API calls
qwen "Generate a skeleton for a draw lottery algorithm with bid validation"
qwen "Create a TypeScript hook for managing payment reminders"
qwen "Write a utility function to calculate contribution defaults"

# Copy Qwen output to Claude for file writing
```

### Qwen Best Practices for CoinKeeper

**Theme Consistency Check:**
```bash
qwen "Check if this component uses design tokens from theme system" < src/components/NewComponent.tsx
```

**Type Safety Validation:**
```bash
qwen "Verify TypeScript types are properly defined" < src/types/newTypes.ts
```

**Performance Analysis:**
```bash
qwen "Find performance bottlenecks in this screen" < src/screens/admin/AnalyticsScreen.tsx
```

**Code Generation:**
```bash
qwen "Generate a Firestore service for managing draws with CRUD operations following this pattern" < src/services/groupService.ts
```

---

## Three-Agent Workflow Integration

### Workflow 1: Feature Implementation

```
1. Gemini (Cloud) → Full codebase scan, identify patterns
   gemini -p "@src/ Analyze existing patterns for implementing Collections module"

2. Qwen (Local) → Generate code scaffolds rapidly
   qwen "Generate TypeScript types and service skeleton for Collections module"

3. Claude (Orchestrator) → Implement with file operations
   (Claude creates actual files based on Qwen's output)

4. Qwen (Local) → Quick local validation
   qwen "Review implementation" < src/screens/admin/collections/

5. Gemini (Cloud) → Comprehensive validation
   gemini -p "@src/screens/admin/collections/ Final review for production readiness"
```

### Workflow 2: Security Audit

```
1. Gemini → Full security scan
   gemini -p "@src/services/ @src/hooks/ Comprehensive security audit"

2. Qwen → Sensitive code review (local only)
   qwen "Check for security issues" < src/config/secrets.ts

3. Claude → Implement fixes

4. Qwen → Verify fixes locally
```

### Workflow 3: Performance Optimization

```
1. Gemini → System-wide performance analysis
   gemini -p "@src/ Identify all performance bottlenecks"

2. Qwen → Component-level analysis
   qwen "Optimize this component" < src/components/HeavyComponent.tsx

3. Claude → Apply optimizations

4. Qwen → Quick re-check
   qwen "Verify optimizations" < src/components/HeavyComponent.tsx
```

### Workflow 4: Rapid Prototyping

```
1. Qwen → Fast design iteration
   qwen "Design 5 different approaches for implementing auto-debit scheduling UI"

2. Claude → Implement chosen approach

3. Qwen → Local refinement
   qwen "Suggest improvements" < src/screens/admin/collections/AutoDebitScreen.tsx

4. Gemini → Final architecture review
   gemini -p "@src/screens/admin/collections/ Validate against codebase patterns"
```

---

## Agent Selection Decision Tree

```
START
  │
  ├─ Need full codebase context? ──YES──> Use Gemini (1M+ tokens)
  │                                │
  │                                NO
  ├─ Sensitive/proprietary code? ──YES──> Use Qwen (local only)
  │                                │
  │                                NO
  ├─ Need to edit files? ──────────YES──> Use Claude (file operations)
  │                                │
  │                                NO
  ├─ Need fast response? ──────────YES──> Use Qwen (instant local)
  │                                │
  │                                NO
  ├─ Architecture planning? ───────YES──> Use Gemini (pattern detection)
  │                                │
  │                                NO
  └─ Default ──────────────────────────> Use Claude (orchestration)
```

---

## Quick Commands Cheat Sheet

### Gemini (Cloud Analysis)
```bash
gemini -p "@./ Full codebase scan"
gemini -p "@src/module/ Deep dive analysis"
gemini -p "@package.json Dependency audit"
```

### Qwen (Local Fast Inference)
```bash
qwen "Quick question" < file.ts
qwen "Generate code for [TASK]"
qwen "Review for [ASPECT]" < file.ts
```

### Claude (Implementation)
```
(Use Claude Code's file tools: Read, Write, Edit)
(Claude orchestrates the workflow)
```

---

## Privacy & Security Guidelines

### Use Gemini (Cloud) for:
- ✅ Open source code analysis
- ✅ Public repository scanning
- ✅ General architecture reviews
- ✅ Non-sensitive performance analysis

### Use Qwen (Local) for:
- ✅ API keys and secrets review
- ✅ Proprietary algorithms
- ✅ Business logic implementation
- ✅ Sensitive data handling
- ✅ Private repository code
- ✅ Customer data schemas

### Use Claude for:
- ✅ File operations (Read/Write/Edit)
- ✅ Workflow orchestration
- ✅ Multi-file refactoring
- ✅ Project management
- ✅ Integration of Gemini/Qwen insights

---

## Performance Comparison

| Metric | Gemini Cloud | Qwen Local | Claude Code |
|--------|--------------|------------|-------------|
| Context Window | 1M+ tokens | 32K-128K tokens | 200K tokens |
| Latency | 2-5 seconds | <100ms | 3-8 seconds |
| Privacy | Cloud (Google) | 100% local | Cloud (Anthropic) |
| Cost | Pay per token | Free (local compute) | Pay per token |
| Offline | ❌ No | ✅ Yes | ❌ No |
| File Operations | ❌ No | ❌ No | ✅ Yes |
| Code Analysis | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Code Generation | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## Environment Setup

### Required Tools

1. **Claude Code** (Already running ✅)
   ```bash
   # VSCode extension or CLI
   ```

2. **Gemini CLI**
   ```bash
   npm install -g @google/generative-ai-cli
   # or use your preferred Gemini CLI tool
   ```

3. **Qwen Local AI**
   ```bash
   # Option 1: Ollama
   ollama pull qwen2.5-coder:latest

   # Option 2: LM Studio (GUI)
   # Download from https://lmstudio.ai/

   # Option 3: llama.cpp
   # Build from source and download Qwen GGUF model
   ```

### Configuration Files

Create `~/.ai-config.yml` (optional):
```yaml
gemini:
  api_key: ${GEMINI_API_KEY}
  model: gemini-2.0-flash-exp

qwen:
  endpoint: http://localhost:11434
  model: qwen2.5-coder:latest
  temperature: 0.7

claude:
  # Managed by Claude Code
```

---

## Advanced Multi-Agent Patterns

### Pattern: Parallel Analysis

```bash
# Run all three agents in parallel for comprehensive review

# Terminal 1: Gemini full scan
gemini -p "@src/screens/admin/newmodule/ Full analysis" > gemini-report.md

# Terminal 2: Qwen security check
qwen "Security audit" < src/services/newService.ts > qwen-security.md

# Terminal 3: Claude implementation
# (Claude waits for reports, then implements)
```

### Pattern: Iterative Refinement

```bash
# Loop: Qwen → Claude → Qwen → Gemini

# Iteration 1: Qwen generates
qwen "Generate Collections module structure" > structure.txt

# Iteration 2: Claude implements
# (Claude reads structure.txt and creates files)

# Iteration 3: Qwen refines locally
qwen "Refine this implementation" < src/screens/admin/collections/Screen.tsx

# Iteration 4: Gemini validates against codebase
gemini -p "@src/ @src/screens/admin/collections/ Final validation"
```

### Pattern: Specialized Tasks

```bash
# Gemini: Architecture (big picture)
gemini -p "@src/ Analyze overall architecture and suggest improvements"

# Qwen: Implementation details (local, fast)
qwen "Implement this algorithm efficiently" < algorithm.pseudo

# Claude: Integration (file operations)
# Claude integrates Qwen's output into the codebase
```

---

## Troubleshooting

### Gemini Issues
- Rate limits → Use Qwen for rapid iterations
- Token limits → Break into smaller contexts
- Latency → Use Qwen for quick tasks

### Qwen Issues
- Model not found → `ollama pull qwen2.5-coder:latest`
- Slow inference → Reduce model size or upgrade hardware
- Memory issues → Use smaller Qwen variant (7B vs 14B)

### Claude Issues
- Context overflow → Use Gemini for large scans first
- File operation errors → Check file permissions
- Ambiguous requests → Provide Gemini/Qwen reports as context

---

## Best Practices Summary

1. **Use Gemini** for comprehensive codebase analysis (large context)
2. **Use Qwen** for fast local iterations and sensitive code (privacy + speed)
3. **Use Claude** for implementation and orchestration (file operations)
4. **Combine all three** for maximum efficiency:
   - Gemini scans → Qwen generates → Claude implements → Qwen validates → Gemini reviews
5. **Keep sensitive code local** with Qwen (never upload secrets to cloud)
6. **Leverage parallel processing** (run agents simultaneously)
7. **Iterate rapidly** with Qwen, validate thoroughly with Gemini
8. **Let Claude orchestrate** the workflow and manage files

---

**Remember:**

- **Gemini** = Analysis (cloud, deep)
- **Qwen** = Generation (local, fast)
- **Claude** = Implementation (orchestration, files)

This triple-agent workflow maximizes productivity, privacy, and code quality.
