// compilation note: this file is included manually at the end of the types.d.ts in the dist folder
// see https://github.com/microsoft/rushstack/issues/1709

// these are added to the global scope when executing in the SOUL ENGINE
// $$ is a convenience method using Mustache to access the soul.env variables.
declare global {
  const soul: {
    __hooks: SoulHooks
    env: Record<string, Json>,
  }
  const $$: (template: string) => string
}
