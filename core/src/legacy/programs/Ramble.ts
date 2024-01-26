import { rambleAction } from "../actions/ramble";
import { ConversationalProgram } from "./index";

export class RambleProgram implements ConversationalProgram {
  async toOutput() {
    return {
      actions: [rambleAction],
    };
  }

  update() {
    return;
  }
}
