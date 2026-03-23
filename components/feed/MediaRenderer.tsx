import React, { useRef, useState, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Text,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { ImageGrid } from "./ImageGrid";
import { Colors } from "@/constants/colors";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_PADDING = 32;

export interface FeedMediaItem {
  type: "photo" | "video" | "gif";
  url: string;
  previewUrl?: string | null;
  aspectRatio?: number | null;
  width?: number | null;
  height?: number | null;
  contentType?: string;
}

interface Props {
  media: FeedMediaItem[];
  sourceUrl?: string | null;
}

export function MediaRenderer({ media, sourceUrl }: Props) {
  if (!media || media.length === 0) return null;

  const photos = media.filter((m) => m.type === "photo");
  const videoOrGif = media.find((m) => m.type === "video" || m.type === "gif");

  return (
    <View style={styles.container}>
      {photos.length > 0 && <ImageGrid photos={photos} />}
      {videoOrGif && (
        <VideoPlayer item={videoOrGif} sourceUrl={sourceUrl} />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────
// VideoPlayer
// Uses a WebView-based approach for maximum compatibility
// with Expo SDK 54, supporting both video and GIFs.
// ─────────────────────────────────────────────────────────
function VideoPlayer({
  item,
  sourceUrl,
}: {
  item: FeedMediaItem;
  sourceUrl?: string | null;
}) {
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const cardWidth = SCREEN_W - CARD_PADDING;
  const ratio = item.aspectRatio ?? 16 / 9;
  const height = Math.min(cardWidth / ratio, 400);
  const isGif = item.type === "gif";

  // For GIFs: use expo-image (handles animated WebP/GIF via contentFit)
  if (isGif) {
    return (
      <View style={[styles.mediaWrap, { height }]}>
        <Image
          source={{ uri: item.url }}
          placeholder={item.previewUrl ? { uri: item.previewUrl } : undefined}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          autoplay
          cachePolicy="memory-disk"
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setErrored(true); }}
        />
        {loading && !errored && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={Colors.red} />
          </View>
        )}
        {errored && <MediaError sourceUrl={sourceUrl} />}
        <View style={styles.gifBadge}>
          <Text style={styles.gifBadgeText}>GIF</Text>
        </View>
      </View>
    );
  }

  // For videos: show preview thumbnail + tap to open in browser
  // (expo-video requires native build; this works universally in Expo Go)
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.mediaWrap, { height }]}
      onPress={() => {
        const target = item.url || sourceUrl;
        if (target) Linking.openURL(target);
      }}
    >
      {item.previewUrl ? (
        <Image
          source={{ uri: item.previewUrl }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setErrored(true); }}
        />
      ) : (
        <View style={[styles.videoBg, { height }]} />
      )}
      {loading && !errored && !item.previewUrl && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={Colors.red} />
        </View>
      )}
      {errored && <MediaError sourceUrl={sourceUrl} />}
      {!errored && (
        <View style={styles.playOverlay}>
          <View style={styles.playButton}>
            <Ionicons name="play" size={30} color="#fff" />
          </View>
          <Text style={styles.tapToWatch}>Tap to watch</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function MediaError({ sourceUrl }: { sourceUrl?: string | null }) {
  return (
    <View style={styles.errorOverlay}>
      <Ionicons name="image-outline" size={28} color={Colors.textTertiary} />
      <Text style={styles.errorText}>Media unavailable</Text>
      {sourceUrl && (
        <TouchableOpacity onPress={() => Linking.openURL(sourceUrl)}>
          <Text style={styles.openLink}>Open on X</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 2 },
  mediaWrap: {
    width: "100%",
    backgroundColor: "#111",
    overflow: "hidden",
    position: "relative",
  },
  videoBg: { backgroundColor: "#1a1a1a" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111",
    gap: 8,
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textTertiary,
  },
  openLink: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.red,
    marginTop: 4,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  tapToWatch: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  gifBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  gifBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: "#fff",
    letterSpacing: 0.5,
  },
});
