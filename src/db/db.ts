import Dexie, { type Table } from "dexie";
import type { MatchEvent } from "../domain/events";

let reloadRecommended = false;

export const isReloadRecommended = () => reloadRecommended;

export class BBMatchNotesDB extends Dexie {
  events!: Table<MatchEvent, string>;

  constructor() {
    super("bb-match-notes");
    this.version(1).stores({
      events: "id, type, half, turn, createdAt",
    });

    this.on("versionchange", () => {
      reloadRecommended = true;
      this.close();
    });
  }
}

export const db = new BBMatchNotesDB();
