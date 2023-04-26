import { Request, Response } from "express";
import { Repository } from "typeorm";
import Player from "../entity/Player";
import { AppDataSource } from "../data-source";
import GamePlayer from "../entity/GamePlayer";

export default class PlayerController {
  private playerRepository: Repository<Player> = AppDataSource.getRepository(Player);
  private gamePlayerRepository: Repository<GamePlayer> = AppDataSource.getRepository(GamePlayer);

  // Method that saves or updates players
  async savePlayers(players: Partial<Player>[]): Promise<void> {
    try {
      await this.playerRepository.upsert(players, ["id"]); // Saves or updates if the player with same id exists
    } catch (e) {
      throw new Error("Saving players failed" + (e as Error).message);
    }
  }

  // Method to handle get player games requests and send players' games as response
  async handleGetPlayerGames(req: Request<{ id: number }>, res: Response): Promise<void> {
    const id = req.params.id;

    try {
      const games = await this.playerRepository.findOne({ where: { id }, relations: { playerGames: { game: true } } }); // Find player with the id gotten from params and return games from the player

      res.json(games);
    } catch (e) {
      console.log((e as any).message);
    }
  }

  // Method to handle get player's info in a game and send it as response
  async handleGetPlayerGame(req: Request<{ playerId: number; gameId: number }>, res: Response): Promise<void> {
    const playerId = req.params.playerId; // player Id in params
    const gameId = req.params.gameId; // game Id in params

    try {
      // Get player's information in a game, look up in a pivot table
      const play = await this.gamePlayerRepository.findOne({
        where: { playerId: playerId, gameId: gameId },
        relations: { game: true, player: true },
      });

      res.json(play);
    } catch (e) {
      console.log((e as any).message);
    }
  }
}
