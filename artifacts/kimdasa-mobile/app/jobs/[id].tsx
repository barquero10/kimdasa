import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import {
  useDeleteJob,
  useGetJob,
  useGetCustomer,
  useUpdateJob,
  getGetCustomerQueryKey,
} from "@workspace/api-client-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  scheduled: { label: "Scheduled", color: "#3b82f6", icon: "calendar-outline" },
  in_progress: { label: "In Progress", color: "#f97316", icon: "play-circle-outline" },
  completed: { label: "Completed", color: "#22c55e", icon: "checkmark-circle-outline" },
  on_hold: { label: "On Hold", color: "#f59e0b", icon: "pause-circle-outline" },
  cancelled: { label: "Cancelled", color: "#ef4444", icon: "close-circle-outline" },
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  const colors = useColors();
  if (!value) return null;
  return (
    <View style={infoStyles.row}>
      <Text style={[infoStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[infoStyles.value, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, gap: 12 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  value: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "right" },
});

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const jobId = parseInt(id ?? "0");
  const { data: job, isLoading } = useGetJob(jobId);
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();

  const customerId = job?.customerId ?? 0;
  const { data: customer } = useGetCustomer(customerId, {
    query: {
      enabled: !!job?.customerId,
      queryKey: getGetCustomerQueryKey(customerId),
    },
  });

  const handleStatusChange = async (newStatus: string) => {
    if (!job) return;
    try {
      await updateJob.mutateAsync({
        id: jobId,
        data: {
          title: job.title,
          status: newStatus as "scheduled" | "in_progress" | "completed" | "on_hold" | "cancelled",
          serviceType: job.serviceType ?? undefined,
          customerId: job.customerId ?? undefined,
          estimateId: job.estimateId ?? undefined,
          startDate: job.startDate ?? undefined,
          endDate: job.endDate ?? undefined,
          crewNotes: job.crewNotes ?? undefined,
          notes: job.notes ?? undefined,
        },
      });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      Alert.alert("Error", "Could not update status.");
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Job", "Are you sure you want to delete this job?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteJob.mutateAsync({ id: jobId });
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          } catch {
            Alert.alert("Error", "Could not delete job.");
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (isLoading || !job) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const cfg = STATUS_CONFIG[job.status] ?? { label: job.status, color: colors.mutedForeground, icon: "briefcase-outline" as const };
  const STATUS_OPTIONS = Object.keys(STATUS_CONFIG);

  const formatDate = (d: string | null | undefined) =>
    d
      ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : null;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.jobTitle, { color: colors.foreground }]}>{job.title}</Text>
            {customer && (
              <Pressable onPress={() => router.push(`/customers/${customer.id}`)}>
                <Text style={[styles.customerLink, { color: colors.primary }]}>{customer.name}</Text>
              </Pressable>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.color + "22" }]}>
            <Ionicons name={cfg.icon} size={14} color={cfg.color} />
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Details</Text>
        <InfoRow label="Service Type" value={job.serviceType} />
        {job.serviceType && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
        <InfoRow label="Start Date" value={formatDate(job.startDate)} />
        {job.startDate && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
        <InfoRow label="End Date" value={formatDate(job.endDate)} />
      </View>

      {(job.notes || job.crewNotes) && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {job.crewNotes && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Crew Notes</Text>
              <Text style={[styles.notesText, { color: colors.foreground }]}>{job.crewNotes}</Text>
            </>
          )}
          {job.notes && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Notes</Text>
              <Text style={[styles.notesText, { color: colors.foreground }]}>{job.notes}</Text>
            </>
          )}
        </View>
      )}

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Update Status</Text>
        <View style={styles.statusGrid}>
          {STATUS_OPTIONS.map((s) => {
            const c = STATUS_CONFIG[s]!;
            const active = job.status === s;
            return (
              <Pressable
                key={s}
                style={[
                  styles.statusBtn,
                  active
                    ? { backgroundColor: c.color, borderColor: c.color }
                    : { backgroundColor: colors.secondary, borderColor: colors.border },
                ]}
                onPress={() => handleStatusChange(s)}
              >
                <Ionicons name={c.icon} size={14} color={active ? "#fff" : c.color} />
                <Text style={[styles.statusBtnText, { color: active ? "#fff" : colors.foreground }]}>
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.deleteBtn,
          { borderColor: colors.destructive + "44", backgroundColor: colors.destructive + "11", opacity: pressed ? 0.8 : 1 },
        ]}
        onPress={handleDelete}
        disabled={deleting}
      >
        {deleting ? (
          <ActivityIndicator size="small" color={colors.destructive} />
        ) : (
          <>
            <Ionicons name="trash-outline" size={16} color={colors.destructive} />
            <Text style={[styles.deleteBtnText, { color: colors.destructive }]}>Delete Job</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  jobTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  customerLink: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    marginHorizontal: -16,
  },
  notesText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusBtnText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  deleteBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
