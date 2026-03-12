import { useQuery } from "@tanstack/react-query";
import { fetch } from "expo/fetch";
import { Driver, Team, DRIVERS, TEAMS, RACES_2026, Race } from "@/constants/f1Data";

const JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1";

const API_TO_LOCAL_TEAM: Record<string, string> = {
  mclaren: "mclaren",
  ferrari: "ferrari",
  mercedes: "mercedes",
  red_bull: "redbull",
  aston_martin: "astonmartin",
  williams: "williams",
  alpine: "alpine",
  haas: "haas",
  rb: "racingbulls",
  audi: "audi",
  cadillac: "cadillac",
};

interface JolpicaDriverStanding {
  position: string;
  positionText: string;
  points: string;
  wins: string;
  Driver: {
    driverId: string;
    permanentNumber: string;
    givenName: string;
    familyName: string;
    dateOfBirth: string;
    nationality: string;
  };
  Constructors: Array<{
    constructorId: string;
    name: string;
    nationality: string;
  }>;
}

interface JolpicaConstructorStanding {
  position: string;
  points: string;
  wins: string;
  Constructor: {
    constructorId: string;
    name: string;
    nationality: string;
  };
}

interface JolpicaRace {
  round: string;
  raceName: string;
  date: string;
  Circuit: {
    circuitId: string;
    circuitName: string;
    Location: {
      country: string;
      locality: string;
    };
  };
}

async function fetchJolpica<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${JOLPICA_BASE}${endpoint}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<T>;
}

export function useDriverStandings() {
  return useQuery<Driver[]>({
    queryKey: ["f1", "driverStandings"],
    queryFn: async () => {
      const data = await fetchJolpica<any>("/current/driverStandings.json");
      const standings: JolpicaDriverStanding[] =
        data.MRData.StandingsTable.StandingsLists[0]?.DriverStandings || [];

      return standings.map((s, idx) => {
        const apiId = s.Driver.driverId;
        const localDriver = DRIVERS.find((d) => d.id === apiId);
        const apiTeamId = s.Constructors[0]?.constructorId || "";
        const localTeamId = API_TO_LOCAL_TEAM[apiTeamId] || apiTeamId;

        if (localDriver) {
          return {
            ...localDriver,
            points: parseFloat(s.points),
            position: parseInt(s.position) || idx + 1,
            wins: parseInt(s.wins),
            teamId: localTeamId,
            number: parseInt(s.Driver.permanentNumber) || localDriver.number,
          };
        }

        return {
          id: apiId,
          number: parseInt(s.Driver.permanentNumber) || 0,
          name: `${s.Driver.givenName} ${s.Driver.familyName}`,
          firstName: s.Driver.givenName,
          lastName: s.Driver.familyName,
          shortName: s.Driver.familyName.substring(0, 3).toUpperCase(),
          teamId: localTeamId,
          nationality: s.Driver.nationality,
          flag: "",
          age: 0,
          podiums: 0,
          wins: parseInt(s.wins),
          poles: 0,
          championships: 0,
          points: parseFloat(s.points),
          position: parseInt(s.position) || idx + 1,
          fastestLaps: 0,
          grandsPrix: 0,
          bio: "",
          seasonPoints: [],
          photo: null,
        } as Driver;
      });
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}

export function useConstructorStandings() {
  return useQuery<Team[]>({
    queryKey: ["f1", "constructorStandings"],
    queryFn: async () => {
      const data = await fetchJolpica<any>("/current/constructorStandings.json");
      const standings: JolpicaConstructorStanding[] =
        data.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings || [];

      return standings.map((s, idx) => {
        const apiId = s.Constructor.constructorId;
        const localTeamId = API_TO_LOCAL_TEAM[apiId] || apiId;
        const localTeam = TEAMS.find((t) => t.id === localTeamId);

        if (localTeam) {
          return {
            ...localTeam,
            points: parseFloat(s.points),
            position: parseInt(s.position) || idx + 1,
            wins: parseInt(s.wins),
          };
        }

        return {
          id: localTeamId,
          name: s.Constructor.name,
          shortName: s.Constructor.name.substring(0, 3).toUpperCase(),
          color: "#555",
          secondColor: "#333",
          drivers: [],
          points: parseFloat(s.points),
          position: parseInt(s.position) || idx + 1,
          wins: parseInt(s.wins),
          podiums: 0,
          poles: 0,
          championships: 0,
          base: "",
          powerUnit: "",
          firstEntry: 0,
          bio: "",
        } as Team;
      });
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}

export function useRaceCalendar() {
  return useQuery<Race[]>({
    queryKey: ["f1", "raceCalendar"],
    queryFn: async () => {
      const data = await fetchJolpica<any>("/current.json");
      const races: JolpicaRace[] = data.MRData.RaceTable.Races || [];
      const now = new Date();

      return races.map((r) => {
        const raceDate = new Date(r.date);
        const localRace = RACES_2026.find((lr) => lr.round === parseInt(r.round));

        let status: "completed" | "live" | "upcoming" = "upcoming";
        if (raceDate < now) {
          const daysDiff = (now.getTime() - raceDate.getTime()) / (1000 * 60 * 60 * 24);
          status = daysDiff < 1 ? "live" : "completed";
        }

        const countryFlags: Record<string, string> = {
          Australia: "🇦🇺", China: "🇨🇳", Japan: "🇯🇵", Bahrain: "🇧🇭",
          "Saudi Arabia": "🇸🇦", USA: "🇺🇸", Canada: "🇨🇦", Monaco: "🇲🇨",
          Spain: "🇪🇸", Austria: "🇦🇹", UK: "🇬🇧", Belgium: "🇧🇪",
          Hungary: "🇭🇺", Netherlands: "🇳🇱", Italy: "🇮🇹", Azerbaijan: "🇦🇿",
          Singapore: "🇸🇬", Mexico: "🇲🇽", Brazil: "🇧🇷", Qatar: "🇶🇦",
          UAE: "🇦🇪",
        };

        return {
          id: `${r.Circuit.circuitId}-${r.round}`,
          round: parseInt(r.round),
          name: r.raceName,
          circuitId: r.Circuit.circuitId,
          country: r.Circuit.Location.country,
          flag: countryFlags[r.Circuit.Location.country] || "🏁",
          date: r.date,
          status,
          ...(localRace?.results ? { results: localRace.results } : {}),
          ...(localRace?.qualifyingResults ? { qualifyingResults: localRace.qualifyingResults } : {}),
          ...(localRace?.winner ? { winner: localRace.winner } : {}),
          ...(localRace?.winnerTime ? { winnerTime: localRace.winnerTime } : {}),
          ...(localRace?.fastestLap ? { fastestLap: localRace.fastestLap } : {}),
          ...(localRace?.fastestLapHolder ? { fastestLapHolder: localRace.fastestLapHolder } : {}),
        } as Race;
      });
    },
    staleTime: 60 * 60 * 1000,
  });
}

export function useCompletedRounds() {
  const { data: calendar } = useRaceCalendar();
  if (!calendar || calendar.length === 0) {
    const staticCompleted = RACES_2026.filter((r) => r.status === "completed").length;
    return { completed: staticCompleted, total: RACES_2026.length };
  }
  const completed = calendar.filter((r) => r.status === "completed").length;
  return { completed, total: calendar.length };
}
