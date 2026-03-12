import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";

type FeedCategory = "all" | "official" | "teams" | "drivers" | "media";

interface FeedMediaItem {
  type: string;
  url: string;
}

interface FeedItem {
  id: string;
  likes: number;
  comments: number;
  reposts: number;
  verified?: boolean;
  authorName: string;
  authorHandle: string;
  authorAvatar?: string;
  body: string;
  category: Exclude<FeedCategory, "all">;
  publishedAt: string;
  sourceUrl?: string;
  media?: FeedMediaItem[];
}

interface FeedResponse {
  items: FeedItem[];
  section?: {
    title?: string;
    subtitle?: string;
  };
}

const FEED_API_BASE_URL =
  process.env.EXPO_PUBLIC_FEED_API_BASE_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "";

async function fetchFeed(): Promise<FeedResponse> {
  if (!FEED_API_BASE_URL) {
    throw new Error("Missing FEED API base URL");
  }

  const res = await fetch(`${FEED_API_BASE_URL}/api/feed`);

  if (!res.ok) {
    throw new Error(`Feed API error: ${res.status}`);
  }

  const data: FeedResponse = await res.json();
  return data;
}

function formatTimeAgo(dateString: string): string {
  try {
    const published = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - published.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;

    return published.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function categoryLabel(category: FeedCategory): string {
  switch (category) {
    case "all":
      return "All";
    case "official":
      return "Official";
    case "teams":
      return "Teams";
    case "drivers":
      return "Drivers";
    case "media":
      return "Media";
    default:
      return "All";
  }
}

function getCategoryColor(category: FeedCategory): string {
  switch (category) {
    case "official":
      return Colors.red;
    case "teams":
      return "#FF8A80";
    case "drivers":
      return "#FFB3B3";
    case "media":
      return "#D9D9D9";
    default:
      return Colors.red;
  }
}

function FeedFilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.filterChip, active && styles.filterChipActive]}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function FeedCard({ item }: { item: FeedItem }) {
  const firstMedia = item.media?.[0]?.url;
  const hasMedia = !!firstMedia;
  const timeAgo = formatTimeAgo(item.publishedAt);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        {item.authorAvatar ? (
          <Image source={{ uri: item.authorAvatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Ionicons name="person" size={16} color={Colors.white} />
          </View>
        )}

        <View style={styles.cardHeaderText}>
          <View style={styles.cardHeaderTopRow}>
            <Text style={styles.authorName}>{item.authorName || "Unknown"}</Text>

            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: getCategoryColor(item.category) + "22" },
              ]}
            >
              <Text
                style={[
                  styles.categoryBadgeText,
                  { color: getCategoryColor(item.category) },
                ]}
              >
                {item.category}
              </Text>
            </View>
          </View>

          <Text style={styles.authorMeta}>
            @{item.authorHandle || "unknown"} · {timeAgo}
          </Text>
        </View>
      </View>

      <Text style={styles.contentText}>{item.body}</Text>

      {hasMedia ? (
        <Image source={{ uri: firstMedia }} style={styles.mediaImage} resizeMode="cover" />
      ) : null}

      <View style={styles.actionsRow}>
        <View style={styles.actionItem}>
          <Ionicons name="heart-outline" size={14} color={Colors.textTertiary} />
          <Text style={styles.actionText}>{item.likes ?? 0}</Text>
        </View>

        <View style={styles.actionItem}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={14}
            color={Colors.textTertiary}
          />
          <Text style={styles.actionText}>{item.comments ?? 0}</Text>
        </View>

        <View style={styles.actionItem}>
          <Ionicons name="repeat-outline" size={14} color={Colors.textTertiary} />
          <Text style={styles.actionText}>{item.reposts ?? 0}</Text>
        </View>
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const [activeFilter, setActiveFilter] = useState<FeedCategory>("all");

  const { data, isLoading, isError, refetch } = useQuery<FeedResponse>({
    queryKey: ["frmula-feed"],
    queryFn: fetchFeed,
    staleTime: 60 * 1000,
    retry: 1,
  });

  const feedItems = data?.items ?? [];
  const sectionTitle = data?.section?.title || "FEED";
  const sectionSubtitle =
    data?.section?.subtitle || "Paddock updates in a social timeline view";

  const filteredFeed = useMemo(() => {
    if (activeFilter === "all") return feedItems;
    return feedItems.filter((item) => item.category === activeFilter);
  }, [feedItems, activeFilter]);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        <View style={[styles.headerWrap, { paddingTop: topPadding + 12 }]}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.pageTitle}>{sectionTitle}</Text>
              <Text style={styles.subtitle}>{sectionSubtitle}</Text>
            </View>

            <TouchableOpacity style={styles.refreshButton} onPress={() => refetch()}>
              <Ionicons name="refresh" size={18} color={Colors.white} />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersRow}
          >
            {(["all", "official", "teams", "drivers", "media"] as FeedCategory[]).map(
              (filter) => (
                <FeedFilterChip
                  key={filter}
                  label={categoryLabel(filter)}
                  active={activeFilter === filter}
                  onPress={() => setActiveFilter(filter)}
                />
              )
            )}
          </ScrollView>
        </View>

        <View style={styles.content}>
          {isLoading && (
            <View style={styles.stateCard}>
              <ActivityIndicator color={Colors.red} size="large" />
              <Text style={styles.stateTitle}>Loading feed...</Text>
              <Text style={styles.stateText}>Fetching the latest paddock updates.</Text>
            </View>
          )}

          {!isLoading && isError && (
            <View style={styles.stateCard}>
              <Ionicons name="warning-outline" size={34} color={Colors.red} />
              <Text style={styles.stateTitle}>Feed unavailable</Text>
              <Text style={styles.stateText}>
                Couldn&apos;t load the latest updates right now.
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
                <Text style={styles.retryButtonText}>Try again</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isLoading && !isError && filteredFeed.length === 0 && (
            <View style={styles.stateCard}>
              <Ionicons name="newspaper-outline" size={34} color={Colors.textTertiary} />
              <Text style={styles.stateTitle}>No feed items</Text>
              <Text style={styles.stateText}>
                There are no posts in this category yet.
              </Text>
            </View>
          )}

          {!isLoading &&
            !isError &&
            filteredFeed.map((item) => <FeedCard key={item.id} item={item} />)}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  headerWrap: { paddingHorizontal: 16, marginBottom: 14 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pageTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.white,
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filtersRow: {
    gap: 10,
    paddingTop: 16,
    paddingRight: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.red,
    borderColor: Colors.red,
  },
  filterChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.white,
    fontFamily: "Inter_700Bold",
  },
  content: {
    paddingHorizontal: 16,
    gap: 12,
  },
  stateCard: {
    marginTop: 8,
    backgroundColor: Colors.card,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  stateTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: Colors.white,
  },
  stateText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  retryButton: {
    marginTop: 6,
    backgroundColor: Colors.red,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
  },
  retryButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: Colors.white,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#222",
  },
  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.red,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderText: {
    flex: 1,
  },
  cardHeaderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 2,
  },
  authorName: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: Colors.white,
  },
  authorMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  categoryBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    textTransform: "capitalize",
  },
  contentText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    color: Colors.white,
    marginBottom: 12,
  },
  mediaImage: {
    width: "100%",
    height: 210,
    borderRadius: 18,
    marginBottom: 14,
    backgroundColor: "#1a1a1a",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textTertiary,
  },
});