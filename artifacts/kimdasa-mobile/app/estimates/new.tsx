import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import {
  useCalculateEstimate,
  useCreateEstimate,
  getGetEstimatesQueryKey,
} from "@workspace/api-client-react";

const SERVICE_TYPES = [
  "Roofing",
  "Siding",
  "Windows",
  "Doors",
  "Gutters",
  "Decking",
  "Interior Remodel",
  "Other",
];
const DIFFICULTIES = ["easy", "medium", "hard"];
const MATERIAL_GRADES = ["economy", "standard", "premium", "luxury"];
const REGIONS: Array<{ label: string; value: "new_jersey" | "pennsylvania" }> = [
  { label: "New Jersey", value: "new_jersey" },
  { label: "Pennsylvania", value: "pennsylvania" },
];

function SelectRow({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  const colors = useColors();
  return (
    <View style={{ gap: 8 }}>
      <Text style={[sel.label, { color: colors.mutedForeground }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={sel.row}>
          {options.map((o) => {
            const active = selected === o;
            return (
              <Pressable
                key={o}
                style={[
                  sel.chip,
                  active
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.secondary, borderColor: colors.border },
                ]}
                onPress={() => onSelect(o)}
              >
                <Text style={[sel.chipText, { color: active ? "#fff" : colors.foreground }]}>
                  {o.charAt(0).toUpperCase() + o.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const sel = StyleSheet.create({
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  row: { flexDirection: "row", gap: 8, paddingRight: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});

export default function NewEstimateScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ customerId?: string }>();

  const [serviceType, setServiceType] = useState("Roofing");
  const [squareFootage, setSquareFootage] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [materialGrade, setMaterialGrade] = useState("standard");
  const [region, setRegion] = useState<"new_jersey" | "pennsylvania">("new_jersey");
  const [notes, setNotes] = useState("");

  const [calculated, setCalculated] = useState<{
    laborCost: number;
    materialCost: number;
    recommendedPrice: number;
    marginPercent: number;
  } | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);

  const calculateEstimate = useCalculateEstimate();
  const createEstimate = useCreateEstimate();

  const handleCalculate = async () => {
    if (!squareFootage || isNaN(parseFloat(squareFootage))) {
      Alert.alert("Required", "Enter square footage to calculate.");
      return;
    }
    setCalculating(true);
    try {
      const result = await calculateEstimate.mutateAsync({
        data: {
          serviceType,
          squareFootage: parseFloat(squareFootage),
          difficulty,
          region,
        },
      });
      setCalculated({
        laborCost: parseFloat(result.laborCost) ?? 0,
        materialCost: parseFloat(result.materialCost) ?? 0,
        recommendedPrice: parseFloat(result.recommendedPrice) ?? 0,
        marginPercent: parseFloat(result.marginPercent) ?? 0,
      });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      Alert.alert("Error", "Could not calculate estimate. Check your inputs.");
    } finally {
      setCalculating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await createEstimate.mutateAsync({
        data: {
          serviceType,
          measurements: squareFootage ? `${squareFootage} sqft` : undefined,
          difficulty,
          materials: materialGrade,
          region,
          notes: notes.trim() || undefined,
          laborCost: calculated?.laborCost != null ? String(calculated.laborCost) : undefined,
          materialCost: calculated?.materialCost != null ? String(calculated.materialCost) : undefined,
          recommendedPrice: calculated?.recommendedPrice != null ? String(calculated.recommendedPrice) : undefined,
          marginPercent: calculated?.marginPercent != null ? String(calculated.marginPercent) : undefined,
          customerId: params.customerId ? parseInt(params.customerId) : undefined,
          status: "draft",
        },
      });
      await queryClient.invalidateQueries({ queryKey: getGetEstimatesQueryKey() });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/estimates/${result.id}`);
    } catch {
      Alert.alert("Error", "Could not save estimate.");
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n: number) =>
    `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <SelectRow
        label="Service Type"
        options={SERVICE_TYPES}
        selected={serviceType}
        onSelect={setServiceType}
      />

      <View style={{ gap: 6 }}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Square Footage</Text>
        <TextInput
          style={[
            styles.textInput,
            { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
          ]}
          placeholder="e.g. 1500"
          placeholderTextColor={colors.mutedForeground}
          value={squareFootage}
          onChangeText={setSquareFootage}
          keyboardType="numeric"
          returnKeyType="done"
        />
      </View>

      <SelectRow
        label="Difficulty"
        options={DIFFICULTIES}
        selected={difficulty}
        onSelect={(v) => setDifficulty(v as "easy" | "medium" | "hard")}
      />
      <SelectRow
        label="Material Grade"
        options={MATERIAL_GRADES}
        selected={materialGrade}
        onSelect={setMaterialGrade}
      />

      <View style={{ gap: 8 }}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Region</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 8, paddingRight: 16 }}>
            {REGIONS.map((r) => {
              const active = region === r.value;
              return (
                <Pressable
                  key={r.value}
                  style={[
                    sel.chip,
                    active
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : { backgroundColor: colors.secondary, borderColor: colors.border },
                  ]}
                  onPress={() => setRegion(r.value)}
                >
                  <Text style={[sel.chipText, { color: active ? "#fff" : colors.foreground }]}>
                    {r.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Notes (optional)</Text>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.foreground,
              height: 80,
              textAlignVertical: "top",
              paddingTop: 12,
            },
          ]}
          placeholder="Any additional notes..."
          placeholderTextColor={colors.mutedForeground}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.calcBtn,
          { backgroundColor: colors.secondary, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
        ]}
        onPress={handleCalculate}
        disabled={calculating}
      >
        {calculating ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <>
            <Ionicons name="calculator-outline" size={18} color={colors.primary} />
            <Text style={[styles.calcBtnText, { color: colors.primary }]}>Calculate Price</Text>
          </>
        )}
      </Pressable>

      {calculated && (
        <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.primary + "44" }]}>
          <Text style={[styles.resultTitle, { color: colors.mutedForeground }]}>Price Breakdown</Text>
          <View style={styles.resultRow}>
            <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>Labor</Text>
            <Text style={[styles.resultValue, { color: colors.foreground }]}>{fmt(calculated.laborCost)}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.resultRow}>
            <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>Materials</Text>
            <Text style={[styles.resultValue, { color: colors.foreground }]}>{fmt(calculated.materialCost)}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.resultRow}>
            <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>Margin</Text>
            <Text style={[styles.resultValue, { color: colors.foreground }]}>{calculated.marginPercent.toFixed(1)}%</Text>
          </View>
          <View style={[styles.priceHighlight, { backgroundColor: colors.primary + "11", borderColor: colors.primary + "33" }]}>
            <Text style={[styles.priceHighlightLabel, { color: colors.mutedForeground }]}>Recommended Price</Text>
            <Text style={[styles.priceHighlightValue, { color: colors.primary }]}>
              {fmt(calculated.recommendedPrice)}
            </Text>
          </View>
        </View>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.saveBtn,
          { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
        ]}
        onPress={handleSave}
        disabled={saving}
        testID="save-estimate-btn"
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Save Estimate</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 20,
    paddingBottom: 40,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  calcBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
  },
  calcBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  resultCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  resultTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  resultValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  divider: {
    height: 1,
    marginHorizontal: -16,
  },
  priceHighlight: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  priceHighlightLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  priceHighlightValue: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  saveBtn: {
    height: 52,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
