import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BASE_URL =
  process.env.EXPO_PUBLIC_FEED_API_BASE_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "";

export default function FeedDebugScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [raw, setRaw] = useState<any>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      console.log("BASE_URL =", BASE_URL);

      const res = await fetch(`${BASE_URL}/api/feed`);
      console.log("STATUS =", res.status);

      const json = await res.json();
      console.log("JSON =", JSON.stringify(json, null, 2));

      setRaw(json);
    } catch (e: any) {
      console.log("FEED ERROR =", e);
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 120 }}
    >
      <Text style={styles.title}>FEED DEBUG</Text>
      <Text style={styles.line}>BASE_URL: {BASE_URL || "EMPTY"}</Text>
      <Text style={styles.line}>Loading: {loading ? "yes" : "no"}</Text>
      <Text style={styles.line}>Error: {error || "none"}</Text>
      <Text style={styles.line}>
        Raw type: {Array.isArray(raw) ? "array" : raw ? typeof raw : "null"}
      </Text>

      <TouchableOpacity style={styles.btn} onPress={load}>
        <Text style={styles.btnText}>Reload</Text>
      </TouchableOpacity>

      <Text style={styles.section}>RAW JSON</Text>
      <Text style={styles.json}>
        {raw ? JSON.stringify(raw, null, 2) : "No data yet"}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 16 },
  title: { color: "#fff", fontSize: 28, fontWeight: "700", marginBottom: 16 },
  line: { color: "#fff", fontSize: 14, marginBottom: 8 },
  section: { color: "#ff2b2b", fontSize: 18, fontWeight: "700", marginTop: 20, marginBottom: 10 },
  json: { color: "#ddd", fontSize: 12, lineHeight: 18 },
  btn: {
    backgroundColor: "#ff2b2b",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 12,
  },
  btnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});