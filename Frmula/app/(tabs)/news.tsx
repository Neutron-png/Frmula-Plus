import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
  ActivityIndicator,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";

interface F1NewsItem {
  title: string;
  link: string;
  description: string;
  category: string;
  pubDate: string;
  imageURL: string;
}

interface F1NewsResponse {
  F1News: F1NewsItem[];
}

const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY || "";

const FEED_ACCOUNTS = [
  { source: "F1.COM", handle: "@Formula1", accent: "#E10600" },
  { source: "SKY F1", handle: "@SkySportsF1", accent: "#FFFFFF" },
  { source: "AUTOSPORT", handle: "@autosport", accent: "#E10600" },
  { source: "MOTORSPORT", handle: "@Motorsport", accent: "#FFFFFF" },
  { source: "BBC SPORT", handle: "@BBCSport", accent: "#E10600" },
  { source: "PLANET F1", handle: "@Planet_F1", accent: "#FFFFFF" },
  { source: "GP FANS", handle: "@GPFansGlobal", accent: "#E10600" },
];

async function fetchF1News(): Promise<F1NewsItem[]> {
  const res = await fetch("https://f1-news1.p.rapidapi.com/f1news", {
    headers: {
      "x-rapidapi-key": RAPIDAPI_KEY,
      "x-rapidapi-host": "f1-news1.p.rapidapi.com",
    },
  });
  if (!res.ok) throw new Error(`News API error: ${res.status}`);
  const data: F1NewsResponse = await res.json();
  if (!data.F1News || !Array.isArray(data.F1News)) return [];
  const seen = new Set<string>();
  return data.F1News.filter((item) => {
    if (!item.title || seen.has(item.title)) return false;
    seen.add(item.title);
    return true;
  });
}

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function getSourceFromLink(link: string): string {
  try {
    const hostname = new URL(link).hostname.replace("www.", "");
    if (hostname.includes("f1reader")) return "F1 READER";
    if (hostname.includes("f1technical")) return "F1 TECHNICAL";
    if (hostname.includes("autosport")) return "AUTOSPORT";
    if (hostname.includes("motorsport")) return "MOTORSPORT";
    if (hostname.includes("bbc")) return "BBC SPORT";
    if (hostname.includes("skysports")) return "SKY F1";
    if (hostname.includes("espn")) return "ESPN";
    if (hostname.includes("gpfans")) return "GP FANS";
    if (hostname.includes("planetf1")) return "PLANET F1";
    if (hostname.includes("crash.net")) return "CRASH.NET";
    if (hostname.includes("formula1")) return "F1.COM";
    return hostname.split(".")[0].toUpperCase();
  } catch {
    return "F1 NEWS";
  }
}

