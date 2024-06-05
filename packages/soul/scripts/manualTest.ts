import "dotenv/config";
import { Soul } from "../src/soul.js";


const soul = new Soul({
  blueprint: "integrator-test-soul",
  soulId: "manual-tester",
  organization: process.env.SOUL_ENGINE_LOCAL_ORGANIZATION!,
  token: process.env.SOUL_ENGINE_LOCAL_API_KEY!,
  debug: true,
  local: true,
})

soul.on('says', async (event) => {
  console.log('says', await event.content())
})

await soul.connect()

