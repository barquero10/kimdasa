import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import {
  useDeleteCustomer,
  useGetCustomer,
  useGetEstimates,
  useGetJobs,
} from "@workspace/api-client-react";

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const customerId = parseInt(id ?? "0");
  const { data: customer, isLoading } = useGetCustomer(customerId);
  const { data: allJobs } = useGetJobs();
  const { data: allEstimates } = useGetEstimates();
  const deleteCustomer = useDeleteCustomer();

  const jobs = (allJobs ?? []).filter((j) => j.customerId === customerId);
  const estimates = (allEstimates ?? []).filter((e) => e.customerId === customerId);

  const handleDelete = () => {
    Alert.alert("Delete Customer", "Are you sure you want to delete this customer?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteCustomer.mutateAsync({ id: customerId });
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          } catch {
            Alert.alert("Error", "Could not delete customer.");
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (isLoading || !customer) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const initials = customer.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + "22" }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
        </View>
        <Text style={[styles.name, { color: colors.foreground }]}>{customer.name}</Text>
        {customer.address && (
          <Text style={[styles.address, { color: colors.mutedForeground }]}>{customer.address}</Text>
        )}
        <View style={styles.contactRow}>
          {customer.phone && (
            <Pressable
              style={[styles.contactBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={() => Linking.openURL(`tel:${customer.phone}`)}
            >
              <Ionicons name="call-outline" size={16} color={colors.primary} />
              <Text style={[styles.contactBtnText, { color: colors.foreground }]}>{customer.phone}</Text>
            </Pressable>
          )}
          {customer.email && (
            <Pressable
              style={[styles.contactBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={() => Linking.openURL(`mailto:${customer.email}`)}
            >
              <Ionicons name="mail-outline" size={16} color={colors.primary} />
              <Text style={[styles.contactBtnText, { color: colors.foreground }]} numberOfLines={1}>
                {customer.email}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {customer.notes && (
        <View style={[styles.notesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Notes</Text>
          <Text style={[styles.notesText, { color: colors.foreground }]}>{customer.notes}</Text>
        </View>
      )}

      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{jobs.length}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Jobs</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{estimates.length}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Estimates</Text>
        </View>
      </View>

      {jobs.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Jobs</Text>
          {jobs.map((j) => (
            <Pressable
              key={j.id}
              style={({ pressed }) => [
                styles.linkedRow,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => router.push(`/jobs/${j.id}`)}
            >
              <Text style={[styles.linkedTitle, { color: colors.foreground }]}>{j.title}</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>
      )}

      {estimates.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Estimates</Text>
          {estimates.map((e) => (
            <Pressable
              key={e.id}
              style={({ pressed }) => [
                styles.linkedRow,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => router.push(`/estimates/${e.id}`)}
            >
              <Text style={[styles.linkedTitle, { color: colors.foreground }]}>{e.serviceType}</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.actionRow}>
        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: colors.primary, flex: 1, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={() => router.push(`/estimates/new?customerId=${customer.id}`)}
        >
          <Ionicons name="calculator-outline" size={18} color="#fff" />
          <Text style={styles.actionBtnText}>New Estimate</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: colors.destructive + "22", borderWidth: 1, borderColor: colors.destructive + "44", opacity: pressed ? 0.85 : 1, },
          ]}
          onPress={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={colors.destructive} />
          ) : (
            <Ionicons name="trash-outline" size={18} color={colors.destructive} />
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  hero: {
    alignItems: "center",
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  name: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  address: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  contactRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  contactBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  contactBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  notesCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  cardLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  linkedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  linkedTitle: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 10,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
