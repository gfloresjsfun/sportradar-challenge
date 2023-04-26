// Import necessary packages and modules
import { CronJob } from "cron";
import * as dotenv from "dotenv";
import Axios from "axios";
import { appendFileSync } from "fs";
import GameController from "../controllers/game";
import Game from "../entity/Game";
import PlayerController from "../controllers/player";
import { NHLGameInfoResponse, NHLScheduleResponse, NHLSeason } from "./types";

// Load environment variables from .env file
dotenv.config();

// Define API endpoints using environment variables or default values
const GET_SCHEDULE = process.env.GET_SCHEDULE || "https://statsapi.web.nhl.com/api/v1/schedule/"; // Endpoint to get game schedule for the day
const GET_GAME = process.env.GET_GAME || "https://statsapi.web.nhl.com/api/v1/game/ID/boxscore/"; // Endpoint to get information for a game
const GET_SEASONS = process.env.GET_SEASONS || "https://statsapi.web.nhl.com/api/v1/seasons"; // Endpoint to get season information

// NHLCronManager class that manages cron jobs for scheduling and ingesting games.
export default class NHLCronManager {
  private jobs: { [key: string]: CronJob } = {}; // job list property
  private gameController: GameController; // GameController instance
  private playerController: PlayerController; // PlayerController instance

  // initialize controllers and add monitoring schedule job to the cron job list
  constructor() {
    this.gameController = new GameController();
    this.playerController = new PlayerController();
    this.addJob("monitorSchedule", "*/2 * * * * *", this.monitorSchedule.bind(this));
  }

  // Cron job for monitoring game schedules
  async monitorSchedule() {
    try {
      const res = await Axios.get<NHLScheduleResponse>(GET_SCHEDULE); // Get game schedule from api

      const data = res.data;

      // Extract game data from schedule
      const games = data.dates.reduce<Game[]>((list, date) => {
        return [
          ...list,
          ...date.games.map(({ gamePk, gameDate, status: { abstractGameState } }) => ({
            id: gamePk,
            date: gameDate,
            state: abstractGameState,
          })),
        ];
      }, []);

      // Get games saved in the database in an object with id as key and game as value
      const prevGames: { [key: string]: Game } = (
        await this.gameController.getGames(games.map((game) => game.id))
      ).reduce((gamesObj, game) => {
        return { ...gamesObj, [game.id]: game };
      }, {});

      // Check if the game has become live, add and start ingesting games cron job.
      for (let game of games) {
        const currentState = game.state;
        const jobName = `ingest-${game.id}`; // job name for ingesting each game

        // If game is live and not being monitored, start monitoring it
        if (currentState === "Live" && !this.jobs[jobName]) {
          this.addJob(jobName, "*/5 * * * * *", this.ingestGame.bind(this, game.id));
          this.jobs[jobName].start();
          appendFileSync("output.log", `Game ${game.id} has started` + "\n");
        }

        // If game state has not changed, continue
        if (prevGames[game.id] && prevGames[game.id].state === currentState) {
          // Continue if game status is not changed.
          continue;
        } else if (currentState === "Final" && this.jobs[jobName]) {
          //If game is finished and being monitored, stop monitoring it
          this.removeJob(jobName);
          appendFileSync("output.log", `Game ${game.id} has finished` + "\n");
        }
      }

      await this.gameController.saveGames(games); // Save current games to database
    } catch (e) {
      appendFileSync("output.log", `Monitoring schedule failed:` + (e as Error).message + "\n");
    }
  }

  // Cron job function for ingesting game data
  async ingestGame(id: number) {
    try {
      const { data } = await Axios.get<NHLGameInfoResponse>(GET_GAME.replace("ID", id.toString())); // Get game data from api

      // Extract player data from game
      const gameInfos = Object.values({ ...data.teams.away.players, ...data.teams.home.players })
        .filter((player) => player.position.code !== "N/A")
        .map((player) => ({
          player: { id: player.person.id, name: player.person.fullName },
          playerId: player.person.id,
          gameId: id,
          teamId: player.person.currentTeam.id,
          teamName: player.person.currentTeam.name,
          playerAge: player.person.currentAge,
          playerNumber: Number(player.jerseyNumber),
          playerPosition: player.position.name,
          assists: player.stats?.skaterStats?.assists,
          goals: player.stats?.skaterStats?.goals,
          points: player.stats?.skaterStats?.points,
          penaltyMinutes: player.stats?.skaterStats?.penaltyMinutes,
        }));

      // Extract player data to be saved to database
      const players = gameInfos.map(({ player }) => player);

      await this.playerController.savePlayers(players); //Save player data to database

      this.gameController.ingestGameData(gameInfos); // Ingest game data to database
    } catch (e) {
      appendFileSync("output.log", `Ingesting game-${id} failed:` + (e as Error).message);
    }
  }

  // Reload games for a season
  async reloadSeason(season: string) {
    try {
      const { data: seasonData } = await Axios.get<{ seasons: NHLSeason[] }>(GET_SEASONS + season); // Get season list from api

      // Get games for a season from api
      const { data: schedules } = await Axios.get<NHLScheduleResponse>(GET_SCHEDULE, {
        params: {
          startDate: seasonData.seasons[0].regularSeasonStartDate,
          endDate: seasonData.seasons[0].seasonEndDate,
        },
      });

      let games: Game[] = [];

      // For each game of each date in the season, ingest game data
      for (let date of schedules.dates) {
        for (let game of date.games) {
          games.push({ id: game.gamePk, date: game.gameDate, state: game.status.abstractGameState });
          this.ingestGame(game.gamePk);
        }
      }

      // Update game data in the database
      this.gameController.saveGames(games);
    } catch (e) {
      appendFileSync("output.log", `Reloading season-${season} failed:` + (e as Error).message + "\n");
    }
  }

  // Reload game for a specific game
  async reloadGame(id: number) {
    this.ingestGame(id);
  }

  // NHLCronManager method for adding job in the job list
  private addJob(name: string, schedule: string, callback: () => void): void {
    const job = new CronJob(schedule, callback);
    this.jobs[name] = job;
  }

  // NHLCronManager method for stopping and removing job in the job list
  private removeJob(name: string): void {
    const job: CronJob = this.jobs[name];
    if (job) {
      job.stop();
      delete this.jobs[name];
    }
  }

  // Returns job list
  public listJobs(): { name: string; schedule: string }[] {
    const jobs = [];
    for (const name in this.jobs) {
      const job = this.jobs[name];
      jobs.push({ name, schedule: job.nextDate().toLocaleString() });
    }

    return jobs;
  }

  // Starts a cron job
  public start(): void {
    this.jobs["monitorSchedule"].start();
  }

  // Stops a corn job
  public stop(): void {
    for (const name in this.jobs) {
      this.jobs[name].stop();
    }
  }
}
