export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface LearnTopicFull {
  id: number;
  title: string;
  icon: string;
  subtitle: string;
  content: string[];
  videoId: string;
  quiz: QuizQuestion[];
}

export const LEARN_TOPICS: LearnTopicFull[] = [
  {
    id: 1,
    title: "What is Formula 1?",
    icon: "trophy",
    subtitle: "The pinnacle of motorsport",
    content: [
      "Formula 1 (F1) is the highest class of international open-wheel single-seater formula racing sanctioned by the FIA (Fédération Internationale de l'Automobile). Founded in 1950, it has grown into one of the most popular and prestigious global sporting events.",
      "The sport features 10 teams (constructors), each fielding two drivers, competing across a calendar of approximately 24 Grand Prix races held on circuits worldwide. The season runs from March to December.",
      "F1 cars are among the most technologically advanced vehicles ever built. They feature hybrid power units producing over 1000 horsepower, advanced aerodynamics generating massive downforce, and cutting-edge materials like carbon fibre. Cars can reach speeds exceeding 350 km/h (220 mph).",
      "Two World Championships are contested simultaneously: the Drivers' Championship (awarded to the best individual driver) and the Constructors' Championship (awarded to the best team). Points accumulated across all races determine the champions.",
    ],
    videoId: "Z0fOoyiIq7M",
    quiz: [
      { question: "When was Formula 1 founded?", options: ["1946", "1950", "1955", "1960"], correctIndex: 1 },
      { question: "How many teams compete in a typical F1 season?", options: ["8", "10", "12", "14"], correctIndex: 1 },
      { question: "What governing body sanctions F1?", options: ["FIFA", "FIA", "IOC", "FIM"], correctIndex: 1 },
    ],
  },
  {
    id: 2,
    title: "Race Weekend Format",
    icon: "calendar",
    subtitle: "Three days of action",
    content: [
      "A standard Formula 1 race weekend spans three days, packed with on-track action. Each session serves a specific purpose in preparing teams and drivers for the main event: the Grand Prix.",
      "Friday is dedicated to Free Practice. Two sessions (FP1 and FP2), each lasting 60 minutes, allow teams to test car setups, evaluate tyre performance, and gather data. Rookie drivers must participate in at least one FP1 session per season.",
      "Saturday begins with a final 60-minute Free Practice session (FP3) in the morning, followed by the all-important Qualifying session in the afternoon. Qualifying determines the starting grid for Sunday's race through a three-part knockout format.",
      "Sunday is race day. The Grand Prix typically covers a distance of around 305 km (approximately 190 miles), lasting roughly 90 minutes to 2 hours. The race cannot exceed 2 hours of running time, plus any red flag stoppages.",
    ],
    videoId: "Z0fOoyiIq7M",
    quiz: [
      { question: "How many free practice sessions are there on a standard Friday?", options: ["1", "2", "3", "4"], correctIndex: 1 },
      { question: "What is the approximate race distance of a Grand Prix?", options: ["200 km", "250 km", "305 km", "400 km"], correctIndex: 2 },
      { question: "What happens on Saturday afternoon?", options: ["Free Practice", "Qualifying", "Sprint Race", "Warm-up"], correctIndex: 1 },
    ],
  },
  {
    id: 3,
    title: "Qualifying",
    icon: "stopwatch",
    subtitle: "The battle for pole position",
    content: [
      "Qualifying is the session that determines the starting order for the Grand Prix. It uses a three-part knockout format (Q1, Q2, Q3) where the slowest drivers are progressively eliminated.",
      "Q1 lasts 18 minutes with all 20 drivers on track. The five slowest drivers are eliminated and will start from positions 16-20. In Q2, the remaining 15 drivers have 15 minutes to set their times, with the bottom five starting from positions 11-15.",
      "Q3 is the final shootout for pole position. The top 10 drivers have 12 minutes to set their fastest laps. The driver with the quickest time earns pole position — the coveted first place on the starting grid.",
      "Teams must carefully manage tyre strategy during qualifying. In Q1 and Q2, most teams use medium or hard compound tyres to save their softs for Q3. The tyres used to set the fastest Q2 lap time must be used to start the race (for top-10 qualifiers).",
    ],
    videoId: "Z0fOoyiIq7M",
    quiz: [
      { question: "How many parts does qualifying have?", options: ["2", "3", "4", "5"], correctIndex: 1 },
      { question: "How many drivers are eliminated in Q1?", options: ["3", "4", "5", "6"], correctIndex: 2 },
      { question: "How long does Q3 last?", options: ["10 minutes", "12 minutes", "15 minutes", "18 minutes"], correctIndex: 1 },
    ],
  },
  {
    id: 4,
    title: "Sprint Races",
    icon: "flash",
    subtitle: "Saturday's short-form racing",
    content: [
      "Sprint races were introduced in 2021 as a way to add more competitive action to select race weekends. Typically 6 Sprint weekends are scheduled per season, replacing the traditional format at those events.",
      "On a Sprint weekend, the schedule changes significantly. Friday features FP1 followed by Qualifying (which sets the grid for Sunday's Grand Prix). Saturday has Sprint Qualifying (Sprint Shootout) followed by the Sprint Race itself.",
      "The Sprint Race covers approximately one-third of the Grand Prix distance (around 100 km) and lasts about 30 minutes. There are no mandatory pit stops, so drivers typically race flat-out from start to finish.",
      "Points are awarded to the top eight finishers: 8-7-6-5-4-3-2-1. While fewer points than a Grand Prix, Sprint results can significantly influence the championship standings over the course of a season.",
    ],
    videoId: "Z0fOoyiIq7M",
    quiz: [
      { question: "When were Sprint races first introduced?", options: ["2019", "2020", "2021", "2022"], correctIndex: 2 },
      { question: "Approximately how long is a Sprint Race?", options: ["15 minutes", "30 minutes", "45 minutes", "60 minutes"], correctIndex: 1 },
      { question: "How many points does the Sprint winner receive?", options: ["6", "8", "10", "12"], correctIndex: 1 },
    ],
  },
  {
    id: 5,
    title: "Points System",
    icon: "podium",
    subtitle: "How championships are decided",
    content: [
      "The Formula 1 points system determines the Drivers' and Constructors' World Champions. Points are awarded based on finishing positions in both Grand Prix races and Sprint races.",
      "In a Grand Prix, points are awarded to the top ten finishers: 1st place receives 25 points, 2nd gets 18, 3rd gets 15, then 12, 10, 8, 6, 4, 2, and 1 point for 10th place.",
      "An additional bonus point is awarded for setting the fastest lap of the race, but only if the driver finishes in the top ten. This rule adds a strategic element to the closing laps as drivers balance tyre management with the chance for an extra point.",
      "The Constructors' Championship is calculated by combining the points scored by both drivers from each team. This means consistency across both cars is crucial for teams chasing the constructors' title.",
    ],
    videoId: "Z0fOoyiIq7M",
    quiz: [
      { question: "How many points does the race winner receive?", options: ["20", "25", "30", "35"], correctIndex: 1 },
      { question: "What is the condition for earning the fastest lap point?", options: ["Set fastest lap", "Finish in top 10 and set fastest lap", "Lead a lap", "Finish on podium"], correctIndex: 1 },
      { question: "How many drivers score points in a Grand Prix?", options: ["8", "10", "12", "15"], correctIndex: 1 },
    ],
  },
  {
    id: 6,
    title: "Tyres & Compounds",
    icon: "ellipse",
    subtitle: "The only contact with the track",
    content: [
      "Tyres are arguably the most critical component in Formula 1. They are the only point of contact between the car and the track surface. Pirelli is the sole tyre supplier, providing multiple compounds for each race.",
      "There are three dry-weather slick compounds available: Soft (marked with red), Medium (yellow), and Hard (white). Softer tyres provide more grip and faster lap times but degrade quicker, while harder compounds last longer but offer less peak performance.",
      "For wet conditions, two additional tyre types are available: Intermediates (green markings) for damp tracks with some standing water, and Full Wets (blue markings) for heavy rain with significant standing water on the track.",
      "Strategy around tyre usage is a key element of race craft. Drivers must use at least two different dry compounds during a race. The timing of pit stops and choice of compounds can make the difference between winning and losing.",
    ],
    videoId: "Z0fOoyiIq7M",
    quiz: [
      { question: "What colour marks the Soft compound?", options: ["Yellow", "White", "Red", "Green"], correctIndex: 2 },
      { question: "Who is the sole F1 tyre supplier?", options: ["Bridgestone", "Michelin", "Pirelli", "Goodyear"], correctIndex: 2 },
      { question: "What are Intermediate tyres used for?", options: ["Dry track", "Damp track", "Heavy rain", "Snow"], correctIndex: 1 },
    ],
  },
  {
    id: 7,
    title: "DRS (Drag Reduction System)",
    icon: "speedometer",
    subtitle: "The overtaking aid",
    content: [
      "DRS stands for Drag Reduction System, an adjustable component on the rear wing designed to facilitate overtaking. When activated, a flap on the rear wing opens, reducing aerodynamic drag and increasing straight-line speed by approximately 10-15 km/h.",
      "DRS can only be used in designated DRS zones on the circuit. Most tracks have two or three DRS zones, typically on long straights where overtaking opportunities are highest.",
      "To activate DRS, a driver must be within one second of the car ahead at a specific detection point on the track. This ensures DRS assists genuine overtaking attempts rather than simply building gaps.",
      "DRS is disabled during the first two laps of the race and after restarts (Safety Car or red flag). It is also disabled when race control deems conditions unsafe, such as during rain. In qualifying, DRS is available freely without the one-second rule.",
    ],
    videoId: "Z0fOoyiIq7M",
    quiz: [
      { question: "What does DRS stand for?", options: ["Drive Reduction System", "Drag Reduction System", "Dynamic Racing System", "Direct Racing Speed"], correctIndex: 1 },
      { question: "How close must a driver be to use DRS?", options: ["0.5 seconds", "1 second", "1.5 seconds", "2 seconds"], correctIndex: 1 },
      { question: "When is DRS disabled?", options: ["First 2 laps", "Last 5 laps", "During pit stops", "At night"], correctIndex: 0 },
    ],
  },
  {
    id: 8,
    title: "Pit Stops",
    icon: "build",
    subtitle: "Precision under pressure",
    content: [
      "Pit stops are one of the most spectacular elements of Formula 1. A team of over 20 mechanics work in perfect synchronisation to change all four tyres, with the fastest stops taking under 2 seconds.",
      "Each tyre has a dedicated crew of three: one to operate the wheel gun, one to remove the old tyre, and one to fit the new one. Additional crew members operate the front and rear jacks and stabilise the car.",
      "Beyond tyre changes, pit stops can also involve front wing angle adjustments, cleaning debris from air intakes, or in rare cases, more significant repairs. The pit lane has a speed limit (typically 80 km/h) to ensure safety.",
      "Pit strategy is a crucial element of race management. Teams must decide when to stop, which tyres to fit, and how many stops to make. An 'undercut' (pitting before a rival) or 'overcut' (pitting after) can gain or lose track positions.",
    ],
    videoId: "Z0fOoyiIq7M",
    quiz: [
      { question: "How fast can the quickest pit stops be?", options: ["Under 2 seconds", "About 5 seconds", "About 8 seconds", "Over 10 seconds"], correctIndex: 0 },
      { question: "What is a typical pit lane speed limit?", options: ["60 km/h", "80 km/h", "100 km/h", "120 km/h"], correctIndex: 1 },
      { question: "What is an 'undercut'?", options: ["Pitting after a rival", "Pitting before a rival", "Not pitting at all", "Double pit stop"], correctIndex: 1 },
    ],
  },
  {
    id: 9,
    title: "Flags & Signals",
    icon: "flag",
    subtitle: "The language of the track",
    content: [
      "Flags are the primary visual communication tool between race officials and drivers. Each flag colour conveys a specific message and drivers must respond immediately and appropriately.",
      "The Green flag means the track is clear and racing can resume normally. The Yellow flag warns of a hazard ahead — a single yellow means slow down and no overtaking in that sector; double yellow means be prepared to stop. The Red flag stops the session entirely.",
      "The Blue flag is shown to a lapped car to indicate that a faster, unlapped car is approaching and they must let it pass within three flag displays. Ignoring blue flags results in penalties.",
      "The Black and White flag is a warning for unsportsmanlike behaviour. The Black flag means immediate disqualification. The Chequered flag signals the end of the session or race. The Yellow and Red striped flag warns of a slippery track surface (oil or debris).",
    ],
    videoId: "Z0fOoyiIq7M",
    quiz: [
      { question: "What does a Red flag mean?", options: ["Slippery track", "Slow down", "Session stopped", "Last lap"], correctIndex: 2 },
      { question: "When is a Blue flag shown?", options: ["Track is clear", "Danger ahead", "Lapped car must yield", "Pit lane open"], correctIndex: 2 },
      { question: "What does the Chequered flag indicate?", options: ["Halfway point", "Caution", "End of session/race", "DRS active"], correctIndex: 2 },
    ],
  },
  {
    id: 10,
    title: "Safety Car & VSC",
    icon: "car-sport",
    subtitle: "When safety comes first",
    content: [
      "The Safety Car is a high-performance Mercedes-AMG GT that leads the field at reduced speed when track conditions become too dangerous for racing at full speed, such as after a serious accident or when marshals need to work on track.",
      "When the Safety Car is deployed, all cars must line up behind it in race order. No overtaking is allowed, and the field bunches together, eliminating any gaps that leading drivers had built. This can dramatically change race outcomes.",
      "The Virtual Safety Car (VSC) is a less disruptive alternative. Instead of a physical car, drivers are required to reduce their speed to a target delta time set by race control. Cars maintain their relative positions without bunching up.",
      "Both Safety Car and VSC periods significantly impact race strategy. Teams may choose to pit during these periods since the time lost in the pit lane is less impactful when everyone is driving slowly. The restart after a Safety Car period often produces exciting racing.",
    ],
    videoId: "Z0fOoyiIq7M",
    quiz: [
      { question: "What car brand is the current F1 Safety Car?", options: ["BMW", "Aston Martin", "Mercedes-AMG", "Porsche"], correctIndex: 2 },
      { question: "Can you overtake under the Safety Car?", options: ["Yes", "No", "Only on straights", "Only lapped cars"], correctIndex: 1 },
      { question: "What is a VSC?", options: ["Very Slow Corner", "Virtual Safety Car", "Variable Speed Control", "Video Safety Check"], correctIndex: 1 },
    ],
  },
  {
    id: 11,
    title: "Pole Position",
    icon: "ribbon",
    subtitle: "First on the grid",
    content: [
      "Pole position is the most coveted spot on the starting grid — first place, on the inside of the first corner. The term originates from horse racing, where the horse drawn closest to the inside rail held the 'pole position'.",
      "Pole is earned by setting the fastest time in the final qualifying session (Q3). Starting from pole offers a significant strategic advantage: a clear track ahead, the racing line into the first corner, and clean air for optimal aerodynamic performance.",
      "Historically, starting from pole leads to a race win approximately 40% of the time, demonstrating its importance. However, many races have been won from further back on the grid, proving that qualifying pace alone doesn't guarantee victory.",
      "Some drivers have become qualifying legends. Lewis Hamilton holds the all-time record for most pole positions. Ayrton Senna was renowned for his qualifying brilliance, while in the modern era, Max Verstappen and Charles Leclerc are known for their exceptional one-lap speed.",
    ],
    videoId: "Z0fOoyiIq7M",
    quiz: [
      { question: "Where does the term 'pole position' originate?", options: ["Car racing", "Horse racing", "Cycling", "Sailing"], correctIndex: 1 },
      { question: "Who holds the record for most pole positions?", options: ["Michael Schumacher", "Ayrton Senna", "Lewis Hamilton", "Max Verstappen"], correctIndex: 2 },
      { question: "What percentage of races are won from pole (approximately)?", options: ["20%", "30%", "40%", "50%"], correctIndex: 2 },
    ],
  },
  {
    id: 12,
    title: "Grid Penalties",
    icon: "warning",
    subtitle: "When rules are broken",
    content: [
      "Grid penalties are sanctions that move a driver further back on the starting grid from their qualifying position. They serve as punishments for various rule infractions during a race weekend or across the season.",
      "The most common grid penalty relates to power unit components. Each driver is allocated a limited number of engines, turbochargers, MGU-H, MGU-K, energy stores, and control electronics per season. Exceeding these limits triggers automatic grid penalties.",
      "Other offences that incur grid penalties include causing a collision (investigated by stewards), impeding another driver during qualifying, failing scrutineering (technical non-compliance), or receiving accumulated penalty points.",
      "Penalties range from 3-place drops (minor infringements) to pit lane starts or back-of-grid penalties. If multiple penalties exceed the grid size, drivers start from the back. Teams sometimes strategically take engine penalties at circuits where overtaking is easier.",
    ],
    videoId: "Z0fOoyiIq7M",
    quiz: [
      { question: "What triggers an automatic grid penalty?", options: ["Speeding in pit lane", "Exceeding power unit allocations", "Causing a red flag", "Missing FP1"], correctIndex: 1 },
      { question: "What is the mildest grid penalty?", options: ["1-place", "3-place", "5-place", "10-place"], correctIndex: 1 },
      { question: "Teams strategically take penalties at circuits that are good for:", options: ["Qualifying", "Overtaking", "Tyre management", "Fuel saving"], correctIndex: 1 },
    ],
  },
  {
    id: 13,
    title: "Sectors & Lap Times",
    icon: "timer",
    subtitle: "Measuring speed in F1",
    content: [
      "Every F1 circuit is divided into three sectors for timing purposes. Sector times provide detailed analysis of where a driver is gaining or losing time compared to their own best, other drivers, or the overall fastest.",
      "Sector times are colour-coded on the timing screens: Purple indicates the overall fastest sector time set by anyone during the session. Green means the driver has improved on their personal best. Yellow indicates a slower sector than their personal best.",
      "A complete lap time is the sum of all three sector times. In qualifying, fractions of a second can separate the entire field. Drivers push to find time in every corner, braking zone, and acceleration point to piece together the perfect lap.",
      "The theoretical best lap time combines a driver's best individual sector times, even if they occurred on different laps. This shows the potential ultimate pace and helps teams understand where further improvement is possible.",
    ],
    videoId: "Z0fOoyiIq7M",
    quiz: [
      { question: "How many sectors is each circuit divided into?", options: ["2", "3", "4", "5"], correctIndex: 1 },
      { question: "What does a purple sector time mean?", options: ["Personal best", "Slowest", "Overall fastest", "Average"], correctIndex: 2 },
      { question: "What is a 'theoretical best' lap time?", options: ["Fastest actual lap", "Sum of best individual sectors", "Computer simulation", "Practice time"], correctIndex: 1 },
    ],
  },
  {
    id: 14,
    title: "Constructors vs Drivers",
    icon: "people",
    subtitle: "Two championships, one sport",
    content: [
      "Formula 1 uniquely features two concurrent World Championships: the Drivers' Championship (for individual drivers) and the Constructors' Championship (for teams). Both carry enormous prestige and significant financial implications.",
      "The Drivers' Championship is the more glamorous title, crowning the best individual driver. Points accumulated by each driver across all races determine the champion. The trophy has been won by legends including Schumacher (7), Hamilton (7), and Fangio (5).",
      "The Constructors' Championship is arguably more important for teams as it determines the distribution of prize money — worth hundreds of millions of dollars. Points from both of a team's drivers are combined, making reliability and consistency across both cars vital.",
      "Sometimes these championships create interesting tensions within teams. A team might prioritise the constructors' title by using team orders, asking one driver to support another. This can create dramatic on-track battles and intense rivalry between teammates.",
    ],
    videoId: "Z0fOoyiIq7M",
    quiz: [
      { question: "How many World Championships does F1 award each season?", options: ["1", "2", "3", "4"], correctIndex: 1 },
      { question: "Why is the Constructors' Championship financially important?", options: ["TV rights", "Prize money distribution", "Sponsorship only", "Ticket sales"], correctIndex: 1 },
      { question: "How many Drivers' Championships has Michael Schumacher won?", options: ["5", "6", "7", "8"], correctIndex: 2 },
    ],
  },
  {
    id: 15,
    title: "Aerodynamics",
    icon: "airplane",
    subtitle: "The invisible force",
    content: [
      "Aerodynamics is the single most important design aspect of a modern F1 car. The complex shapes of the bodywork, wings, and floor are designed to manage airflow to generate downforce — a force that pushes the car onto the track surface.",
      "An F1 car generates enough downforce that, in theory, it could drive upside down on a ceiling at speeds above 130 km/h. At racing speeds, the downforce can exceed three times the car's weight, allowing cornering speeds that would be physically impossible otherwise.",
      "The front wing is the first element to interact with the air and is crucial for directing airflow over and around the car. The rear wing provides significant downforce on straights. The floor and diffuser generate approximately 60% of the car's total downforce through the ground effect.",
      "Teams spend hundreds of millions on wind tunnel testing and Computational Fluid Dynamics (CFD) simulations to optimise aerodynamic performance. Regulations cap wind tunnel and CFD usage to control costs, with lower-ranked teams getting more testing time as a balancing mechanism.",
    ],
    videoId: "Z0fOoyiIq7M",
    quiz: [
      { question: "Where does an F1 car generate most of its downforce?", options: ["Front wing", "Rear wing", "Floor and diffuser", "Sidepods"], correctIndex: 2 },
      { question: "An F1 car could theoretically drive upside down above what speed?", options: ["100 km/h", "130 km/h", "160 km/h", "200 km/h"], correctIndex: 1 },
      { question: "What is CFD?", options: ["Carbon Fibre Design", "Computational Fluid Dynamics", "Central Force Distribution", "Cornering Force Data"], correctIndex: 1 },
    ],
  },
];
