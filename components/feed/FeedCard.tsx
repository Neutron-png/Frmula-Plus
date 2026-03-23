import React, { useState, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { MediaRenderer, type FeedMediaItem } from "./MediaRenderer";

export interface FeedItem {
  id: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string | null;
  body: string;
  category: "official" | "teams" | "drivers" | "media";
  publishedAt: string;
  likes: number;
  comments: number;
  reposts: number;
  views?: number;
  verified: boolean;
  sourceUrl: string | null;
  isRetweet?: boolean;
  isReply?: boolean;
  media: FeedMediaItem[];
  quotedTweet?: {
    id: string;
    authorName: string;
    authorHandle: string;
    authorAvatar: string | null;
    body: string;
    media: FeedMediaItem[];
  } | null;
}

function formatCount(n?: number): string {
  if (!n) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function timeAgo(iso: string): string {
  try {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "Just now";
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    if (s < 86400 * 7) return `${Math.floor(s / 86400)}d`;
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function categoryColor(cat: string): string {
  switch (cat) {
    case "official": return Colors.red;
    case "teams":    return "#3B82F6";
    case "drivers":  return "#10B981";
    default:         return "#6B7280";
  }
}

export const FeedCard = memo(function FeedCard({ item }: { item: FeedItem }) {
  const [liked, setLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(item.likes ?? 0);

  function handleLike() {
    setLiked((prev) => {
      setLocalLikes((n) => (prev ? n - 1 : n + 1));
      return !prev;
    });
  }

  function openSource() {
    if (item.sourceUrl) Linking.openURL(item.sourceUrl);
  }

  const catColor = categoryColor(item.category);

  return (
    <View style={styles.card}>
      {item.isRetweet && (
        <View style={styles.retweetRow}>
          <Ionicons name="repeat" size={13} color={Colors.textTertiary} />
          <Text style={styles.retweetText}>Reposted</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.85} onPress={openSource}>
          {item.authorAvatar ? (
            <Image
              source={{ uri: item.authorAvatar }}
              style={styles.avatar}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={150}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={18} color={Colors.white} />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.authorBlock}>
          <View style={styles.authorRow}>
            <Text style={styles.authorName} numberOfLines={1}>
              {item.authorName}
            </Text>
            {item.verified && (
              <Ionicons
                name="checkmark-circle"
                size={14}
                color="#1D9BF0"
                style={{ marginLeft: 3 }}
              />
            )}
          </View>
          <Text style={styles.authorMeta}>
            @{item.authorHandle} · {timeAgo(item.publishedAt)}
          </Text>
        </View>

        <View
          style={[
            styles.badge,
            {
              backgroundColor: catColor + "22",
              borderColor: catColor + "44",
            },
          ]}
        >
          <Text style={[styles.badgeText, { color: catColor }]}>
            {item.category}
          </Text>
        </View>
      </View>

      {/* Body */}
      {item.body.trim().length > 0 && (
        <Text style={styles.body}>{item.body}</Text>
      )}

      {/* Media */}
      {item.media && item.media.length > 0 && (
        <MediaRenderer media={item.media} sourceUrl={item.sourceUrl} />
      )}

      {/* Quoted tweet */}
      {item.quotedTweet && <QuotedTweet qt={item.quotedTweet} />}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.action}
          onPress={handleLike}
          activeOpacity={0.7}
        >
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={15}
            color={liked ? "#F91880" : Colors.textTertiary}
          />
          <Text style={[styles.actionText, liked && { color: "#F91880" }]}>
            {formatCount(localLikes)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.action}
          onPress={openSource}
          activeOpacity={0.7}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={15}
            color={Colors.textTertiary}
          />
          <Text style={styles.actionText}>{formatCount(item.comments)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.action}
          onPress={openSource}
          activeOpacity={0.7}
        >
          <Ionicons
            name="repeat-outline"
            size={15}
            color={Colors.textTertiary}
          />
          <Text style={styles.actionText}>{formatCount(item.reposts)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.action, { marginLeft: "auto" }]}
          onPress={openSource}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-redo-outline"
            size={15}
            color={Colors.textTertiary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
});

function QuotedTweet({
  qt,
}: {
  qt: NonNullable<FeedItem["quotedTweet"]>;
}) {
  return (
    <View style={styles.quotedCard}>
      <View style={styles.quotedHeader}>
        {qt.authorAvatar ? (
          <Image
            source={{ uri: qt.authorAvatar }}
            style={styles.quotedAvatar}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.quotedAvatar, styles.quotedAvatarFallback]}>
            <Ionicons name="person" size={10} color={Colors.white} />
          </View>
        )}
        <Text style={styles.quotedAuthor}>{qt.authorName}</Text>
        <Text style={styles.quotedHandle}> @{qt.authorHandle}</Text>
      </View>
      {qt.body ? (
        <Text style={styles.quotedBody} numberOfLines={3}>
          {qt.body}
        </Text>
      ) : null}
      {qt.media?.length > 0 && (
        <MediaRenderer media={qt.media.slice(0, 1)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  retweetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 2,
  },
  retweetText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textTertiary,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 16,
    paddingBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.border,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.red,
    alignItems: "center",
    justifyContent: "center",
  },
  authorBlock: { flex: 1, minWidth: 0 },
  authorRow: { flexDirection: "row", alignItems: "center" },
  authorName: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.white,
    flexShrink: 1,
  },
  authorMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  badgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    textTransform: "capitalize",
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    color: Colors.white,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  actionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textTertiary,
  },
  quotedCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    overflow: "hidden",
    padding: 12,
    backgroundColor: Colors.surface,
  },
  quotedHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  quotedAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.border,
    marginRight: 6,
  },
  quotedAvatarFallback: {
    backgroundColor: Colors.red,
    alignItems: "center",
    justifyContent: "center",
  },
  quotedAuthor: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: Colors.white,
  },
  quotedHandle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  quotedBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
});
