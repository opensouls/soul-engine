export class PlaygroundAPI {
  constructor() {
    this.observers = [];
  }

  on(eventName, fn) {
    this.observers.push({ eventName, fn });
  }

  emit(eventName, data) {
    this.observers.forEach((observer) => {
      if (observer.eventName === eventName) {
        observer.fn(data);
      }
    });
  }

  addMessage(message) {
    this.emit("message", message);
  }

  addUserMessage(text) {
    this.emit("userMessage", text);
    this.emit("message", { sender: "user", message: text });
  }

  log(text) {
    this.emit("log", text);
  }
}

export default PlaygroundAPI;
