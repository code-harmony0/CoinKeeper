# 💰 CoinKeeper

**A Premium Expense Tracker + Chit Fund Manager**

[![React Native](https://img.shields.io/badge/React%20Native-0.80.2-blue.svg)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0.4-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> World-class UI with Dribbble-level design quality, powered by advanced animations and premium pastel aesthetics.

---

## ✨ Features

### 💸 Expense Tracking
- **Manual Entry**: Add income and expenses with beautiful UI
- **SMS Auto-Extraction**: Automatically parse bank SMS messages
- **Categories**: Pre-defined categories with custom icons
- **Budget Tracking**: Set monthly budgets with visual progress

### 🤝 Chit Fund Management
- **Create Groups**: Organize chit funds with members
- **Track Contributions**: Monitor payments and dues
- **Manual Draw System**: Conduct fair draws with biometric security
- **Member Management**: Add, remove, approve participants

### 🎨 Premium Design
- **Pastel Color Palette**: Soft, calming colors (Baby Blue, Peach, Mint, Lavender)
- **Glassmorphism**: Blur effects and translucent surfaces
- **Spring Animations**: Physics-based micro-interactions
- **Liquid Transitions**: Smooth, delightful page transitions
- **Haptic Feedback**: Tactile responses for every interaction
- **Lucide Icons**: Modern, crisp iconography

### 📊 Analytics & Reports
- Spending breakdown by category
- Monthly income vs expense trends
- Chit fund contribution analytics
- Export to CSV/PDF

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- React Native CLI
- Xcode (for iOS)
- Android Studio (for Android)

### Installation

```bash
# Clone the repository
git clone https://github.com/code-harmony0/CoinKeeper.git
cd coinkeeper

# Install dependencies
npm install

# iOS setup
cd ios && pod install && cd ..

# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

---

## 📱 Screens

### Onboarding Flow
- ✅ Splash Screen
- ✅ Onboarding Carousel (4 slides)
- ✅ Login Screen (Phone + Demo)

### User Mode
- ✅ **Dashboard**: Balance overview, quick actions, budget, transactions
- 🚧 **Transactions**: Filterable list with search
- 🚧 **Chit Groups**: Active groups with next draw info
- 🚧 **Reports**: Visual analytics and insights
- 🚧 **Settings**: Profile, preferences, security

### Admin Mode
- 🚧 **Admin Dashboard**: Alerts, metrics, approvals
- 🚧 **Group Management**: Create, edit, manage groups
- 🚧 **Approvals**: Member requests, contributions
- 🚧 **Manual Draw**: Conduct secure draws

Legend: ✅ Complete | 🚧 In Progress | ⏳ Planned

---

## 🎨 Design System

### Color Palette
```typescript
{
  babyBlue: '#BDE0FE',
  softPeach: '#FFDAB9',
  mintGreen: '#A8E6CF',
  lavender: '#E6DFFD',
  offWhite: '#FAFAF8',
  navyText: '#1E2A33',
}
```

### Typography
- **Font Family**: Plus Jakarta Sans
- **Sizes**: 12px - 56px scale
- **Weights**: Regular, Medium, SemiBold, Bold

### Spacing
- **8px grid system**: xs(8), sm(12), md(16), lg(20), xl(24), xxl(32)

### Shadows
- Soft, airy shadows with 5-20% opacity
- Premium elevation system

---

## 🛠️ Tech Stack

### Core
- **React Native**: 0.80.2
- **TypeScript**: 5.0.4
- **React Navigation**: Latest

### Animations
- **Reanimated 3**: Advanced spring physics
- **Linear Gradient**: Smooth color transitions
- **Blur View**: Glassmorphism effects
- **Haptic Feedback**: Tactile interactions

### Icons & UI
- **Lucide React Native**: Premium icons
- **React Native SVG**: Vector graphics
- **Chart Kit**: Analytics visualizations

### Backend
- **Firebase**: Authentication, Firestore
- **SMS Permissions**: Android SMS reading

---

## 📂 Project Structure

```
src/
├── components/
│   ├── animated/     # Premium animated components
│   ├── core/         # UI primitives
│   ├── transaction/  # Transaction-specific
│   └── modals/       # Bottom sheets
├── screens/          # Screen components
├── navigation/       # Navigation config
├── theme/            # Design tokens
├── hooks/            # Custom hooks
├── services/         # API & business logic
└── utils/            # Helper functions
```

See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for detailed documentation.

---

## 🎯 Roadmap

### Phase 1: Core Features (Current)
- [x] Design system & theme
- [x] Onboarding flow
- [x] User dashboard
- [x] Premium animations
- [ ] Transaction management
- [ ] Chit fund basics

### Phase 2: Advanced Features
- [ ] SMS auto-extraction
- [ ] Biometric authentication
- [ ] Push notifications
- [ ] Data export
- [ ] Admin panel

### Phase 3: Polish
- [ ] Dark mode
- [ ] Offline support
- [ ] Performance optimization
- [ ] Analytics integration
- [ ] A/B testing

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Design inspiration from Dribbble's premium mobile designs
- Icons by [Lucide](https://lucide.dev/)
- Animations powered by [Reanimated](https://docs.swmansion.com/react-native-reanimated/)

---

## 📧 Contact

**Developer**: Your Name
**Email**: your.email@example.com
**Project Link**: [https://github.com/code-harmony0/CoinKeeper](https://github.com/code-harmony0/CoinKeeper)

---

<div align="center">
  <strong>Made with ❤️ and premium design principles</strong>
</div>
