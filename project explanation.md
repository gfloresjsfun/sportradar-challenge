# Overview

This is a SportsRadar api challenge project for monitoring hockey games schedule and when a game goes live, ingest game data in real time and save them in the database.

## Technologies Used

- Express: Node.js framework
- PostgreSQL: Database
- TypeScript
- TypeORM: ORM that supports typescript
- Cron: Node.js cron job module
- Sinon: Package for mocking functions and variables, etc in tests
- Jest: Testing library

## Project Structure

- ./src/index.ts // Project starting point, starts express server and cron job manager
- ./src/routes.ts // Contains list of endpoints and controllers for express server
- ./src/data-source.ts // TypeORM data source file
- ./src/entity // Contains TypeORM models
- ./src/jobs/index.ts // NHLCronJobManager class file
- .src/jobs/jobs.test.ts // Testing case for NHLCronJobManager
- ./src/jobs/types.ts // Contains types for API return values
- ./src/controllers // Contains controllers for games and players
- ./src/migrations // Contains TypeORM database migration files

## Project WorkFlow

- Run the project with `yarn start`
- It runs src/index.ts
  - Config and start express server
  - Start NHLCronJobManager src/jobs/index.ts
    - starts monitoring game schedules
    - If a game goes live starts ingesting game job and ingest in real time
    - If a game finishes, stops ingesting game job
- Express server has started and we have these endpoints to check data in the database
  - GET: http://locahost:3000/jobs/ Returns a list of jobs in the queue.
  - GET: http://locahost:3000/games/ Returns a list of games.
  - GET: http://locahost:3000/games/:id/ Returns a game info
  - GET: http://locahost:3000/games/:gameId/players/:playerId/ Return a player's stats in the game
  - GET: http://localhost:3000/players/:playerId/games/:gameId/ Return a player's stats in the game
  - GET: http://localhost:3000/players/:playerId/games Return player's games stats
- Has