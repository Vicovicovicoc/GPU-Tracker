/** Returns true when a date falls in the requested hour in mainland France. */
export function isParisHour(date: Date, hour: number): boolean {
  const hourPart = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    hourCycle: "h23",
    timeZone: "Europe/Paris",
  }).formatToParts(date).find((part) => part.type === "hour");
  return Number(hourPart?.value) === hour;
}
