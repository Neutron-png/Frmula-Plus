import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/colors";
import { LEARN_TOPICS, QuizQuestion } from "@/constants/learnF1Data";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type SectionTab = "video" | "read" | "quiz";

function VideoSection({ videoId, title }: { videoId: string; title: string }) {
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

  const openVideo = () => {
    Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`);
  };

  return (
    <View style={styles.sectionWrap}>
      <TouchableOpacity style={styles.videoCard} activeOpacity={0.9} onPress={openVideo}>
        <View style={styles.videoThumbnail}>
          <View style={styles.videoPlaceholder}>
            <Image
              source={{ uri: thumbnailUrl }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
            />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.6)"]}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.videoPlayOverlay}>
              <View style={styles.videoPlayBtn}>
                <Ionicons name="play" size={28} color="#fff" style={{ paddingLeft: 3 }} />
              </View>
            </View>
            <View style={styles.videoLabel}>
              <Ionicons name="logo-youtube" size={16} color="#FF0000" />
              <Text style={styles.videoLabelText}>Watch on YouTube</Text>
            </View>
          </View>
        </View>
        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle}>{title}</Text>
          <Text style={styles.videoSub}>Tap to watch the full video explanation</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

function ReadSection({ content }: { content: string[] }) {
  return (
    <View style={styles.sectionWrap}>
      {content.map((paragraph, idx) => (
        <View key={idx} style={styles.readBlock}>
          <View style={styles.readNumberWrap}>
            <Text style={styles.readNumber}>{idx + 1}</Text>
          </View>
          <Text style={styles.readText}>{paragraph}</Text>
        </View>
      ))}
    </View>
  );
}

function QuizSection({ quiz, topicTitle }: { quiz: QuizQuestion[]; topicTitle: string }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>([]);

  const q = quiz[currentQ];
  const isCorrect = selected === q?.correctIndex;
  const hasAnswered = selected !== null;

  const handleSelect = (idx: number) => {
    if (hasAnswered) return;
    setSelected(idx);
    const newAnswers = [...answers, idx];
    setAnswers(newAnswers);
    if (idx === q.correctIndex) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentQ < quiz.length - 1) {
      setCurrentQ(currentQ + 1);
      setSelected(null);
    } else {
      setFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrentQ(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
    setAnswers([]);
  };

  if (finished) {
    const pct = Math.round((score / quiz.length) * 100);
    const emoji = pct === 100 ? "🏆" : pct >= 66 ? "🏅" : pct >= 33 ? "💪" : "📚";
    return (
      <View style={styles.sectionWrap}>
        <View style={styles.quizResult}>
          <Text style={styles.quizResultEmoji}>{emoji}</Text>
          <Text style={styles.quizResultTitle}>Quiz Complete!</Text>
          <Text style={styles.quizResultScore}>{score}/{quiz.length}</Text>
          <Text style={styles.quizResultPct}>{pct}% correct</Text>
          <View style={styles.quizResultBar}>
            <LinearGradient
              colors={[Colors.red, "#FF4444"]}
              style={[styles.quizResultBarFill, { width: `${pct}%` }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
          <View style={styles.quizResultReview}>
            {quiz.map((question, idx) => {
              const userAnswer = answers[idx];
              const correct = userAnswer === question.correctIndex;
              return (
                <View key={idx} style={styles.reviewItem}>
                  <Ionicons
                    name={correct ? "checkmark-circle" : "close-circle"}
                    size={18}
                    color={correct ? "#22C55E" : "#EF4444"}
                  />
                  <Text style={styles.reviewText} numberOfLines={1}>{question.question}</Text>
                </View>
              );
            })}
          </View>
          <TouchableOpacity style={styles.quizRestartBtn} onPress={handleRestart}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.quizRestartText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.sectionWrap}>
      <View style={styles.quizProgress}>
        <Text style={styles.quizProgressText}>
          Question {currentQ + 1} of {quiz.length}
        </Text>
        <View style={styles.quizProgressBar}>
          {quiz.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.quizProgressDot,
                idx < currentQ && styles.quizProgressDotDone,
                idx === currentQ && styles.quizProgressDotActive,
              ]}
            />
          ))}
        </View>
      </View>
      <View style={styles.quizCard}>
        <Text style={styles.quizQuestion}>{q.question}</Text>
        <View style={styles.quizOptions}>
          {q.options.map((opt, idx) => {
            let optStyle = styles.quizOption;
            let textStyle = styles.quizOptionText;
            let icon = null;

            if (hasAnswered) {
              if (idx === q.correctIndex) {
                optStyle = { ...styles.quizOption, ...styles.quizOptionCorrect };
                textStyle = { ...styles.quizOptionText, ...styles.quizOptionTextCorrect };
                icon = <Ionicons name="checkmark-circle" size={20} color="#22C55E" />;
              } else if (idx === selected && !isCorrect) {
                optStyle = { ...styles.quizOption, ...styles.quizOptionWrong };
                textStyle = { ...styles.quizOptionText, ...styles.quizOptionTextWrong };
                icon = <Ionicons name="close-circle" size={20} color="#EF4444" />;
              }
            }

            return (
              <TouchableOpacity
                key={idx}
                style={[optStyle]}
                activeOpacity={hasAnswered ? 1 : 0.7}
                onPress={() => handleSelect(idx)}
              >
                <View style={styles.quizOptionLetter}>
                  <Text style={styles.quizOptionLetterText}>
                    {String.fromCharCode(65 + idx)}
                  </Text>
                </View>
                <Text style={[textStyle, { flex: 1 }]}>{opt}</Text>
                {icon}
              </TouchableOpacity>
            );
          })}
        </View>
        {hasAnswered && (
          <View style={styles.quizFeedback}>
            <Text style={[styles.quizFeedbackText, { color: isCorrect ? "#22C55E" : "#EF4444" }]}>
              {isCorrect ? "Correct!" : `Incorrect — the answer is ${q.options[q.correctIndex]}`}
            </Text>
            <TouchableOpacity style={styles.quizNextBtn} onPress={handleNext}>
              <Text style={styles.quizNextText}>
                {currentQ < quiz.length - 1 ? "Next Question" : "See Results"}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

export default function LearnTopicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const [activeSection, setActiveSection] = useState<SectionTab>("video");

  const topic = LEARN_TOPICS.find((t) => t.id === Number(id));
  if (!topic) {
    return (
      <View style={[styles.container, { paddingTop: topPadding + 20 }]}>
        <Text style={{ color: "#fff", textAlign: "center" }}>Topic not found</Text>
      </View>
    );
  }

  const sections: { key: SectionTab; label: string; icon: string }[] = [
    { key: "video", label: "VIDEO", icon: "play-circle" },
    { key: "read", label: "READ", icon: "document-text" },
    { key: "quiz", label: "QUIZ", icon: "help-circle" },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.headerIconWrap}>
              <LinearGradient
                colors={[Colors.red + "44", Colors.red + "11"]}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Ionicons name={topic.icon as any} size={18} color={Colors.red} />
            </View>
            <View>
              <Text style={styles.headerTitle} numberOfLines={1}>{topic.title}</Text>
              <Text style={styles.headerSubtitle}>{topic.subtitle}</Text>
            </View>
          </View>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.sectionTabs}>
          {sections.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.sectionTab, activeSection === s.key && styles.sectionTabActive]}
              onPress={() => setActiveSection(s.key)}
            >
              <Ionicons
                name={s.icon as any}
                size={14}
                color={activeSection === s.key ? Colors.red : Colors.textTertiary}
              />
              <Text
                style={[
                  styles.sectionTabText,
                  activeSection === s.key && styles.sectionTabTextActive,
                ]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: Platform.OS === "web" ? 34 : 100,
        }}
      >
        {activeSection === "video" && <VideoSection videoId={topic.videoId} title={topic.title} />}
        {activeSection === "read" && <ReadSection content={topic.content} />}
        {activeSection === "quiz" && <QuizSection quiz={topic.quiz} topicTitle={topic.title} />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.white,
  },
  headerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  sectionTabs: {
    flexDirection: "row",
    gap: 0,
  },
  sectionTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  sectionTabActive: {
    borderBottomColor: Colors.red,
  },
  sectionTabText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: Colors.textTertiary,
    letterSpacing: 1,
  },
  sectionTabTextActive: {
    color: Colors.white,
  },
  sectionWrap: {
    padding: 16,
    gap: 12,
  },
  videoCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  videoThumbnail: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  videoPlayOverlay: {
    alignItems: "center",
    justifyContent: "center",
  },
  videoPlayBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.red,
    alignItems: "center",
    justifyContent: "center",
  },
  videoLabel: {
    position: "absolute",
    bottom: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  videoLabelText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "#fff",
  },
  videoInfo: {
    padding: 14,
  },
  videoTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.white,
    marginBottom: 4,
  },
  videoSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  readBlock: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    gap: 12,
  },
  readNumberWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.red + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  readNumber: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: Colors.red,
  },
  readText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  quizProgress: {
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  quizProgressText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  quizProgressBar: {
    flexDirection: "row",
    gap: 6,
  },
  quizProgressDot: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  quizProgressDotDone: {
    backgroundColor: "#22C55E",
  },
  quizProgressDotActive: {
    backgroundColor: Colors.red,
  },
  quizCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quizQuestion: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: Colors.white,
    lineHeight: 24,
    marginBottom: 20,
  },
  quizOptions: {
    gap: 10,
  },
  quizOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  quizOptionCorrect: {
    borderColor: "#22C55E",
    backgroundColor: "#22C55E11",
  },
  quizOptionWrong: {
    borderColor: "#EF4444",
    backgroundColor: "#EF444411",
  },
  quizOptionLetter: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  quizOptionLetterText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  quizOptionText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.white,
  },
  quizOptionTextCorrect: {
    color: "#22C55E",
  },
  quizOptionTextWrong: {
    color: "#EF4444",
  },
  quizFeedback: {
    marginTop: 16,
    gap: 12,
  },
  quizFeedbackText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    textAlign: "center",
  },
  quizNextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.red,
    paddingVertical: 14,
    borderRadius: 12,
  },
  quizNextText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#fff",
  },
  quizResult: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    gap: 8,
  },
  quizResultEmoji: {
    fontSize: 48,
    marginBottom: 4,
  },
  quizResultTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.white,
  },
  quizResultScore: {
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    color: Colors.red,
  },
  quizResultPct: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  quizResultBar: {
    width: "100%",
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    marginTop: 8,
    overflow: "hidden",
  },
  quizResultBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  quizResultReview: {
    width: "100%",
    marginTop: 12,
    gap: 8,
  },
  reviewItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reviewText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  quizRestartBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.red,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  quizRestartText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: "#fff",
  },
});
