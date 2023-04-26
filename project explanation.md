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
- ./src/data-source.ts // TypeORM data source file
- ./src/entity // Contains TypeORM models
- ./src/jobs/index.ts // NHLCronJobManager class file
- .src/jobs/jobs.test.ts // Testing case for NHLCronJobManager
- ./src/jobs/types.ts // Contains types for API return values
- ./src/controllers // Contains controllers for games and players
- ./src/migrations // Contains TypeORM database migration files


