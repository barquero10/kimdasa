import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
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
import { useCreateJob, useGetCustomers, getGetJobsQueryKey } from "@workspace/api-client-react";

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

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
];

export default function NewJobScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [serviceType, setServiceType] = useState("Roofing");
  const [status, setStatus] = useState<"scheduled" | "in_progress">("scheduled");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [crewNotes, setCrewNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const crewNotesRef = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);

  const { data: customers } = useGetCustomers();
  const createJob = useCreateJob();

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Required", "Job title is required.");
      return;
    }
    setSaving(true);
    try {
      const result = await createJob.mutateAsync({
        data: {
          title: title.trim(),
          serviceType,
          status,
          customerId: customerId ?? undefined,
          startDate: startDate.trim() || undefined,
          crewNotes: crewNotes.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      });
      await queryClient.invalidateQueries({ queryKey: getGetJobsQueryKey() });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/jobs/${result.id}`);
    } catch {
      Alert.alert("Error", "Could not create job.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={{ gap: 6 }}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          Job Title <Text style={{ color: colors.primary }}>*</Text>
        </Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
          ]}
          placeholder="e.g. Roof Replacement - 123 Main St"
          placeholderTextColor={colors.mutedForeground}
          value={title}
          onChangeText={setTitle}
          returnKeyType="next"
        />
      </View>

      <View style={{ gap: 8 }}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Service Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 8, paddingRight: 16 }}>
            {SERVICE_TYPES.map((s) => {
              const active = serviceType === s;
              return (
                <Pressable
                  key={s}
                  style={[
                    styles.chip,
                    active
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : { backgroundColor: colors.secondary, borderColor: colors.border },
                  ]}
                  onPress={() => setServiceType(s)}
                >
                  <Text style={[styles.chipText, { color: active ? "#fff" : colors.foreground }]}>
                    {s}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Status</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {STATUS_OPTIONS.map((s) => {
            const active = status === s.value;
            return (
              <Pressable
                key={s.value}
                style={[
                  styles.chip,
                  active
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.secondary, borderColor: colors.border },
                ]}
                onPress={() => setStatus(s.value as "scheduled" | "in_progress")}
              >
                <Text style={[styles.chipText, { color: active ? "#fff" : colors.foreground }]}>
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {customers && customers.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Customer (optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 8, paddingRight: 16 }}>
              <Pressable
                style={[
                  styles.chip,
                  !customerId
                    ? { backgroundColor: colors.secondary, borderColor: colors.primary }
                    : { backgroundColor: colors.secondary, borderColor: colors.border },
                ]}
                onPress={() => setCustomerId(null)}
              >
                <Text style={[styles.chipText, { color: !customerId ? colors.primary : colors.foreground }]}>
                  None
                </Text>
              </Pressable>
              {customers.map((c) => {
                const active = customerId === c.id;
                return (
                  <Pressable
                    key={c.id}
                    style={[
                      styles.chip,
                      active
                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                        : { backgroundColor: colors.secondary, borderColor: colors.border },
                    ]}
                    onPress={() => setCustomerId(c.id)}
                  >
                    <Text style={[styles.chipText, { color: active ? "#fff" : colors.foreground }]}>
                      {c.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      <View style={{ gap: 6 }}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Start Date (optional)</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
          ]}
          placeholder="e.g. 2026-06-15"
          placeholderTextColor={colors.mutedForeground}
          value={startDate}
          onChangeText={setStartDate}
          returnKeyType="next"
          onSubmitEditing={() => crewNotesRef.current?.focus()}
        />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Crew Notes</Text>
        <TextInput
          ref={crewNotesRef}
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.foreground,
              height: 80,
              textAlignVertical: "top",
              paddingTop: 12,
            },
          ]}
          placeholder="Instructions for the crew..."
          placeholderTextColor={colors.mutedForeground}
          value={crewNotes}
          onChangeText={setCrewNotes}
          multiline
          returnKeyType="next"
          onSubmitEditing={() => notesRef.current?.focus()}
        />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Internal Notes</Text>
        <TextInput
          ref={notesRef}
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.foreground,
              height: 80,
              textAlignVertical: "top",
              paddingTop: 12,
            },
          ]}
          placeholder="Any other notes..."
          placeholderTextColor={colors.mutedForeground}
          value={notes}
          onChangeText={setNotes}
          multiline
        />
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.saveBtn,
          { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
        ]}
        onPress={handleSave}
        disabled={saving}
        testID="save-job-btn"
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Create Job</Text>
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
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  saveBtn: {
    height: 52,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
