import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useGetMarketPrices } from "@workspace/api-client-react";
import type { MarketPrice } from "@workspace/api-client-react";

const REGION_LABELS: Record<string, string> = {
  new_jersey: "New Jersey",
  pennsylvania: "Pennsylvania",
};

const REGIONS = ["all", "new_jersey", "pennsylvania"] as const;
type RegionFilter = (typeof REGIONS)[number];

function fmt(val: string | null | undefined) {
  if (!val) return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function PriceCard({ price }: { price: MarketPrice }) {
  const colors = useColors();
  const updatedDate = new Date(price.updatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + "20" }]}>
          <Ionicons name="cube-outline" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.category, { color: colors.foreground }]} numberOfLines={2}>
            {price.category}
          </Text>
          <Text style={[styles.unit, { color: colors.mutedForeground }]}>{price.unit}</Text>
        </View>
        <View style={[styles.regionBadge, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
          <Text style={[styles.regionText, { color: colors.primary }]}>
            {REGION_LABELS[price.region] ?? price.region}
          </Text>
        </View>
      </View>

      <View style={[styles.priceRow, { borderTopColor: colors.border }]}>
        <View style={styles.priceCell}>
          <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Min</Text>
          <Text style={[styles.priceValue, { color: colors.foreground }]}>{fmt(price.minPrice)}</Text>
        </View>
        <View style={[styles.priceDivider, { backgroundColor: colors.border }]} />
        <View style={styles.priceCell}>
          <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Avg</Text>
          <Text style={[styles.priceValue, { color: "#f97316" }]}>{fmt(price.avgPrice)}</Text>
        </View>
        <View style={[styles.priceDivider, { backgroundColor: colors.border }]} />
        <View style={styles.priceCell}>
          <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Premium</Text>
          <Text style={[styles.priceValue, { color: colors.foreground }]}>{fmt(price.premiumPrice)}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        {price.source ? (
          <Text style={[styles.source, { color: colors.mutedForeground }]}>
            <Ionicons name="storefront-outline" size={11} color={colors.mutedForeground} /> {price.source}
          </Text>
        ) : null}
        <Text style={[styles.updated, { color: colors.mutedForeground }]}>Updated {updatedDate}</Text>
      </View>
    </View>
  );
}

export default function PricesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState<RegionFilter>("all");

  const { data: prices, isLoading, isError, refetch, isFetching } = useGetMarketPrices();

  const filtered = useMemo(() => {
    if (!prices) return [];
    return prices.filter((p) => {
      const matchRegion = region === "all" || p.region === region;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.category.toLowerCase().includes(q) ||
        (p.source ?? "").toLowerCase().includes(q) ||
        (p.unit ?? "").toLowerCase().includes(q);
      return matchRegion && matchSearch;
    });
  }, [prices, region, search]);

  const isWeb = Platform.OS === "web";
  const tabBarHeight = isWeb ? 84 : 49 + insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Material Prices</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>ABC Supply · Live pricing</Text>

        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search materials…"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        <View style={styles.filterRow}>
          {REGIONS.map((r) => {
            const active = region === r;
            const label = r === "all" ? "All Regions" : REGION_LABELS[r] ?? r;
            return (
              <Pressable
                key={r}
                onPress={() => setRegion(r)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.filterChipText, { color: active ? "#fff" : colors.mutedForeground }]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading prices…</Text>
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Could not load prices</Text>
          <Pressable onPress={() => refetch()} style={[styles.retryBtn, { borderColor: colors.primary }]}>
            <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <PriceCard price={item} />}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: tabBarHeight + 16 },
            filtered.length === 0 && styles.listEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="pricetag-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {search ? "No materials match your search" : "No price data available"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: -6,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    height: 42,
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  list: {
    padding: 16,
    gap: 12,
  },
  listEmpty: {
    flex: 1,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 0,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  category: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
  },
  unit: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  regionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    flexShrink: 0,
    marginLeft: 8,
  },
  regionText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  priceRow: {
    flexDirection: "row",
    borderTopWidth: 1,
  },
  priceCell: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    gap: 4,
  },
  priceDivider: {
    width: 1,
    marginVertical: 10,
  },
  priceLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  priceValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  source: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  updated: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  errorText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  retryBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: 4,
  },
  retryText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
