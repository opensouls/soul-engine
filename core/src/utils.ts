export function devLog(...args: any[]) {
  if (process.env.DEVELOPER_MODE === "true") {
    console.log(...args);
  }
}
