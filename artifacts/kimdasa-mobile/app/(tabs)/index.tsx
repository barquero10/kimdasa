import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth";
import { useColors } from "@/hooks/useColors";
import {
  useGetCustomers,
  useGetEstimates,
  useGetJobs,
  useGetMe,
} from "@workspace/api-client-react";

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  const colors = useColors();
  return (
    <View style={[statCardStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[statCardStyles.iconWrap, { backgroundColor: color + "22" }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[statCardStyles.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[statCardStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const statCardStyles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    minWidth: 100,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  value: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

const JOB_STATUS_COLORS: Record<string, string> = {
  scheduled: "#3b82f6",
  in_progress: "#f97316",
  completed: "#22c55e",
  on_hold: "#f59e0b",
  cancelled: "#ef4444",
};

const JOB_STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  on_hold: "On Hold",
  cancelled: "Cancelled",
};

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();

  const { data: me } = useGetMe();
  const {
    data: jobs,
    isLoading: jobsLoading,
    refetch: refetchJobs,
    isRefetching: jobsRefetching,
  } = useGetJobs();
  const { data: customers } = useGetCustomers();
  const { data: estimates } = useGetEstimates();

  const activeJobs = jobs?.filter(
    (j) => j.status === "in_progress" || j.status === "scheduled"
  ) ?? [];
  const recentJobs = jobs?.slice(0, 5) ?? [];
  const pendingEstimates =
    estimates?.filter((e) => e.status === "draft" || e.status === "sent") ?? [];

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: topPadding + 16, paddingBottom: insets.bottom + 80 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={jobsRefetching}
          onRefresh={refetchJobs}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            Good day
          </Text>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {me?.name ?? "Field Team"}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            signOut();
            router.replace("/login");
          }}
          style={({ pressed }) => [
            styles.logoutBtn,
            { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          label="Active Jobs"
          value={activeJobs.length}
          icon="construct-outline"
          color={colors.primary}
        />
        <StatCard
          label="Customers"
          value={customers?.length ?? 0}
          icon="people-outline"
          color="#3b82f6"
        />
        <StatCard
          label="Pending Est."
          value={pendingEstimates.length}
          icon="document-text-outline"
          color="#8b5cf6"
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Recent Jobs
          </Text>
          <Pressable onPress={() => router.push("/(tabs)/jobs")}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
          </Pressable>
        </View>

        {jobsLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : recentJobs.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="briefcase-outline" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No jobs yet
            </Text>
          </View>
        ) : (
          recentJobs.map((job) => {
            const statusColor = JOB_STATUS_COLORS[job.status] ?? colors.mutedForeground;
            return (
              <Pressable
                key={job.id}
                style={({ pressed }) => [
                  styles.jobCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                onPress={() => router.push(`/jobs/${job.id}`)}
              >
                <View style={styles.jobCardLeft}>
                  <View
                    style={[
                      styles.jobStatusDot,
                      { backgroundColor: statusColor },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.jobTitle, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {job.title}
                    </Text>
                    {job.serviceType && (
                      <Text
                        style={[styles.jobSub, { color: colors.mutedForeground }]}
                        numberOfLines={1}
                      >
                        {job.serviceType}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusColor + "22" }]}>
                  <Text style={[styles.statusPillText, { color: statusColor }]}>
                    {JOB_STATUS_LABELS[job.status] ?? job.status}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </View>

      <View style={styles.quickActions}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 12 }]}>
          Quick Actions
        </Text>
        <View style={styles.quickRow}>
          <Pressable
            style={({ pressed }) => [
              styles.quickBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => router.push("/estimates/new")}
          >
            <Ionicons name="calculator-outline" size={20} color="#fff" />
            <Text style={styles.quickBtnText}>New Estimate</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.quickBtn,
              { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => router.push("/jobs/new")}
          >
            <Ionicons name="briefcase-outline" size={20} color={colors.foreground} />
            <Text style={[styles.quickBtnText, { color: colors.foreground }]}>New Job</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greeting: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  name: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  seeAll: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  jobCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "space-between",
  },
  jobCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  jobStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  jobTitle: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  jobSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginLeft: 8,
  },
  statusPillText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  quickActions: {
    gap: 0,
  },
  quickRow: {
    flexDirection: "row",
    gap: 10,
  },
  quickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 10,
  },
  quickBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