function formatTimeAgo(pubDate: string): string {
  try {
    const published = new Date(pubDate);
    const now = new Date();
    const diffMs = now.getTime() - published.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;
    return published.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function getFeedMeta(link: string) {
  const source = getSourceFromLink(link);
  const preset = FEED_ACCOUNTS.find((account) => account.source === source);
  if (preset) return preset;
  return {
    source,
    handle: `@${source.toLowerCase().replace(/[^a-z0-9]+/g, "")}`,
    accent: Colors.red,
  };
}

function initials(label: string) {
  return label
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function FeedCard({ item, index }: { item: F1NewsItem; index: number }) {
  const meta = getFeedMeta(item.link);
  const timeAgo = formatTimeAgo(item.pubDate);
  const title = decodeHtmlEntities(item.title);
  const body = decodeHtmlEntities(item.description || "");
  const hasImage = item.imageURL && item.imageURL.startsWith("http");

  return (
    <TouchableOpacity
      style={styles.feedCard}
      activeOpacity={0.88}
      onPress={() => item.link?.startsWith("http") && Linking.openURL(item.link)}
    >
      <View style={styles.feedHeader}>
        <View style={[styles.avatar, { backgroundColor: meta.accent }]}>
          <Text style={styles.avatarText}>{initials(meta.source)}</Text>
        </View>
        <View style={styles.feedHeaderText}>
          <View style={styles.nameRow}>
            <Text style={styles.feedName}>{meta.source}</Text>
            <Ionicons name="checkmark-circle" size={14} color={Colors.red} />
            <Text style={styles.feedHandle}>{meta.handle}</Text>
            <Text style={styles.feedDot}>·</Text>
            <Text style={styles.feedHandle}>{timeAgo}</Text>
          </View>
          {!!item.category && <Text style={styles.feedMeta}>{item.category}</Text>}
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.feedBody}>
        <Text style={styles.feedTitle}>{title}</Text>
        {!!body && <Text style={styles.feedDescription}>{body}</Text>}

        {hasImage ? (
          <Image source={{ uri: item.imageURL }} style={styles.feedImage} resizeMode="cover" />
        ) : (
          <View style={styles.linkPreview}>
            <View style={styles.linkPreviewLine} />
            <Text style={styles.linkPreviewText}>Open full update</Text>
          </View>
        )}
      </View>

      <View style={styles.feedActions}>
        <View style={styles.actionItem}>
          <Ionicons name="chatbubble-outline" size={18} color={Colors.textSecondary} />
          <Text style={styles.actionText}>{12 + index}</Text>
        </View>
        <View style={styles.actionItem}>
          <Ionicons name="repeat-outline" size={18} color={Colors.textSecondary} />
          <Text style={styles.actionText}>{4 + (index % 6)}</Text>
        </View>
        <View style={styles.actionItem}>
          <Ionicons name="heart-outline" size={18} color={Colors.textSecondary} />
          <Text style={styles.actionText}>{41 + index * 3}</Text>
        </View>
        <Ionicons name="share-social-outline" size={18} color={Colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const { data: news, isLoading, isError, refetch } = useQuery<F1NewsItem[]>({
    queryKey: ["f1-feed-rapidapi"],
    queryFn: fetchF1News,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const hasNews = !!news?.length;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.headerWrap, { paddingTop: topPadding + 12 }]}> 
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.pageTitle}>FEED</Text>
              <Text style={styles.subtitle}>Paddock updates in a social timeline view</Text>
            </View>
            <TouchableOpacity style={styles.refreshButton} onPress={() => refetch()}>
              <Ionicons name="refresh" size={18} color={Colors.white} />
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {['All', 'Official', 'Teams', 'Drivers', 'Media'].map((filter, index) => (
              <View key={filter} style={[styles.filterChip, index === 0 && styles.filterChipActive]}>
                <Text style={[styles.filterChipText, index === 0 && styles.filterChipTextActive]}>{filter}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={Colors.red} size="large" />
            <Text style={styles.stateTitle}>Loading feed</Text>
            <Text style={styles.stateText}>Pulling the latest paddock updates…</Text>
          </View>
        ) : null}

        {!isLoading && isError ? (
          <View style={styles.stateCard}>
            <Ionicons name="warning-outline" size={34} color={Colors.red} />
            <Text style={styles.stateTitle}>Feed unavailable</Text>
            <Text style={styles.stateText}>Couldn’t load the latest updates right now.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!isLoading && !isError && hasNews ? (
          <View style={styles.feedList}>
            {news!.map((item, index) => (
              <FeedCard item={item} index={index} key={`${item.link}-${index}`} />
            ))}
          </View>
        ) : null}

        {!isLoading && !isError && !hasNews ? (
          <View style={styles.stateCard}>
            <Ionicons name="newspaper-outline" size={34} color={Colors.textSecondary} />
            <Text style={styles.stateTitle}>No feed items yet</Text>
            <Text style={styles.stateText}>Updates will show here as soon as content is available.</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  headerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pageTitle: {
    color: Colors.white,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.cardAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  filterRow: {
    gap: 10,
    paddingRight: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  feedList: {
    gap: 12,
    paddingHorizontal: 12,
  },
  feedCard: {
    backgroundColor: Colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
  },
  feedHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: Colors.white,
    fontWeight: "800",
    fontSize: 14,
  },
  feedHeaderText: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  feedName: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
  feedHandle: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  feedDot: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  feedMeta: {
    color: Colors.textTertiary,
    fontSize: 12,
  },
  moreButton: {
    padding: 4,
  },
  feedBody: {
    paddingLeft: 54,
    gap: 10,
  },
  feedTitle: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  feedDescription: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  feedImage: {
    width: "100%",
    height: 210,
    borderRadius: 18,
    backgroundColor: Colors.cardAlt,
  },
  linkPreview: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.cardAlt,
    padding: 18,
    gap: 12,
  },
  linkPreviewLine: {
    height: 2,
    width: 56,
    backgroundColor: Colors.red,
    borderRadius: 999,
  },
  linkPreviewText: {
    color: Colors.white,
    fontWeight: "600",
    fontSize: 14,
  },
  feedActions: {
    marginLeft: 54,
    paddingTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  stateCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 24,
    borderRadius: 22,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    gap: 10,
  },
  stateTitle: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: "700",
  },
  stateText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: Colors.red,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: 13,
  },
});
