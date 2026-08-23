import { rmSync } from "node:fs"
import { stateDir } from "./helpers"

export default async function globalTeardown() {
  rmSync(stateDir(), { recursive: true, force: true })
}
