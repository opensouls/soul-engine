import fetch from 'node-fetch';

class CustomModelManager {
  private local: boolean;
  private globalConfig: any;
  private organizationSlug: string;
  private rootUrl: string;

  constructor(local: boolean, organizationSlug: string, apiKey: string) {
    this.local = local;
    this.organizationSlug = organizationSlug;
    this.globalConfig = { get: (key: string) => key === "apiKey" ? apiKey : null };
    this.rootUrl = this.local ? "http://localhost:4000/api" : "https://servers.souls.chat/api";
  }

  public async listModels() {
    const url = `${this.rootUrl}/${this.organizationSlug}/customProcessors`;

    try {
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${this.globalConfig.get("apiKey")}`,
          "Content-Type": "application/json"
        },
      });

      if (!response.ok) {
        console.error("Failed to fetch custom processors", { url, response: response.status, statusText: response.statusText });
        return;
      }

      const processors = await response.json();
      return processors
    } catch (error) {
      console.error("Error fetching custom processors:", error);
    }
  }

  public async createModel(modelData: any) {
    const url = `${this.rootUrl}/${this.organizationSlug}/customProcessors`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${this.globalConfig.get("apiKey")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(modelData)
      });

      if (!response.ok) {
        console.error("Failed to create custom model", { url, response: response.status, statusText: response.statusText });
        return;
      }

      const newProcessor = await response.json();
      return newProcessor
    } catch (error) {
      console.error("Error creating custom processor:", error);
    }
  }
}

export default CustomModelManager;
