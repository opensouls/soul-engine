
export interface GlobalConfig {
  apiKey: string
  organization: string
  organizationId: string
}

export const getConfig = async (isLocal = false) => {
  const { default: Conf} = await import("conf")
  const projectName = isLocal ? "soul-engine-cli-local" : "soul-engine-cli"
  return new Conf<GlobalConfig>({ projectName })
}
