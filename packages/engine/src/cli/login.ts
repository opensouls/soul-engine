import { getConfig } from "./config.js"
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

export const handleLogin = async (local: boolean, force = false) => {
  const rl = readline.createInterface({ input, output });

  const globalConfig = await getConfig(local)

  if (globalConfig.get("apiKey") && !force) {
    return
  }

  const { default: open } = await import("open")

  const url = local ? "http://localhost:3000/auth/cli" : "https://souls.chat/auth/cli"
  open(url)


  console.log(`Opening ${url} in your browser. If the browser does not open, then please visit manually.`)


  const configInput = await rl.question('Please login to the soul engine and then paste the config here: ');
  rl.close();

  const responses = { configInput };

  const pasted = responses.configInput
  const pastedConfig = JSON.parse(Buffer.from(pasted, "base64").toString("utf8"))
  // console.log("pastedConfig", pastedConfig)

  console.log(`logged into ${pastedConfig.organization.name} as ${pastedConfig.user.email}`)
  globalConfig.set("apiKey", pastedConfig.apiKey)
  globalConfig.set("organization", pastedConfig.organization.slug)
  globalConfig.set("organization_id", pastedConfig.organization.id)
}
