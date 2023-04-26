import NHLCronManager from ".";
import * as sinon from "sinon";
import Axios from "axios";

describe("NHLCronManager", () => {
  let nhlCronManager: NHLCronManager;
  let monitorScheduleSpy: sinon.SinonSpy;

  beforeEach(() => {
    nhlCronManager = new NHLCronManager();
    monitorScheduleSpy = sinon.spy(nhlCronManager, "monitorSchedule");
  });

  afterEach(() => {
    nhlCronManager.stop();
    sinon.restore();
  });

  // // A test case that verifies that the monitorSchedule job is started 
  it("should start monitorSchedule job", async () => {
    nhlCronManager.start();  // Starts the nhlCronManager instance 
    await new Promise((resolve) => setTimeout(resolve, 4000));  // Waits for 4 seconds before running the assertion 

    expect(nhlCronManager.listJobs().length).toBe(1);  // Asserts that only one job is running 
    expect(nhlCronManager["jobs"]["monitorSchedule"].running).toBe(true);   //Asserts that the monitorSchedule job is running 
  });

  // Checks if the ingestGame job is started when a game goes live
  it("should start ingestGame job when game goes live", async () => {
    const axiosStub = sinon.stub(Axios, "get"); // Mocks axios

    sinon
      .stub(nhlCronManager["gameController"], "getGames")
      .resolves([{ id: 1, state: "Preview", date: "2023-04-10" }]); // Mocks resolve value of getGames async method of GameController to resolve a game in a preview state

    axiosStub.resolves({
      data: { dates: [{ games: [{ gamePk: 1, status: { abstractGameState: "Live", gameDate: new Date() } }] }] },
    }); // Mocks axios get response to resolve the game in a Live state

    nhlCronManager.start(); // Start CronJonManager and it should start monitorSchedule job

    await new Promise((resolve) => setTimeout(resolve, 4000)); // Waits 4 seconds

    expect(nhlCronManager["jobs"]["ingest-1"].running).toBe(true); // Job for ingesting game with id 1 should start as the state has changed from preview to live
  });
});
