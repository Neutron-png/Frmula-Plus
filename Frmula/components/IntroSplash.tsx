import React, { useEffect, useState } from "react";
import { View, Image, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const ICON = require("@/assets/images/frmula-icon.png");
const LOGO_FULL = require("@/assets/images/frmula-logo-full.png");

interface IntroSplashProps {
  onComplete: () => void;
}

export function IntroSplash({ onComplete }: IntroSplashProps) {
  const iconScale = useSharedValue(0.3);
  const iconOpacity = useSharedValue(0);
  const iconTranslateY = useSharedValue(20);

  const logoOpacity = useSharedValue(0);
  const logoTranslateX = useSharedValue(-30);

  const lineWidth = useSharedValue(0);

  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    iconOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    iconScale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.2)) });
    iconTranslateY.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) });

    lineWidth.value = withDelay(400, withTiming(SCREEN_WIDTH * 0.4, { duration: 500, easing: Easing.inOut(Easing.cubic) }));

    logoOpacity.value = withDelay(600, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));
    logoTranslateX.value = withDelay(600, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));

    containerOpacity.value = withDelay(1800, withTiming(0, { duration: 400, easing: Easing.in(Easing.cubic) }, (finished) => {
      if (finished) {
        runOnJS(onComplete)();
      }
    }));

    const fallbackTimer = setTimeout(() => {
      onComplete();
    }, 2500);
    return () => clearTimeout(fallbackTimer);
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [
      { scale: iconScale.value },
      { translateY: iconTranslateY.value },
    ],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateX: logoTranslateX.value }],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    width: lineWidth.value,
    opacity: lineWidth.value > 0 ? 0.3 : 0,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <View style={styles.content}>
        <Animated.View style={iconStyle}>
          <Image source={ICON} style={styles.icon} resizeMode="contain" />
        </Animated.View>
        <Animated.View style={[styles.line, lineStyle]} />
        <Animated.View style={logoStyle}>
          <Image source={LOGO_FULL} style={styles.logo} resizeMode="contain" />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0A0A0A",
    zIndex: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    gap: 20,
  },
  icon: {
    width: 100,
    height: 100,
    borderRadius: 20,
  },
  line: {
    height: 1,
    backgroundColor: "#E10600",
  },
  logo: {
    width: 200,
    height: 50,
  },
});
