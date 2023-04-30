export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const extractDateValueFromFormat = (date, format, target) => {
  const index = format.indexOf(target);
  if (index == -1) return null;
  return date.substring(index, index + target.length);
};

export const BetterDate = class {
  date;
  format;

  constructor(target, format) {
    this.format = format;
    if (!target) return (this.date = new Date()), this;
    if (target instanceof Date) target = target.toString();
    if (!format) return (this.date = new Date(target)), this;
    format = format.replace(/\bY{2,3}\b/, "YYYY").replace(/\bY{2,3}\b/, "YYYY");
    const match = format.match(/\b\w\b/gm);
    for (let i = 0, len = match?.length || 0; i < len; i++)
      format = format.replace(new RegExp(`\b${match?.[i]}\b`, "g"), match?.[i] + match?.[i]);
    this.date = new Date(
      Number(extractDateValueFromFormat(target, format, "YYYY") || `${new Date().getFullYear()}`),
      Number(extractDateValueFromFormat(target, format, "MM") || "01") - 1,
      Number(extractDateValueFromFormat(target, format, "DD") || "01"),
      Number(extractDateValueFromFormat(target, format, "HH") || extractDateValueFromFormat(target, format, "hh") || "00"),
      Number(extractDateValueFromFormat(target, format, "mm") || "00"),
      Number(extractDateValueFromFormat(target, format, "ss") || "00")
    );
  }

  get year() {
    return this.date.getFullYear();
  }
  set year(value) {
    this.date.setFullYear(value);
  }

  get month() {
    return this.date.getMonth();
  }
  set month(value) {
    this.date.setMonth(value);
  }

  value() {
    return this.date;
  }

  now() {
    return this.date.getTime();
  }

  diff(target, { output = "auto", float = 2, units = false }) {
    const diff = this.now() - target.now();
    const format = (value, unit) => (units ? `${value.toFixed(float)}${unit}` : value.toFixed(float));
    if (output === "auto") {
      if (diff > 1000 * 60 * 60 * 24 * 7 * 30 * 365) output = "year";
      if (diff > 1000 * 60 * 60 * 24 * 7 * 30) output = "month";
      if (diff > 1000 * 60 * 60 * 24 * 7) output = "week";
      if (diff > 1000 * 60 * 60 * 24) output = "day";
      if (diff > 1000 * 360) output = "hour";
      else if (diff > 1000 * 60) output = "minute";
      else if (diff > 1000) output = "second";
      else output = "milisecond";
    }
    //
    if (output?.startsWith("year")) return format(this.year - target.year, "years");
    else if (output?.startsWith("month"))
      return format((target.year - this.year) * 12 - this.month + target.month, "months");
    else if (output?.startsWith("week")) return format(diff / (1000 * 60 * 60 * 24 * 7), "weeks");
    else if (output?.startsWith("day")) return format(diff / (1000 * 60 * 60 * 24), "days");
    else if (output?.startsWith("hour")) return format(diff / (1000 * 60 * 60), "h");
    else if (output?.startsWith("minute")) return format(diff / (1000 * 60), "m");
    else if (output?.startsWith("second")) return format(diff / 1000, "s");
    return format(diff, "ms");
  }

  toISOString() {
    return this.date.toISOString();
  }

  toString(format) {
    if (typeof format === "boolean") format = format ? "DD/MM/YYYY hh:mm" : "DD/MM/YYYY";
    const result = format || this.format || "DD/MM/YYYY";
    const day = this.date.getDate();
    const weekday = WEEKDAYS[this.date.getDay()];
    const month = this.date.getMonth();
    const monthName = MONTHS[month];
    const h = this.date.getHours();
    const m = this.date.getMinutes();
    const s = this.date.getSeconds();
    return result
      .replace("EEEE", weekday)
      .replace("EEE", weekday.slice(0, 3))
      .replace("DD", `${day < 10 ? "0" + day : day}`)
      .replace("D", `${day}`)
      .replace("MM", `${month + 1 < 10 ? "0" + (month + 1) : month + 1}`)
      .replace("Month", monthName)
      .replace("Mon", monthName.slice(0, 3))
      .replace("YYYY", `${this.date.getFullYear()}`)
      .replace("YY", `${this.date.getFullYear()}`)
      .replace("Yr", `${this.date.getFullYear()}`)
      .replace("HH", `${h < 10 ? "0" + h : h}`)
      .replace("hh", `${h < 10 ? "0" + h : h}`)
      .replace("mm", `${m < 10 ? "0" + m : m}`)
      .replace("ss", `${s < 10 ? "0" + s : s}`);
  }
};

const date = (target, format) => new BetterDate(target, format);

date.min = (a, b) => (a.now() < b.now() ? a : b);

date.max = (a, b) => (a.now() > b.now() ? a : b);

export { date };
