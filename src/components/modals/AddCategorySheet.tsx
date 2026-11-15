import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TextInput,
  Text,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Sparkles } from 'lucide-react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import { getDb } from '../../store/database';
import { v4 as uuidv4 } from 'uuid';
import { CategoryData } from '../../types/category';
import { BudgetBucket, classifyBudgetBucket } from '../../utils/budgetBucket';

import * as Icons from 'lucide-react-native';

const ICON_GROUPS = [
  { title: 'Common', icons: ['ShoppingBag', 'Receipt', 'Utensils', 'Coffee', 'Car'] },
  { title: 'Home', icons: ['Home', 'Wifi', 'Zap', 'Droplets', 'Sofa'] },
  { title: 'Lifestyle', icons: ['HeartPulse', 'Dumbbell', 'Scissors', 'Gamepad2', 'Film'] },
  { title: 'Travel', icons: ['Plane', 'Train', 'Bus', 'Hotel', 'Map'] },
];

const COLORS = [
  '#4F46E5', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'
];

const BUCKET_OPTIONS: { id: BudgetBucket; label: string }[] = [
  { id: 'needs', label: 'Needs' },
  { id: 'wants', label: 'Wants' },
  { id: 'savings', label: 'Savings' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editing?: CategoryData;
}

const SHEET_SPRING = { damping: 15, stiffness: 300 };

const INK = '#111111';

export const AddCategorySheet: React.FC<Props> = ({ visible, onClose, onSuccess, editing }) => {
  const { colors, cardRadius, iconShadow } = useSpecTheme();
  const insets = useSafeAreaInsets();
  const kbHeight = useKeyboardHeight();

  const translateY = useSharedValue(800);
  const backdropOpacity = useSharedValue(0);

  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('MoreHorizontal');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedBucket, setSelectedBucket] = useState<BudgetBucket>('wants');
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, SHEET_SPRING);
      setName(editing?.name ?? '');
      setSelectedIcon(editing?.icon ?? 'MoreHorizontal');
      setSelectedColor(editing?.color ?? COLORS[0]);
      setSelectedBucket(editing?.budgetBucket ?? classifyBudgetBucket(editing?.name ?? ''));
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      translateY.value = withSpring(800, SHEET_SPRING);
    }
  }, [visible, translateY, backdropOpacity, editing]);

  // AI icon mapping heuristic
  useEffect(() => {
    if (name.length > 2) {
      setIsAiSuggesting(true);
      const timer = setTimeout(() => {
        const lowerName = name.toLowerCase();
        let suggestion = selectedIcon;
        let colorSugg = selectedColor;
        
        if (lowerName.includes('food') || lowerName.includes('eat')) { suggestion = 'Utensils'; colorSugg = '#F59E0B'; }
        else if (lowerName.includes('travel') || lowerName.includes('car')) { suggestion = 'Car'; colorSugg = '#06B6D4'; }
        else if (lowerName.includes('shop')) { suggestion = 'ShoppingBag'; colorSugg = '#EC4899'; }
        else if (lowerName.includes('bill') || lowerName.includes('util')) { suggestion = 'Zap'; colorSugg = '#4F46E5'; }
        else if (lowerName.includes('movie') || lowerName.includes('fun')) { suggestion = 'Film'; colorSugg = '#8B5CF6'; }
        else if (lowerName.includes('health') || lowerName.includes('med')) { suggestion = 'HeartPulse'; colorSugg = '#EF4444'; }
        else if (lowerName.includes('coffee') || lowerName.includes('cafe')) { suggestion = 'Coffee'; colorSugg = '#8B5CF6'; }
        
        if (suggestion !== selectedIcon || colorSugg !== selectedColor) {
          setSelectedIcon(suggestion);
          setSelectedColor(colorSugg);
        }
        setIsAiSuggesting(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [name]);

  const handleSave = async () => {
    if (!name.trim()) return;
    const db = getDb();

    try {
      if (editing) {
        await db.execute(
          'UPDATE categories SET name = ?, icon = ?, color = ?, budget_bucket = ? WHERE id = ?',
          [name.trim(), selectedIcon, selectedColor, selectedBucket, editing.id],
        );
      } else {
        const id = uuidv4();
        await db.execute(
          'INSERT INTO categories (id, name, icon, color, budget_bucket) VALUES (?, ?, ?, ?, ?)',
          [id, name.trim(), selectedIcon, selectedColor, selectedBucket],
        );
      }
    } catch (e) {
      console.warn('Failed to save category', e);
      return;
    }
    onSuccess();
    onClose();
  };

  const animatedBackdrop = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const animatedSheet = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  if (!visible) return null;

  const SelectedIconComponent = (Icons as any)[selectedIcon] || Icons.MoreHorizontal;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[styles.backdrop, animatedBackdrop]}>
          <PressableScale style={styles.flex1} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom + 16, kbHeight + 12) }, animatedSheet]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {editing ? 'Edit category' : 'New category'}
            </Text>
            <PressableScale onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.chipBg }]}>
              <X size={20} color={colors.textPrimary} />
            </PressableScale>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 24, paddingBottom: 24 }}>
            
            {/* Live Preview */}
            <View style={[styles.previewCard, { backgroundColor: colors.chipBg }]}>
              <View style={[styles.iconPreview, { backgroundColor: selectedColor }]}>
                <SelectedIconComponent size={28} color="#FFF" />
                {isAiSuggesting && (
                  <View style={[styles.aiBadge, { backgroundColor: colors.surfaceSunken }]}>
                    <Sparkles size={12} color={colors.textSecondary} />
                  </View>
                )}
              </View>
              <Text style={[styles.previewName, { color: name ? colors.textPrimary : colors.textSecondary }]} numberOfLines={1}>{name || 'Category name'}</Text>
            </View>

            {/* Input */}
            <View>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.chipBg, borderRadius: 16 }]}
                placeholder="e.g. Groceries"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
                autoFocus
              />
            </View>

            {/* Colors */}
            <View>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Color</Text>
              <FlatList
                data={COLORS}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={item => item}
                contentContainerStyle={{ gap: 12 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => setSelectedColor(item)}
                    style={[styles.colorOption, { backgroundColor: item }]}
                  >
                    {selectedColor === item && <View style={styles.colorDot} />}
                  </TouchableOpacity>
                )}
              />
            </View>

            {/* Budget Bucket */}
            <View>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Budget Bucket</Text>
              <View style={styles.bucketRow}>
                {BUCKET_OPTIONS.map(opt => {
                  const isSelected = selectedBucket === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      testID={`bucket-option-${opt.id}`}
                      onPress={() => setSelectedBucket(opt.id)}
                      style={[
                        styles.bucketOption,
                        { backgroundColor: isSelected ? INK : colors.chipBg },
                      ]}
                    >
                      <Text style={{ color: isSelected ? '#fff' : colors.textPrimary, fontFamily: 'Satoshi-Bold', fontSize: 14, lineHeight: 20 }}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Icons */}
            <View>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Icon</Text>
              {ICON_GROUPS.map((group, gIdx) => (
                <View key={gIdx} style={styles.iconGroup}>
                  <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>{group.title}</Text>
                  <View style={styles.iconGrid}>
                    {group.icons.map((icon, iIdx) => {
                      const IconComp = (Icons as any)[icon];
                      const isSelected = selectedIcon === icon;
                      return (
                        <TouchableOpacity
                          key={iIdx}
                          onPress={() => setSelectedIcon(icon)}
                          style={[styles.iconCell, { backgroundColor: isSelected ? INK : colors.chipBg }]}
                        >
                          <IconComp size={24} color={isSelected ? '#FFC400' : colors.textPrimary} strokeWidth={1.8} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>

            <PressableScale 
              onPress={handleSave}
              style={[styles.saveBtn, { backgroundColor: name.trim() ? INK : colors.chipBg }]}
              disabled={!name.trim()}
            >
              <Text style={[styles.saveText, { color: name.trim() ? '#FFC400' : colors.textSecondary }]}>
                {editing ? 'Save changes' : 'Save category'}
              </Text>
            </PressableScale>

          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontFamily: 'Satoshi-Bold', fontSize: 20, lineHeight: 28 },
  closeBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  scroll: { flexGrow: 1 },
  
  previewCard: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 16, borderRadius: 20 },
  iconPreview: { width: 56, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  aiBadge: { position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  previewName: { flex: 1, fontFamily: 'Satoshi-Bold', fontSize: 20, lineHeight: 28 },
  
  label: { fontFamily: 'Satoshi-Medium', fontSize: 14, marginBottom: 8 },
  input: { fontFamily: 'Satoshi-Medium', fontSize: 16, paddingHorizontal: 16, paddingVertical: 14 },
  
  colorOption: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  colorDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFF' },

  bucketRow: { flexDirection: 'row', gap: 8 },
  bucketOption: { flex: 1, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  
  iconGroup: { marginBottom: 16 },
  groupTitle: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium', marginBottom: 8 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  iconCell: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  
  saveBtn: { height: 56, borderRadius: 999, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  saveText: { fontFamily: 'Satoshi-Bold', fontSize: 16 }
});
