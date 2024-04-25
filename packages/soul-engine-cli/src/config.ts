
export interface GlobalConfig {
  apiKey: string
  organization: string
}

class ApiConfig {
  constructor(private config: GlobalConfig) {}

  get(key: keyof GlobalConfig) {
    return this.config[key]
  }

  set(key: string, value: string) {
    throw new Error('set undefined')
  }
}

export const getConfig = async (isLocal = false) => {
  // this is the one we expect pasted from the /auth/cli page.
  if (process.env.SOUL_ENGINE_CONFIG) {
    console.log("login with config")
    const parsed = JSON.parse(Buffer.from(process.env.SOUL_ENGINE_CONFIG, "base64").toString("utf8"))
    return new ApiConfig({
      apiKey: parsed.apiKey,
      organization: parsed.organization.slug,
    })
  }

  if (process.env.SOUL_ENGINE_API_KEY && process.env.SOUL_ENGINE_ORGANIZATION) {
    return new ApiConfig({
      apiKey: process.env.SOUL_ENGINE_API_KEY,
      organization: process.env.SOUL_ENGINE_ORGANIZATION,
    })
  }

  const { default: Conf} = await import("conf")
  const projectName = isLocal ? "soul-engine-cli-local" : "soul-engine-cli"
  return new Conf<GlobalConfig>({ projectName })
}
