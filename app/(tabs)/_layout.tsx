import { Tabs } from "expo-router";
import { Platform, StyleSheet, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import { Colors } from "@/constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  withSpring,
  interpolate,
} from "react-native-reanimated";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const TAB_CONFIG = [
  { name: "index", label: "Home", icon: "home-outline", iconActive: "home" },
  { name: "live", label: "Live", icon: "radio-outline", iconActive: "radio" },
  { name: "drivers", label: "Drivers", icon: "people-outline", iconActive: "people" },
  { name: "standings", label: "Standings", icon: "trophy-outline", iconActive: "trophy" },
  { name: "learn", label: "Learn", icon: "school-outline", iconActive: "school" },
  { name: "news", label: "News", icon: "newspaper-outline", iconActive: "newspaper" },
  { name: "more", label: "Explore", icon: "grid-outline", iconActive: "grid" },
];

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";
  const bottomPadding = isWeb ? 12 : Math.max(insets.bottom - 8, 8);

  return (
    <View style={[styles.floatingWrapper, { paddingBottom: bottomPadding }]}>
      {isIOS ? (
        <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
          <View style={styles.blurOverlay} />
          <View style={styles.tabRow}>
            {state.routes.map((route, index) => {
              const isFocused = state.index === index;
              const config = TAB_CONFIG.find((t) => t.name === route.name);
              if (!config) return null;

              return (
                <TabItem
                  key={route.key}
                  config={config}
                  isFocused={isFocused}
                  onPress={() => {
                    const event = navigation.emit({
                      type: "tabPress",
                      target: route.key,
                      canPreventDefault: true,
                    });
                    if (!isFocused && !event.defaultPrevented) {
                      navigation.navigate(route.name);
                    }
                  }}
                />
              );
            })}
          </View>
        </BlurView>
      ) : (
        <View style={styles.solidContainer}>
          <View style={styles.tabRow}>
            {state.routes.map((route, index) => {
              const isFocused = state.index === index;
              const config = TAB_CONFIG.find((t) => t.name === route.name);
              if (!config) return null;

              return (
                <TabItem
                  key={route.key}
                  config={config}
                  isFocused={isFocused}
                  onPress={() => {
                    const event = navigation.emit({
                      type: "tabPress",
                      target: route.key,
                      canPreventDefault: true,
                    });
                    if (!isFocused && !event.defaultPrevented) {
                      navigation.navigate(route.name);
                    }
                  }}
                />
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

function TabItem({
  config,
  isFocused,
  onPress,
}: {
  config: (typeof TAB_CONFIG)[0];
  isFocused: boolean;
  onPress: () => void;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const scale = withSpring(isFocused ? 1 : 0, {
      damping: 15,
      stiffness: 200,
    });

    return {
      opacity: withSpring(isFocused ? 1 : 0, { damping: 15, stiffness: 200 }),
      transform: [
        { scale: interpolate(scale, [0, 1], [0.8, 1]) },
      ],
    };
  }, [isFocused]);

  const iconAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: withSpring(isFocused ? -2 : 0, {
            damping: 15,
            stiffness: 200,
          }),
        },
      ],
    };
  }, [isFocused]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.tabItem}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={config.label}
    >
      <View style={styles.tabItemInner}>
        <Animated.View style={[styles.activeIndicator, animatedStyle]} />
        <Animated.View style={iconAnimatedStyle}>
          <Ionicons
            name={isFocused ? (config.iconActive as any) : (config.icon as any)}
            size={22}
            color={isFocused ? Colors.red : "rgba(255,255,255,0.45)"}
          />
        </Animated.View>
        <Animated.Text
          style={[
            styles.tabLabel,
            {
              color: isFocused ? Colors.red : "rgba(255,255,255,0.45)",
              fontFamily: isFocused ? "Inter_600SemiBold" : "Inter_500Medium",
            },
          ]}
        >
          {config.label}
        </Animated.Text>
      </View>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="live" />
      <Tabs.Screen name="drivers" />
      <Tabs.Screen name="standings" />
      <Tabs.Screen name="learn" />
      <Tabs.Screen name="news" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  floatingWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 12,
  },
  blurContainer: {
    width: "100%",
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,15,15,0.65)",
  },
  solidContainer: {
    width: "100%",
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "rgba(20,20,20,0.95)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    ...Platform.select({
      android: {
        elevation: 20,
      },
      web: {
        boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)",
      },
      default: {},
    }),
  },
  tabRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabItemInner: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    paddingTop: 4,
  },
  activeIndicator: {
    position: "absolute",
    top: -2,
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.red,
  },
  tabLabel: {
    fontSize: 9,
    marginTop: 3,
    letterSpacing: 0.2,
  },
});
