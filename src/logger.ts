import debug from "debug";
import type { Debugger } from "debug";

const pluginLogger: { [key: string]: Debugger } = {};

type Level = "debug" | "info" | "warn" | "error";
for (const level of ["debug", "info", "warn", "error"] as Level[]) {
  pluginLogger[level] = debug(`hardhat-circom:${level}`);
  pluginLogger[level].log = console[level].bind(console);
}

export default pluginLogger;
