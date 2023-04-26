import GameController from "./controllers/game";
import PlayerController from "./controllers/player";

export const Routes: Array<{ method: string; route: string; controller: any; action: string }> = [
  {
    route: "/games", // Get games
    method: "get",
    controller: GameController,
    action: "handleGetGames",
  },
  {
    route: "/games/:id", // Get game info
    method: "get",
    controller: GameController,
    action: "handleGetGame",
  },
  {
    route: "/players/:id/games", // Get player's games
    method: "get",
    controller: PlayerController,
    action: "handleGetPlayerGames",
  },
  {
    route: "/players/:playerId/games/:gameId/", // Get players info for a game
    method: "get",
    controller: PlayerController,
    action: "handleGetPlayerGame",
  },
  {
    route: "/games/:gameId/players/:playerId/", // Get players info for a game
    method: "get",
    controller: PlayerController,
    action: "handleGetPlayerGame",
  },
];
