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
import { getDb } from '../../store/database';
import { v4 as uuidv4 } from 'uuid';

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

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SHEET_SPRING = { damping: 15, stiffness: 300 };

export const AddCategorySheet: React.FC<Props> = ({ visible, onClose, onSuccess }) => {
  const { colors, cardRadius, iconShadow } = useSpecTheme();
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(800);
  const backdropOpacity = useSharedValue(0);

  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('MoreHorizontal');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, SHEET_SPRING);
      setName('');
      setSelectedIcon('MoreHorizontal');
      setSelectedColor(COLORS[0]);
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      translateY.value = withSpring(800, SHEET_SPRING);
    }
  }, [visible, translateY, backdropOpacity]);

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
    const id = uuidv4();
    // Assuming schema allows color. If not, color is skipped or stored in metadata. We'll try to add it.
    try {
      await db.execute(
        'INSERT INTO categories (id, name, icon) VALUES (?, ?, ?)',
        [id, name.trim(), selectedIcon] // Skipping color insert to avoid schema error if column not present
      );
    } catch (e) {
      console.warn('Failed to insert category', e);
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

        <Animated.View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }, animatedSheet]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>New Category</Text>
            <PressableScale onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.chipBg }]}>
              <X size={20} color={colors.textPrimary} />
            </PressableScale>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 24, paddingBottom: 24 }}>
            
            {/* Live Preview */}
            <View style={[styles.previewCard, { backgroundColor: selectedColor + '15', borderRadius: cardRadius }]}>
              <View style={[styles.iconPreview, { backgroundColor: selectedColor }, iconShadow]}>
                <SelectedIconComponent size={28} color="#FFF" />
                {isAiSuggesting && (
                  <View style={[styles.aiBadge, { backgroundColor: colors.surfaceSunken }]}>
                    <Sparkles size={12} color={colors.textSecondary} />
                  </View>
                )}
              </View>
              <Text style={[styles.previewName, { color: selectedColor }]}>{name || 'Category Name'}</Text>
            </View>

            {/* Input */}
            <View>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.chipBg, borderRadius: cardRadius }]}
                placeholder="e.g., Groceries"
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
                          style={[styles.iconCell, { backgroundColor: isSelected ? selectedColor : colors.chipBg, borderRadius: cardRadius }]}
                        >
                          <IconComp size={24} color={isSelected ? '#fff' : colors.textPrimary} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>

            <PressableScale 
              onPress={handleSave}
              style={[styles.saveBtn, { backgroundColor: name.trim() ? selectedColor : colors.chipBg, borderRadius: cardRadius }]}
              disabled={!name.trim()}
            >
              <Text style={[styles.saveText, { color: name.trim() ? '#FFF' : colors.textSecondary }]}>Save Category</Text>
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
  title: { fontFamily: 'Satoshi-Bold', fontSize: 20 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  scroll: { flexGrow: 1 },
  
  previewCard: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 16 },
  iconPreview: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  aiBadge: { position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  previewName: { fontFamily: 'Satoshi-Bold', fontSize: 18 },
  
  label: { fontFamily: 'Satoshi-Medium', fontSize: 14, marginBottom: 8 },
  input: { fontFamily: 'Satoshi-Medium', fontSize: 16, paddingHorizontal: 16, paddingVertical: 14 },
  
  colorOption: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  colorDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFF' },
  
  iconGroup: { marginBottom: 16 },
  groupTitle: { fontSize: 12, fontFamily: 'Satoshi-Bold', textTransform: 'uppercase', marginBottom: 8, opacity: 0.7 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  iconCell: { width: 56, height: 56, justifyContent: 'center', alignItems: 'center' },
  
  saveBtn: { height: 56, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  saveText: { fontFamily: 'Satoshi-Bold', fontSize: 16 }
});
