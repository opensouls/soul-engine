export function devLog(text: string) {
  if (process.env.DEVELOPER_MODE) {
    console.log(text);
  }
}
