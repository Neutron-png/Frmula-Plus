import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useTranslation } from "@/i18n";
import { FeedCard, type FeedItem } from "@/components/feed/FeedCard";
import { useFeed } from "@/hooks/useFeed";

type FeedCategory = "all" | "official" | "teams" | "drivers" | "media";
const CATEGORIES: FeedCategory[] = ["all", "official", "teams", "drivers", "media"];

function FilterChip({
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
      activeOpacity={0.8}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function LiveDot({ live }: { live: boolean }) {
  const opacity = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (!live) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [live]);

  return (
    <View style={styles.liveWrap}>
      <Animated.View
        style={[
          styles.liveDot,
          {
            backgroundColor: live ? "#10B981" : Colors.textTertiary,
            opacity: live ? opacity : 1,
          },
        ]}
      />
      <Text
        style={[
          styles.liveText,
          { color: live ? "#10B981" : Colors.textTertiary },
        ]}
      >
        {live ? "LIVE" : "OFFLINE"}
      </Text>
    </View>
  );
}

function NewPostsBanner({
  count,
  onPress,
}: {
  count: number;
  onPress: () => void;
}) {
  if (count === 0) return null;
  return (
    <TouchableOpacity style={styles.newBanner} onPress={onPress} activeOpacity={0.9}>
      <Ionicons name="arrow-up" size={14} color="#fff" />
      <Text style={styles.newBannerText}>
        {count} new post{count > 1 ? "s" : ""}
      </Text>
    </TouchableOpacity>
  );
}

function StateCard({
  icon,
  iconColor,
  title,
  body,
  onRetry,
  loading,
}: {
  icon: string;
  iconColor: string;
  title: string;
  body: string;
  onRetry?: () => void;
  loading?: boolean;
}) {
  return (
    <View style={styles.stateCard}>
      {loading ? (
        <ActivityIndicator color={Colors.red} size="large" />
      ) : (
        <Ionicons name={icon as any} size={36} color={iconColor} />
      )}
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const [activeCategory, setActiveCategory] = useState<FeedCategory>("all");

  const {
    items,
    isLoading,
    isError,
    errorMessage,
    isLive,
    newCount,
    clearNewCount,
    refetch,
  } = useFeed(activeCategory);

  const listRef = useRef<FlatList>(null);

  const handleNewBannerPress = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    clearNewCount();
  }, [clearNewCount]);

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => <FeedCard item={item} />,
    []
  );

  const keyExtractor = useCallback((item: FeedItem) => item.id, []);

  const catLabel = (cat: FeedCategory): string => {
    switch (cat) {
      case "all":      return t("news.cat_all");
      case "official": return t("news.cat_official");
      case "teams":    return t("news.cat_teams");
      case "drivers":  return t("news.cat_drivers");
      case "media":    return t("news.cat_media");
    }
  };

  const ListHeader = (
    <View style={[styles.headerWrap, { paddingTop: topPadding + 12 }]}>
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>FEED</Text>
          <Text style={styles.subtitle}>
            Paddock updates, driver posts, team drops, and race weekend content.
          </Text>
        </View>
        <View style={styles.headerActions}>
          <LiveDot live={isLive} />
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => {
              refetch();
              clearNewCount();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filtersRow}>
        {CATEGORIES.map((cat) => (
          <FilterChip
            key={cat}
            label={catLabel(cat)}
            active={activeCategory === cat}
            onPress={() => setActiveCategory(cat)}
          />
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <NewPostsBanner count={newCount} onPress={handleNewBannerPress} />

      {isLoading && items.length === 0 ? (
        <>
          {ListHeader}
          <StateCard
            icon="radio-outline"
            iconColor={Colors.red}
            title="Loading feed…"
            body="Fetching posts from Twitter/X accounts. First load may take ~60 seconds."
            loading
          />
        </>
      ) : isError && items.length === 0 ? (
        <>
          {ListHeader}
          <StateCard
            icon="warning-outline"
            iconColor={Colors.red}
            title="Couldn't load feed"
            body={errorMessage || "Check your internet connection and try again."}
            onRetry={refetch}
          />
        </>
      ) : (
        <FlatList
          ref={listRef}
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <StateCard
              icon="newspaper-outline"
              iconColor={Colors.textTertiary}
              title="No posts yet"
              body="The feed is warming up. Posts will appear shortly."
              onRetry={refetch}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={Platform.OS !== "web"}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={50}
          windowSize={10}
          initialNumToRender={6}
          onScrollBeginDrag={clearNewCount}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  listContent: { paddingHorizontal: 14, paddingBottom: 110 },

  headerWrap: { paddingHorizontal: 2, paddingBottom: 16 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  pageTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    color: Colors.white,
    letterSpacing: -0.8,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    maxWidth: 230,
  },
  headerActions: { alignItems: "flex-end", gap: 10, marginLeft: 12 },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },

  liveWrap: { flexDirection: "row", alignItems: "center", gap: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveText: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.8 },

  filtersRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.red, borderColor: Colors.red },
  chipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  chipTextActive: { color: Colors.white, fontFamily: "Inter_700Bold" },

  newBanner: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.red,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  newBannerText: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#fff" },

  stateCard: {
    marginHorizontal: 14,
    marginTop: 16,
    backgroundColor: Colors.card,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  stateTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: Colors.white,
    textAlign: "center",
  },
  stateBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 280,
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: Colors.red,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 999,
  },
  retryBtnText: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.white },
});
