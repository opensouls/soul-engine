import { Json, JsonRPCCall, JsonRPCResponse } from "@opensouls/core";
import { Soul } from "./soul.js";
import { observeDeep } from "@syncedstore/core";

export class ToolHandler {
  private tools: Record<string, (params: any) => Promise<any>> = {};
  
  private inProgress: Set<string>;

  private stopObserving?: () => void;

  constructor(private soul: Soul) {
    this.inProgress = new Set();
  }

  registerTool<Params = Json, Response = Json>(tool: string, handler: (params: Params) => Promise<Response>) {
    this.tools[tool] = handler;
  }

  start() {
    this.stopObserving = observeDeep(this.soul.store.pendingToolCalls, () => {
      const pending = Object.entries(this.soul.store.pendingToolCalls ?? {}).filter(
        (entry): entry is [string, { request: JsonRPCCall; response?: JsonRPCResponse }] => {
          const { request, response } = entry[1] || {};
          if (!request) {
            return false;
          }
          if (response) {
            return false
          }
          if (this.inProgress.has(request.id)) {
            return false;
          }
          if (!this.tools[request.method]) {
            console.warn("Soul tried to call", request.method, "but this tool is not registered.")
            return false;
          }
          return true;
        }
      );

      for (const [, { request }] of pending) {
        this.inProgress.add(request.id);
        this.executeTool(request).finally(() => {
          this.inProgress.delete(request.id);
        })
      }
      
    })
  }

  stop() {
    this.stopObserving?.();
  }

  private async executeTool(request: JsonRPCCall) {
    try {
      const tool = this.tools[request.method];
      if (!tool) {
        throw {
          code: 404,
          message: "Method not found"
        }
      }
      const result = await tool(request.params);
      this.soul.store.pendingToolCalls![request.id]!.response = {
        id: request.id,
        result,
      };
    } catch (err: any) {
      this.soul.store.pendingToolCalls![request.id]!.response = {
        error: {
          code: err.code || -32000,
          message: err.message || "Internal error",
          data: err.data || null,
        },
        id: request.id,
      }
    }
  }
}