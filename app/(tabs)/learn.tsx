import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Colors } from "@/constants/colors";
import { LEARN_TOPICS } from "@/constants/learnF1Data";
import { useTranslation } from "@/i18n";

function TopicCard({ topic, index }: { topic: typeof LEARN_TOPICS[0]; index: number }) {
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: "/learn-topic/[id]", params: { id: topic.id } })}
    >
      <LinearGradient
        colors={[Colors.red + "0A", "transparent"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.cardTop}>
        <View style={styles.cardNumber}>
          <Text style={styles.cardNumberText}>{String(index + 1).padStart(2, "0")}</Text>
        </View>
        <View style={styles.iconWrap}>
          <LinearGradient
            colors={[Colors.red + "33", Colors.red + "11"]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Ionicons name={topic.icon as any} size={20} color={Colors.red} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{topic.title}</Text>
          <Text style={styles.cardSubtitle}>{topic.subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
      </View>
      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="play-circle" size={14} color={Colors.textTertiary} />
          <Text style={styles.metaText}>{t("learn.video")}</Text>
        </View>
        <View style={styles.metaDot} />
        <View style={styles.metaItem}>
          <Ionicons name="document-text" size={14} color={Colors.textTertiary} />
          <Text style={styles.metaText}>{topic.content.length} {t("learn.sections")}</Text>
        </View>
        <View style={styles.metaDot} />
        <View style={styles.metaItem}>
          <Ionicons name="help-circle" size={14} color={Colors.textTertiary} />
          <Text style={styles.metaText}>{topic.quiz.length} {t("learn.questions")}</Text>
        </View>
      </View>
      {topic.videoId && (
        <View style={styles.thumbnailWrap}>
          <Image
            source={{ uri: `https://img.youtube.com/vi/${topic.videoId}/mqdefault.jpg` }}
            style={styles.thumbnail}
            contentFit="cover"
          />
          <View style={styles.thumbnailOverlay}>
            <View style={styles.playBtn}>
              <Ionicons name="play" size={16} color="#fff" />
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function LearnScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <View style={styles.headerRow}>
          <Ionicons name="school" size={22} color={Colors.red} />
          <Text style={styles.screenTitle}>{t("learn.title")}</Text>
        </View>
        <Text style={styles.screenSubtitle}>
          {LEARN_TOPICS.length} {t("learn.topics_videos_quizzes")}
        </Text>
        <LinearGradient
          colors={[Colors.red, Colors.red + "00"]}
          style={styles.headerAccent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 100,
          gap: 12,
        }}
      >
        {LEARN_TOPICS.map((topic, idx) => (
          <TopicCard key={topic.id} topic={topic} index={idx} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  screenTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: Colors.white,
    letterSpacing: 2,
  },
  screenSubtitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: Colors.textSecondary,
    letterSpacing: 2,
    marginBottom: 2,
  },
  headerAccent: {
    height: 2,
    borderRadius: 1,
    marginTop: 12,
    width: 60,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
  },
  cardNumber: {
    width: 24,
    alignItems: "center",
  },
  cardNumberText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: Colors.textTertiary,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cardInfo: { flex: 1 },
  cardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.white,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 6,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.textTertiary,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.textTertiary,
  },
  thumbnailWrap: {
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 10,
    overflow: "hidden",
    height: 120,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.red,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 2,
  },
});
