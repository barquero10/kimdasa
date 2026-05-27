import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useGetJobs } from "@workspace/api-client-react";
import type { Job } from "@workspace/api-client-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  scheduled: { label: "Scheduled", color: "#3b82f6", icon: "calendar-outline" },
  in_progress: { label: "In Progress", color: "#f97316", icon: "play-circle-outline" },
  completed: { label: "Completed", color: "#22c55e", icon: "checkmark-circle-outline" },
  on_hold: { label: "On Hold", color: "#f59e0b", icon: "pause-circle-outline" },
  cancelled: { label: "Cancelled", color: "#ef4444", icon: "close-circle-outline" },
};

function JobRow({ job, onPress }: { job: Job; onPress: () => void }) {
  const colors = useColors();
  const cfg = STATUS_CONFIG[job.status] ?? { label: job.status, color: colors.mutedForeground, icon: "briefcase-outline" as const };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
      onPress={onPress}
    >
      <View style={[styles.iconWrap, { backgroundColor: cfg.color + "22" }]}>
        <Ionicons name={cfg.icon} size={20} color={cfg.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.jobTitle, { color: colors.foreground }]} numberOfLines={1}>
          {job.title}
        </Text>
        <View style={styles.meta}>
          {job.serviceType && (
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {job.serviceType}
            </Text>
          )}
          {job.startDate && (
            <>
              <Text style={[styles.metaDot, { color: colors.mutedForeground }]}>·</Text>
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {new Date(job.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </Text>
            </>
          )}
        </View>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <View style={[styles.statusPill, { backgroundColor: cfg.color + "22" }]}>
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

export default function JobsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const { data, isLoading, refetch, isRefetching } = useGetJobs();

  const FILTERS = ["all", "scheduled", "in_progress", "completed", "on_hold"];
  const FILTER_LABELS: Record<string, string> = {
    all: "All",
    scheduled: "Scheduled",
    in_progress: "In Progress",
    completed: "Completed",
    on_hold: "On Hold",
  };

  const filtered = (data ?? []).filter((j) => {
    const matchSearch =
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      (j.serviceType ?? "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || j.status === filter;
    return matchSearch && matchFilter;
  });

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.header,
          { paddingTop: topPadding + 8, borderBottomColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>Jobs</Text>
          <Pressable
            style={({ pressed }) => [
              styles.addBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => router.push("/jobs/new")}
            testID="add-job-btn"
          >
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>
        <View style={[styles.searchWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search jobs..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(f) => f}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const active = filter === item;
            const cfg = STATUS_CONFIG[item];
            return (
              <Pressable
                onPress={() => setFilter(item)}
                style={[
                  styles.filterChip,
                  active
                    ? { backgroundColor: cfg?.color ?? colors.primary, borderColor: cfg?.color ?? colors.primary }
                    : { backgroundColor: colors.secondary, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.filterText, { color: active ? "#fff" : colors.mutedForeground }]}>
                  {FILTER_LABELS[item] ?? item}
                </Text>
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ width: 6 }} />}
          contentContainerStyle={{ paddingRight: 16 }}
          scrollEnabled
        />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(j) => String(j.id)}
          renderItem={({ item }) => (
            <JobRow job={item} onPress={() => router.push(`/jobs/${item.id}`)} />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          onRefresh={refetch}
          refreshing={isRefetching}
          scrollEnabled={!!filtered.length}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No jobs</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {filter !== "all" ? "No jobs with this status" : "Create your first job"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  list: {
    padding: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  jobTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  metaDot: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
