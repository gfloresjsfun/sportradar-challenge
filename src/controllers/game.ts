import { Request, Response } from "express";
import { Repository, In } from "typeorm";
import { AppDataSource } from "../data-source";
import Game from "../entity/Game";
import GamePlayer from "../entity/GamePlayer";

export default class GameController {
  private gameRepository: Repository<Game> = AppDataSource.getRepository(Game);
  private gamePlayerRepository: Repository<GamePlayer> = AppDataSource.getRepository(GamePlayer);

  constructor() {}

  // Saving and updating games in the database
  async saveGames(games: Partial<Game>[]): Promise<void> {
    try {
      await this.gameRepository.upsert(games, ["id"]);
    } catch (e) {
      throw new Error("Saving games failed: " + (e as Error).message);
    }
  }

  // Ingest game data and saves in the database
  async ingestGameData(gameInfos: Partial<GamePlayer>[]): Promise<void> {
    try {
      await this.gamePlayerRepository.upsert(gameInfos, ["playerId", "gameId"]);
    } catch (e) {
      throw new Error("Ingesting game info failed: " + (e as Error).message);
    }
  }

  // get games from ids in the database
  async getGames(ids?: number[]): Promise<Game[]> {
    try {
      if (ids) {
        return await this.gameRepository.find({ where: { id: In(ids) } });
      } else {
        return await this.gameRepository.find();
      }
    } catch (e) {
      throw new Error("Getting games failed: " + (e as Error).message);
    }
  }

  // Controller that sends games info in the response
  async handleGetGames(req: Request, res: Response): Promise<void> {
    try {
      const games = await this.getGames();

      res.json(games);
    } catch (e) {
      console.log((e as Error).message);
    }
  }

  // Controller that sends a game info in the response
  async handleGetGame(req: Request<{ id: number }>, res: Response): Promise<void> {
    const id = req.params.id;

    try {
      const game =
        (await this.gameRepository.findOne({ where: { id }, relations: { gameInfos: { player: true } } })) || {}; // Get information of a game in a database

      res.json(game);
    } catch (e) {
      console.error((e as any).message);
    }
  }
}
