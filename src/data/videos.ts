/**
 * `calm`: still shown at bedtime (see `config.bedtime`).
 * `start` / `end`: play only that part, e.g. `start: "0:08", end: "2:15"` skips a channel intro
 * and a "subscribe!" outro. Seconds (`8`) work too.
 */
export type Video = { id: string; title: string; calm?: boolean; start?: number | string; end?: number | string };

export const videos: Video[] = [
  { id: "BNTn55I68jU", title: "Bu nima? Iya iya yo", calm: true, start: "0:07", end: "6:04" },
  { id: "0vYvII4lmDg", title: "Arab raqamlari", calm: true, start: "0:41", end: "5:01" },
  { id: "WGcjkD93-Dc", title: "Arab harflari", calm: true, start: "0:11", end: "7:57" },
  { id: "rXqcXhbAemU", title: "Plane to Madinah", calm: true, start: "0:08", end: "2:45" },
  { id: "pgtCJr5zf_E", title: "Wheels on the bus", calm: true },
  { id: "-36bn1lOHpA", title: "Muslim boy", calm: true, start: "0:12", end: "3:10" },
  { id: "ijQSX2bWSE8", title: "Hamza hamza", calm: true, start: "0:08", end: "3:24" },
  { id: "vOPzRIylk9A", title: "Muslim shark", calm: true, start: "0:08", end: "3:05" },
  { id: "mwHhEo25jlo", title: "Kasblar arabchada", calm: true, start: "0:08", end: "3:00" },
  { id: "2w01DQwH2oU", title: "Taq taq taq", calm: true, start: "0:04", end: "9:56" },
  { id: "jH83RUB4x8g", title: "Hayvonlar ovozlari", calm: true},
  { id: "AdQCja4MBcY", title: "Arabcha ranglar", calm: true, start: "0:05", end: "2:50" },
  { id: "Nic2uaKcreY", title: "Old Abdullah's Farm", calm: true, start: "0:08", end: "3:44" },
  { id: "p77nQ7WyKgc", title: "Five Little Ducks", calm: true, start: "0:08", end: "2:13" },
  { id: "F9IzQeT00C8", title: "10 Little Muslims", calm: true, start: "0:08", end: "1:40" },
  { id: "jpjiMUdS1UE", title: "Let's All Pray Salah", calm: true, start: "0:08", end: "2:56" },
  { id: "cx1bCLrfuyw", title: "Zoom Zoom Zoom", calm: true, start: "0:10", end: "2:08" },
  { id: "hp2z-X67cjY", title: "Arabic Alphabet Phonics", calm: true, start: "0:08", end: "4:07" },
  { id: "e4yqP4SjkfI", title: "Nursery Rhymes Collection", calm: true, start: "0:08", end: "21:08" },
  { id: "6YHSTrXzVMM", title: "Assalamu Alaikum", calm: true, start: "0:04", end: "1:56" },
  { id: "eP6BeP-UP20", title: "Assalamu Alaikum with Zaky", calm: true, start: "0:12", end: "2:00" },
  { id: "Eq42Zky7f0U", title: "Alhamdulillah", calm: true, start: "0:04", end: "1:55" },
  { id: "VP_lpuXBuBM", title: "Alhamdulillah (Siedd)", calm: true, start: "0:32", end: "2:40" },
  { id: "dfmYfqZSkJs", title: "Sweet Raju", calm: true, start: "0:00", end: "6:10" },
  { id: "dJkXo-yGVQI", title: "Omar & Hana songs", calm: true, start: "0:05", end: "14:00" },
  { id: "xxE7So44oOk", title: "Arabic Alphabet Nasheed", calm: true, start: "0:19", end: "5:13" },
  { id: "-cJu5dlnlYM", title: "Alif Arnab", calm: true },
  // { id: "", title: "" },
  // { id: "", title: "" },
  // { id: "", title: "" },
  // { id: "", title: "" },
  // { id: "", title: "" },
  // { id: "", title: "" },
  // { id: "", title: "" },
  // { id: "", title: "" },
  // { id: "", title: "" },
  // { id: "", title: "" },
  // { id: "", title: "" },
  // { id: "", title: "" },
];
