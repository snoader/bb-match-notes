import Dexie, { Table } from "dexie"
import { MatchEvent } from "../domain/events"

export class BBDatabase extends Dexie {
  events!: Table<MatchEvent>

  constructor() {
    super("bb-match-notes")

    this.version(1).stores({
      events: "id, type, half, turn, createdAt"
    })
  }
}

export const db = new BBDatabase()
