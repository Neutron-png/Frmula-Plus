import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const FAVORITES_DRIVERS_KEY = "@frmula_favorites_drivers";
const FAVORITES_TEAMS_KEY = "@frmula_favorites_teams";
const RECENT_SEARCHES_KEY = "@frmula_recent_searches";

interface FavoritesContextValue {
  favoriteDrivers: string[];
  favoriteTeams: string[];
  recentSearches: string[];
  toggleFavoriteDriver: (driverId: string) => void;
  toggleFavoriteTeam: (teamId: string) => void;
  isFavoriteDriver: (driverId: string) => boolean;
  isFavoriteTeam: (teamId: string) => boolean;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteDrivers, setFavoriteDrivers] = useState<string[]>([]);
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [driversJson, teamsJson, searchesJson] = await Promise.all([
          AsyncStorage.getItem(FAVORITES_DRIVERS_KEY),
          AsyncStorage.getItem(FAVORITES_TEAMS_KEY),
          AsyncStorage.getItem(RECENT_SEARCHES_KEY),
        ]);
        if (driversJson) setFavoriteDrivers(JSON.parse(driversJson));
        if (teamsJson) setFavoriteTeams(JSON.parse(teamsJson));
        if (searchesJson) setRecentSearches(JSON.parse(searchesJson));
      } catch {}
    };
    load();
  }, []);

  const toggleFavoriteDriver = async (driverId: string) => {
    setFavoriteDrivers((prev) => {
      const next = prev.includes(driverId)
        ? prev.filter((id) => id !== driverId)
        : [...prev, driverId];
      AsyncStorage.setItem(FAVORITES_DRIVERS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const toggleFavoriteTeam = async (teamId: string) => {
    setFavoriteTeams((prev) => {
      const next = prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId];
      AsyncStorage.setItem(FAVORITES_TEAMS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const isFavoriteDriver = (driverId: string) => favoriteDrivers.includes(driverId);
  const isFavoriteTeam = (teamId: string) => favoriteTeams.includes(teamId);

  const addRecentSearch = async (query: string) => {
    if (!query.trim()) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s !== query);
      const next = [query, ...filtered].slice(0, 10);
      AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const clearRecentSearches = async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY).catch(() => {});
  };

  const value = useMemo(
    () => ({
      favoriteDrivers,
      favoriteTeams,
      recentSearches,
      toggleFavoriteDriver,
      toggleFavoriteTeam,
      isFavoriteDriver,
      isFavoriteTeam,
      addRecentSearch,
      clearRecentSearches,
    }),
    [favoriteDrivers, favoriteTeams, recentSearches]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
