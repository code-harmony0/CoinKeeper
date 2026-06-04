/**
 * ExportDataScreen
 * Data export UI with template selection, format picker, and export status tracking
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {
  ArrowLeft, Download, FileText, FileSpreadsheet,
  File, CheckCircle, Clock,
} from 'lucide-react-native';
import { COLORS } from '../../../theme/colors';
import {
  createExportRequest,
  EXPORT_TEMPLATES,
} from '../../../features/analytics/services/exportService';
import type { ExportFormat } from '../../../features/analytics/types';

const SPRING_CONFIG = { damping: 16, stiffness: 140, mass: 1 };

const FORMATS: { key: ExportFormat; label: string; icon: typeof FileText }[] = [
  { key: 'csv', label: 'CSV', icon: FileText },
  { key: 'excel', label: 'Excel', icon: FileSpreadsheet },
  { key: 'pdf', label: 'PDF', icon: File },
  { key: 'json', label: 'JSON', icon: FileText },
];

interface Props {
  navigation: any;
}

export const ExportDataScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [exportId, setExportId] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    if (!selectedTemplate) {
      Alert.alert('Select Template', 'Please select an export template first.');
      return;
    }

    ReactNativeHapticFeedback.trigger('impactMedium');
    setIsExporting(true);

    try {
      const template = EXPORT_TEMPLATES.find(t => t.id === selectedTemplate);
      if (!template) return;

      const now = new Date();
      const startDate = new Date(now);
      switch (template.defaultRange) {
        case 'week': startDate.setDate(startDate.getDate() - 7); break;
        case 'month': startDate.setMonth(startDate.getMonth() - 1); break;
        case 'quarter': startDate.setMonth(startDate.getMonth() - 3); break;
      }

      const id = await createExportRequest(
        'admin',
        template.type as any,
        selectedFormat,
        { startDate, endDate: now },
        { metrics: template.metrics }
      );

      setExportId(id);
      Alert.alert(
        'Export Requested',
        `Your ${template.name} export is being prepared. You'll be notified when it's ready for download.`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert('Export Failed', (err as Error).message);
    } finally {
      setIsExporting(false);
    }
  }, [selectedTemplate, selectedFormat]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.springify().damping(16).stiffness(140).mass(1)} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={22} color="#121723" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Export Data</Text>
            <Text style={styles.headerSubtitle}>Generate reports</Text>
          </View>
        </Animated.View>

        {/* Export Templates */}
        <Animated.View entering={FadeInDown.delay(50).springify().damping(16).stiffness(140).mass(1)} style={styles.section}>
          <Text style={styles.sectionTitle}>Report Template</Text>
          {EXPORT_TEMPLATES.map(template => (
            <TouchableOpacity
              key={template.id}
              onPress={() => {
                ReactNativeHapticFeedback.trigger('selection');
                setSelectedTemplate(template.id);
              }}
              style={[
                styles.templateCard,
                selectedTemplate === template.id && styles.selectedTemplateCard,
              ]}>
              <View style={styles.templateHeader}>
                <FileText
                  size={20}
                  color={selectedTemplate === template.id ? COLORS.primaryBlue : '#666'}
                />
                <Text style={[
                  styles.templateName,
                  selectedTemplate === template.id && styles.selectedTemplateName,
                ]}>
                  {template.name}
                </Text>
                {selectedTemplate === template.id && (
                  <CheckCircle size={18} color={COLORS.primaryBlue} />
                )}
              </View>
              <Text style={styles.templateDescription}>{template.description}</Text>
              <View style={styles.templateMeta}>
                <Clock size={12} color="#999" />
                <Text style={styles.templateRange}>
                  Default: Last {template.defaultRange}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Format Selection */}
        <Animated.View entering={FadeInDown.delay(100).springify().damping(16).stiffness(140).mass(1)} style={styles.section}>
          <Text style={styles.sectionTitle}>Export Format</Text>
          <View style={styles.formatGrid}>
            {FORMATS.map(format => {
              const IconComponent = format.icon;
              const isSelected = selectedFormat === format.key;
              return (
                <TouchableOpacity
                  key={format.key}
                  onPress={() => {
                    ReactNativeHapticFeedback.trigger('selection');
                    setSelectedFormat(format.key);
                  }}
                  style={[styles.formatCard, isSelected && styles.selectedFormatCard]}>
                  <IconComponent
                    size={24}
                    color={isSelected ? '#FFFFFF' : '#121723'}
                  />
                  <Text style={[styles.formatLabel, isSelected && styles.selectedFormatLabel]}>
                    {format.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Export Button */}
        <Animated.View entering={FadeInDown.delay(150).springify().damping(16).stiffness(140).mass(1)} style={styles.section}>
          <TouchableOpacity
            onPress={handleExport}
            disabled={isExporting || !selectedTemplate}
            style={[
              styles.exportButton,
              (!selectedTemplate || isExporting) && styles.exportButtonDisabled,
            ]}>
            {isExporting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Download size={20} color="#FFFFFF" />
            )}
            <Text style={styles.exportButtonText}>
              {isExporting ? 'Preparing Export...' : 'Generate Report'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Export Status */}
        {exportId && (
          <Animated.View entering={FadeInDown.delay(200).springify().damping(16).stiffness(140).mass(1)} style={styles.section}>
            <View style={styles.statusCard}>
              <CheckCircle size={20} color="#2E7D32" />
              <View style={styles.statusInfo}>
                <Text style={styles.statusTitle}>Export Queued</Text>
                <Text style={styles.statusMeta}>
                  Export ID: {exportId.slice(0, 8)}...
                </Text>
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#C2DFF7' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, gap: 14,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 14, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 24, fontFamily: 'PlusJakartaSans-Bold', color: '#121723' },
  headerSubtitle: { fontSize: 13, fontFamily: 'PlusJakartaSans-Regular', color: '#666' },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', color: '#121723', marginBottom: 12 },
  templateCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  selectedTemplateCard: { borderColor: COLORS.primaryBlue, backgroundColor: '#F0F7FF' },
  templateHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  templateName: { flex: 1, fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold', color: '#121723' },
  selectedTemplateName: { color: COLORS.primaryBlue },
  templateDescription: { fontSize: 13, fontFamily: 'PlusJakartaSans-Regular', color: '#666', marginBottom: 8, lineHeight: 18 },
  templateMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  templateRange: { fontSize: 11, fontFamily: 'PlusJakartaSans-Medium', color: '#999' },
  formatGrid: { flexDirection: 'row', gap: 12 },
  formatCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  selectedFormatCard: { backgroundColor: '#121723', borderColor: '#121723' },
  formatLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans-SemiBold', color: '#121723', marginTop: 8 },
  selectedFormatLabel: { color: '#FFFFFF' },
  exportButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#121723', borderRadius: 16, paddingVertical: 16, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  exportButtonDisabled: { opacity: 0.5 },
  exportButtonText: { fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', color: '#FFFFFF' },
  statusCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9',
    borderRadius: 14, padding: 14, gap: 12,
  },
  statusInfo: { flex: 1 },
  statusTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold', color: '#2E7D32' },
  statusMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans-Regular', color: '#666', marginTop: 2 },
});

export default ExportDataScreen;
