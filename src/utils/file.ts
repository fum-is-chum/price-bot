import fs from "fs";

export function writeDataToFile(fileName: string, data: Object) {
  fs.writeFileSync(fileName, JSON.stringify(data));
}

export function loadDataFromFile(fileName: string) {
  if (fs.existsSync(fileName)) {
    return JSON.parse(fs.readFileSync(fileName, "utf8"));
  }
  return null;
}