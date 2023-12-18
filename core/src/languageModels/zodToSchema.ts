
import { ZodSchema } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"

export const zodToSchema = (zod: ZodSchema) => {
  const schema = zodToJsonSchema(zod)

  delete schema["$schema"]
  delete (schema as any)["additionalProperties"]
  return schema
}