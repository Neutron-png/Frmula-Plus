import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  StatusBar,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const CARD_PADDING = 32; // 16px each side
const GRID_GAP = 3;

interface MediaPhoto {
  url: string;
  previewUrl?: string | null;
  aspectRatio?: number | null;
}

interface Props {
  photos: MediaPhoto[];
}

export function ImageGrid({ photos }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!photos.length) return null;

  const cardWidth = SCREEN_W - CARD_PADDING;

  function renderSingle() {
    const photo = photos[0];
    const ratio = photo.aspectRatio ?? 16 / 9;
    const h = Math.min(cardWidth / ratio, 420);
    return (
      <TouchableOpacity activeOpacity={0.95} onPress={() => setLightboxIndex(0)}>
        <Image
          source={{ uri: photo.url }}
          placeholder={{ uri: photo.previewUrl ?? undefined }}
          style={[styles.singleImage, { height: h }]}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
      </TouchableOpacity>
    );
  }

  function renderTwo() {
    const h = (cardWidth - GRID_GAP) / 2 / (16 / 9);
    return (
      <View style={[styles.row, { gap: GRID_GAP }]}>
        {photos.slice(0, 2).map((p, i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={0.95}
            style={{ flex: 1 }}
            onPress={() => setLightboxIndex(i)}
          >
            <Image
              source={{ uri: p.url }}
              placeholder={{ uri: p.previewUrl ?? undefined }}
              style={{ width: "100%", height: h, borderRadius: 0 }}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  function renderThree() {
    const leftH = (cardWidth * 0.6 - GRID_GAP) / (4 / 3);
    const rightH = (leftH - GRID_GAP) / 2;
    return (
      <View style={[styles.row, { gap: GRID_GAP, height: leftH }]}>
        <TouchableOpacity
          activeOpacity={0.95}
          style={{ flex: 0.6, height: leftH }}
          onPress={() => setLightboxIndex(0)}
        >
          <Image
            source={{ uri: photos[0].url }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        </TouchableOpacity>
        <View style={{ flex: 0.4, gap: GRID_GAP }}>
          {photos.slice(1, 3).map((p, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.95}
              style={{ flex: 1 }}
              onPress={() => setLightboxIndex(i + 1)}
            >
              <Image
                source={{ uri: p.url }}
                style={{ width: "100%", height: rightH }}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  function renderFour() {
    const cellH = (cardWidth - GRID_GAP) / 2 / (16 / 9);
    return (
      <View style={{ gap: GRID_GAP }}>
        <View style={[styles.row, { gap: GRID_GAP }]}>
          {photos.slice(0, 2).map((p, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.95}
              style={{ flex: 1, height: cellH }}
              onPress={() => setLightboxIndex(i)}
            >
              <Image
                source={{ uri: p.url }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />
            </TouchableOpacity>
          ))}
        </View>
        <View style={[styles.row, { gap: GRID_GAP }]}>
          {photos.slice(2, 4).map((p, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.95}
              style={{ flex: 1, height: cellH }}
              onPress={() => setLightboxIndex(i + 2)}
            >
              <Image
                source={{ uri: p.url }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  function renderGrid() {
    switch (photos.length) {
      case 1: return renderSingle();
      case 2: return renderTwo();
      case 3: return renderThree();
      default: return renderFour();
    }
  }

  return (
    <>
      <View style={styles.gridContainer}>{renderGrid()}</View>

      {/* Lightbox */}
      <Modal
        visible={lightboxIndex !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setLightboxIndex(null)}
      >
        <StatusBar hidden />
        <TouchableWithoutFeedback onPress={() => setLightboxIndex(null)}>
          <View style={styles.lightboxBg}>
            <TouchableOpacity
              style={styles.lightboxClose}
              onPress={() => setLightboxIndex(null)}
            >
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: (lightboxIndex ?? 0) * SCREEN_W, y: 0 }}
            >
              {photos.map((p, i) => (
                <View key={i} style={styles.lightboxPage}>
                  <Image
                    source={{ uri: p.url }}
                    style={{ width: SCREEN_W, height: SCREEN_H * 0.8 }}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  gridContainer: { overflow: "hidden" },
  singleImage: { width: "100%" },
  row: { flexDirection: "row" },
  lightboxBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.97)",
    justifyContent: "center",
  },
  lightboxClose: {
    position: "absolute",
    top: 52,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 6,
  },
  lightboxPage: {
    width: SCREEN_W,
    justifyContent: "center",
    alignItems: "center",
  },
});
