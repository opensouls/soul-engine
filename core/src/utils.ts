export function devLog(text: string) {
  if (process.env.DEVELOPER_MODE === "true") {
    console.log(text);
  }
}
