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
  useDeleteEstimate,
  useGetEstimate,
  useGetCustomer,
  useUpdateEstimate,
  getGetCustomerQueryKey,
} from "@workspace/api-client-react";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "#94a3b8" },
  sent: { label: "Sent", color: "#3b82f6" },
  approved: { label: "Approved", color: "#22c55e" },
  rejected: { label: "Rejected", color: "#ef4444" },
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
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  value: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "right" },
});

export default function EstimateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const estimateId = parseInt(id ?? "0");
  const { data: estimate, isLoading } = useGetEstimate(estimateId);
  const updateEstimate = useUpdateEstimate();
  const deleteEstimate = useDeleteEstimate();

  const customerId = estimate?.customerId ?? 0;
  const { data: customer } = useGetCustomer(customerId, {
    query: {
      enabled: !!estimate?.customerId,
      queryKey: getGetCustomerQueryKey(customerId),
    },
  });

  const handleStatusChange = async (newStatus: string) => {
    if (!estimate) return;
    try {
      await updateEstimate.mutateAsync({
        id: estimateId,
        data: {
          serviceType: estimate.serviceType,
          status: newStatus as "draft" | "sent" | "approved" | "rejected",
          customerId: estimate.customerId ?? undefined,
          leadId: estimate.leadId ?? undefined,
          measurements: estimate.measurements ?? undefined,
          difficulty: estimate.difficulty ?? undefined,
          materials: estimate.materials ?? undefined,
          region: estimate.region ?? undefined,
          laborCost: estimate.laborCost ?? undefined,
          materialCost: estimate.materialCost ?? undefined,
          recommendedPrice: estimate.recommendedPrice ?? undefined,
          clientPrice: estimate.clientPrice ?? undefined,
          marginPercent: estimate.marginPercent ?? undefined,
          notes: estimate.notes ?? undefined,
        },
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Could not update status.");
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Estimate", "Are you sure you want to delete this estimate?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteEstimate.mutateAsync({ id: estimateId });
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          } catch {
            Alert.alert("Error", "Could not delete estimate.");
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (isLoading || !estimate) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const cfg = STATUS_CONFIG[estimate.status] ?? { label: estimate.status, color: colors.mutedForeground };
  const clientPrice = estimate.clientPrice
    ? `$${parseFloat(estimate.clientPrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
    : null;
  const recommendedPrice = estimate.recommendedPrice
    ? `$${parseFloat(estimate.recommendedPrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
    : null;
  const laborCost = estimate.laborCost
    ? `$${parseFloat(estimate.laborCost).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
    : null;
  const materialCost = estimate.materialCost
    ? `$${parseFloat(estimate.materialCost).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
    : null;

  const STATUS_OPTIONS = ["draft", "sent", "approved", "rejected"];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.serviceType, { color: colors.foreground }]}>{estimate.serviceType}</Text>
            {customer && (
              <Pressable onPress={() => router.push(`/customers/${customer.id}`)}>
                <Text style={[styles.customerLink, { color: colors.primary }]}>{customer.name}</Text>
              </Pressable>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.color + "22" }]}>
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {(clientPrice ?? recommendedPrice) && (
          <View style={[styles.priceBox, { backgroundColor: colors.primary + "11", borderColor: colors.primary + "33" }]}>
            <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>
              {clientPrice ? "Client Price" : "Recommended Price"}
            </Text>
            <Text style={[styles.priceValue, { color: colors.primary }]}>
              {clientPrice ?? recommendedPrice}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Details</Text>
        <InfoRow label="Service Type" value={estimate.serviceType} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <InfoRow label="Region" value={estimate.region} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <InfoRow label="Measurements" value={estimate.measurements} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <InfoRow label="Difficulty" value={estimate.difficulty} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <InfoRow label="Materials" value={estimate.materials} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <InfoRow label="Roof Pitch" value={estimate.roofPitch} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Cost Breakdown</Text>
        <InfoRow label="Labor Cost" value={laborCost} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <InfoRow label="Material Cost" value={materialCost} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <InfoRow label="Recommended Price" value={recommendedPrice} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <InfoRow label="Client Price" value={clientPrice} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <InfoRow label="Margin" value={estimate.marginPercent ? `${estimate.marginPercent}%` : null} />
      </View>

      {estimate.notes && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Notes</Text>
          <Text style={[styles.notesText, { color: colors.foreground }]}>{estimate.notes}</Text>
        </View>
      )}

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Update Status</Text>
        <View style={styles.statusRow}>
          {STATUS_OPTIONS.map((s) => {
            const c = STATUS_CONFIG[s]!;
            const active = estimate.status === s;
            return (
              <Pressable
                key={s}
                style={[
                  styles.statusChip,
                  active
                    ? { backgroundColor: c.color, borderColor: c.color }
                    : { backgroundColor: colors.secondary, borderColor: colors.border },
                ]}
                onPress={() => handleStatusChange(s)}
              >
                <Text style={[styles.statusChipText, { color: active ? "#fff" : colors.mutedForeground }]}>
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
            <Text style={[styles.deleteBtnText, { color: colors.destructive }]}>Delete Estimate</Text>
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
  },
  serviceType: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  customerLink: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  priceBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  priceLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  priceValue: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: -4,
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
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 13,
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
