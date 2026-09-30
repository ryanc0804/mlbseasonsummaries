export interface MLBTeam {
  id: number;         // MLB Stats API team ID
  abbreviation: string;
  name: string;
  city: string;
  league: "AL" | "NL";
  division: "East" | "Central" | "West";
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
}

export const MLB_TEAMS: MLBTeam[] = [
  // AL East
  { id: 110, abbreviation: "BAL", name: "Orioles",     city: "Baltimore",  league: "AL", division: "East",    primaryColor: "#DF4601", secondaryColor: "#000000", logoUrl: "https://www.mlbstatic.com/team-logos/110.svg" },
  { id: 111, abbreviation: "BOS", name: "Red Sox",     city: "Boston",     league: "AL", division: "East",    primaryColor: "#BD3039", secondaryColor: "#0C2340", logoUrl: "https://www.mlbstatic.com/team-logos/111.svg" },
  { id: 147, abbreviation: "NYY", name: "Yankees",     city: "New York",   league: "AL", division: "East",    primaryColor: "#003087", secondaryColor: "#E4002C", logoUrl: "https://www.mlbstatic.com/team-logos/147.svg" },
  { id: 139, abbreviation: "TB",  name: "Rays",        city: "Tampa Bay",  league: "AL", division: "East",    primaryColor: "#092C5C", secondaryColor: "#8FBCE6", logoUrl: "https://www.mlbstatic.com/team-logos/139.svg" },
  { id: 141, abbreviation: "TOR", name: "Blue Jays",   city: "Toronto",    league: "AL", division: "East",    primaryColor: "#134A8E", secondaryColor: "#1D2D5C", logoUrl: "https://www.mlbstatic.com/team-logos/141.svg" },
  // AL Central
  { id: 145, abbreviation: "CWS", name: "White Sox",   city: "Chicago",    league: "AL", division: "Central", primaryColor: "#27251F", secondaryColor: "#C4CED4", logoUrl: "https://www.mlbstatic.com/team-logos/145.svg" },
  { id: 114, abbreviation: "CLE", name: "Guardians",   city: "Cleveland",  league: "AL", division: "Central", primaryColor: "#00385D", secondaryColor: "#E50022", logoUrl: "https://www.mlbstatic.com/team-logos/114.svg" },
  { id: 116, abbreviation: "DET", name: "Tigers",      city: "Detroit",    league: "AL", division: "Central", primaryColor: "#0C2340", secondaryColor: "#FA4616", logoUrl: "https://www.mlbstatic.com/team-logos/116.svg" },
  { id: 118, abbreviation: "KC",  name: "Royals",      city: "Kansas City",league: "AL", division: "Central", primaryColor: "#174885", secondaryColor: "#7BB2DD", logoUrl: "https://www.mlbstatic.com/team-logos/118.svg" },
  { id: 142, abbreviation: "MIN", name: "Twins",       city: "Minnesota",  league: "AL", division: "Central", primaryColor: "#002B5C", secondaryColor: "#D31145", logoUrl: "https://www.mlbstatic.com/team-logos/142.svg" },
  // AL West
  { id: 117, abbreviation: "HOU", name: "Astros",      city: "Houston",    league: "AL", division: "West",    primaryColor: "#002D62", secondaryColor: "#EB6E1F", logoUrl: "https://www.mlbstatic.com/team-logos/117.svg" },
  { id: 108, abbreviation: "LAA", name: "Angels",      city: "Los Angeles",league: "AL", division: "West",    primaryColor: "#BA0021", secondaryColor: "#003263", logoUrl: "https://www.mlbstatic.com/team-logos/108.svg" },
  { id: 133, abbreviation: "OAK", name: "Athletics",   city: "Oakland",    league: "AL", division: "West",    primaryColor: "#003831", secondaryColor: "#EFB21E", logoUrl: "https://www.mlbstatic.com/team-logos/133.svg" },
  { id: 136, abbreviation: "SEA", name: "Mariners",    city: "Seattle",    league: "AL", division: "West",    primaryColor: "#0C2C56", secondaryColor: "#005C5C", logoUrl: "https://www.mlbstatic.com/team-logos/136.svg" },
  { id: 140, abbreviation: "TEX", name: "Rangers",     city: "Texas",      league: "AL", division: "West",    primaryColor: "#003278", secondaryColor: "#C0111F", logoUrl: "https://www.mlbstatic.com/team-logos/140.svg" },
  // NL East
  { id: 144, abbreviation: "ATL", name: "Braves",      city: "Atlanta",    league: "NL", division: "East",    primaryColor: "#CE1141", secondaryColor: "#13274F", logoUrl: "https://www.mlbstatic.com/team-logos/144.svg" },
  { id: 146, abbreviation: "MIA", name: "Marlins",     city: "Miami",      league: "NL", division: "East",    primaryColor: "#00A3E0", secondaryColor: "#EF3340", logoUrl: "https://www.mlbstatic.com/team-logos/146.svg" },
  { id: 121, abbreviation: "NYM", name: "Mets",        city: "New York",   league: "NL", division: "East",    primaryColor: "#002D72", secondaryColor: "#FF5910", logoUrl: "https://www.mlbstatic.com/team-logos/121.svg" },
  { id: 143, abbreviation: "PHI", name: "Phillies",    city: "Philadelphia",league: "NL", division: "East",   primaryColor: "#E81828", secondaryColor: "#002D72", logoUrl: "https://www.mlbstatic.com/team-logos/143.svg" },
  { id: 120, abbreviation: "WSH", name: "Nationals",   city: "Washington", league: "NL", division: "East",    primaryColor: "#AB0003", secondaryColor: "#14225A", logoUrl: "https://www.mlbstatic.com/team-logos/120.svg" },
  // NL Central
  { id: 112, abbreviation: "CHC", name: "Cubs",        city: "Chicago",    league: "NL", division: "Central", primaryColor: "#0E3386", secondaryColor: "#CC3433", logoUrl: "https://www.mlbstatic.com/team-logos/112.svg" },
  { id: 113, abbreviation: "CIN", name: "Reds",        city: "Cincinnati", league: "NL", division: "Central", primaryColor: "#C6011F", secondaryColor: "#000000", logoUrl: "https://www.mlbstatic.com/team-logos/113.svg" },
  { id: 158, abbreviation: "MIL", name: "Brewers",     city: "Milwaukee",  league: "NL", division: "Central", primaryColor: "#12284B", secondaryColor: "#FFC52F", logoUrl: "https://www.mlbstatic.com/team-logos/158.svg" },
  { id: 134, abbreviation: "PIT", name: "Pirates",     city: "Pittsburgh", league: "NL", division: "Central", primaryColor: "#27251F", secondaryColor: "#FDB827", logoUrl: "https://www.mlbstatic.com/team-logos/134.svg" },
  { id: 138, abbreviation: "STL", name: "Cardinals",   city: "St. Louis",  league: "NL", division: "Central", primaryColor: "#C41E3A", secondaryColor: "#FEDB00", logoUrl: "https://www.mlbstatic.com/team-logos/138.svg" },
  // NL West
  { id: 109, abbreviation: "ARI", name: "Diamondbacks",city: "Arizona",    league: "NL", division: "West",    primaryColor: "#A71930", secondaryColor: "#E3D4AD", logoUrl: "https://www.mlbstatic.com/team-logos/109.svg" },
  { id: 115, abbreviation: "COL", name: "Rockies",     city: "Colorado",   league: "NL", division: "West",    primaryColor: "#33006F", secondaryColor: "#C4CED4", logoUrl: "https://www.mlbstatic.com/team-logos/115.svg" },
  { id: 119, abbreviation: "LAD", name: "Dodgers",     city: "Los Angeles",league: "NL", division: "West",    primaryColor: "#005A9C", secondaryColor: "#EF3E42", logoUrl: "https://www.mlbstatic.com/team-logos/119.svg" },
  { id: 135, abbreviation: "SD",  name: "Padres",      city: "San Diego",  league: "NL", division: "West",    primaryColor: "#2F241D", secondaryColor: "#FFC425", logoUrl: "https://www.mlbstatic.com/team-logos/135.svg" },
  { id: 137, abbreviation: "SF",  name: "Giants",      city: "San Francisco",league: "NL", division: "West",  primaryColor: "#FD5A1E", secondaryColor: "#27251F", logoUrl: "https://www.mlbstatic.com/team-logos/137.svg" },
];

export const TEAM_BY_ID = Object.fromEntries(MLB_TEAMS.map((t) => [t.id, t]));
export const TEAM_BY_ABBR = Object.fromEntries(MLB_TEAMS.map((t) => [t.abbreviation, t]));

export const DIVISIONS = {
  AL: { East: [] as MLBTeam[], Central: [] as MLBTeam[], West: [] as MLBTeam[] },
  NL: { East: [] as MLBTeam[], Central: [] as MLBTeam[], West: [] as MLBTeam[] },
};
for (const team of MLB_TEAMS) {
  DIVISIONS[team.league][team.division].push(team);
}
