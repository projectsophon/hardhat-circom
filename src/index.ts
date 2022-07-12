import * as path from "path";
import * as crypto from "crypto";
import * as fs from "fs/promises";
import * as nodefs from "fs";
import { inspect } from "util";
import assert from "assert";
import { ufs } from "@phated/unionfs";
import { Volume, createFsFromVolume } from "memfs";
import { existsSync, createWriteStream } from "fs";
import { extendConfig, extendEnvironment, task, subtask, types } from "hardhat/config";
import { HardhatPluginError, lazyObject } from "hardhat/plugins";
import camelcase from "camelcase";
import shimmer from "shimmer";
import type { HardhatConfig, HardhatRuntimeEnvironment, HardhatUserConfig } from "hardhat/types";
import { stream } from "undici";
import BufferList from "bl";

import logger from "./logger";
import snarkjs from "./snarkjs";
// @ts-ignore because they don't ship types
import * as circom1Compiler from "circom";
// @ts-ignore because they don't ship types
import { CircomRunner, bindings } from "circom2";
// @ts-ignore because they don't ship types
import { WitnessCalculatorBuilder } from "circom_runtime";
// @ts-ignore because they don't ship types
import { readR1cs } from "r1csfile";
// @ts-ignore because they don't ship types
import { F1Field } from "ffjavascript";

// Awaited taken from a newer TypeScript
type Awaited<T> = T extends null | undefined
  ? T // special case for `null | undefined` when not in `--strictNullChecks` mode
  : // eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any
  T extends object & { then(onfulfilled: infer F): any } // `await` only unwraps object types with a callable `then`. Non-object types are not unwrapped
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    F extends (value: infer V, ...args: any) => any // if the argument to `then` is callable, extracts the first argument
    ? Awaited<V> // recursively unwrap the value
    : never // the argument to `then` was not callable
  : T; // non-object or non-thenable

interface HasToString {
  toString: () => string;
}

type ConstraintElement = Readonly<{ [key: number]: BigInt }>;
type Constraint = Readonly<[ConstraintElement, ConstraintElement, ConstraintElement]>;

interface MemFastFile {
  type: "mem";
  data?: Uint8Array;
}

export interface ZkeyFastFile {
  type: "mem";
  name: string;
  data: Uint8Array;
}

declare module "hardhat/types/runtime" {
  interface HardhatRuntimeEnvironment {
    circom: {
      // eslint-disable-next-line @typescript-eslint/ban-types
      [key: string]: Function;
    };
    snarkjs: typeof snarkjs;
    circuitTest: {
      setup: (circuitName: string, options?: { debug: boolean }) => Promise<CircuitTestUtils>;
      teardown: () => Promise<void>;
    };
  }
}

// Add our types to the Hardhat config
declare module "hardhat/types/config" {
  interface HardhatUserConfig {
    circom?: CircomUserConfig;
  }

  interface HardhatConfig {
    circom: CircomConfig;
  }
}

export interface CircomCircuitUserConfig {
  name?: string;
  version?: 1 | 2;
  protocol?: "groth16" | "plonk";
  circuit?: string;
  input?: string;
  wasm?: string;
  r1cs?: string;
  zkey?: string;
  vkey?: string;
  beacon?: string;
}

export interface CircomCircuitConfig {
  name: string;
  version: 1 | 2;
  protocol: "groth16" | "plonk";
  circuit: string;
  input: string;
  wasm: string;
  r1cs: string;
  zkey: string;
  vkey: string;
  beacon: string;
}

export interface CircomUserConfig {
  inputBasePath?: string;
  outputBasePath?: string;
  ptau: string;
  circuits: CircomCircuitUserConfig[];
}

export interface CircomConfig {
  inputBasePath: string;
  outputBasePath: string;
  ptau: string;
  ptauDownload: string | undefined;
  circuits: CircomCircuitConfig[];
}

extendEnvironment((hre) => {
  hre.circom = circom1Compiler;
  hre.snarkjs = snarkjs;
  hre.circuitTest = lazyObject(() => {
    let hasDebug = false;
    const testDebugPath = path.join(hre.config.paths.artifacts, "circom/test");

    return {
      async setup(whichCircuit: string, { debug } = { debug: false }) {
        if (debug) {
          hasDebug = true;
        }

        for (const circuit of hre.config.circom.circuits) {
          if (whichCircuit !== circuit.name) {
            continue;
          }

          const compiler = circuit.version === 1 ? circom1 : circom2;

          let compilerOutput: Awaited<ReturnType<typeof compiler>>;

          try {
            compilerOutput = await compiler({
              circuit,
              debug: debug ? { path: testDebugPath } : undefined,
            });
          } catch (err) {
            throw new HardhatPluginError(PLUGIN_NAME, `Unable to compile circuit named: ${circuit.name}`, err as Error);
          }

          return new CircuitTestUtils(compilerOutput);
        }

        throw new HardhatPluginError(PLUGIN_NAME, `Unable to locate circuit named: ${whichCircuit}`);
      },
      async teardown() {
        if (hasDebug) {
          await fs.rm(testDebugPath, { recursive: true });
        }
      },
    };
  });
});

export const PLUGIN_NAME = "hardhat-circom";
export const TASK_CIRCOM = "circom";
export const TASK_CIRCOM_TEMPLATE = "circom:template";

extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
  const { root } = config.paths;

  const { inputBasePath, outputBasePath, ptau, circuits = [] } = userConfig.circom ?? {};

  if (circuits.length === 0) {
    throw new HardhatPluginError(
      PLUGIN_NAME,
      "Missing required circuits list, please provide via hardhat.config.js (circom.circuits) a list of circuit names to load from the inputBasePath"
    );
  }
  if (!ptau) {
    throw new HardhatPluginError(
      PLUGIN_NAME,
      "Missing required ptau location, please provide via hardhat.config.js (circom.ptau) the location of your ptau file"
    );
  }

  const defaultInputBasePath = path.join(root, "circuits");
  const defaultOutputBasePath = path.join(root, "circuits");

  const normalizedInputBasePath = normalize(root, inputBasePath) ?? defaultInputBasePath;
  const normalizedOutputBasePath = normalize(root, outputBasePath) ?? defaultOutputBasePath;

  const ptauIsUrl = ptau.startsWith("http://") || ptau.startsWith("https://");
  let normalizedPtauPath: string;
  if (ptauIsUrl) {
    const ptauFile = ptau.replace(/^(http:|https:)\/\//, "").replace(/\//g, "_");
    // TODO: This is used here and as the debug path. That should probably be normalized into the config
    const artifactPath = path.join(config.paths.artifacts, "circom");
    normalizedPtauPath = path.join(artifactPath, ptauFile);
  } else {
    normalizedPtauPath = path.resolve(normalizedInputBasePath, ptau);
  }

  config.circom = {
    inputBasePath: normalizedInputBasePath,
    outputBasePath: normalizedOutputBasePath,
    ptau: normalizedPtauPath,
    ptauDownload: ptauIsUrl ? ptau : undefined,
    circuits: [],
  };

  for (const { name, version, protocol, beacon, circuit, input, wasm, r1cs, zkey, vkey } of circuits) {
    if (!name) {
      throw new HardhatPluginError(
        PLUGIN_NAME,
        "Missing required name field in circuits list, please provide via hardhat.config.js (circom.circuits.name)"
      );
    }

    const circuitPath = path.resolve(normalizedInputBasePath, circuit ?? `${name}.circom`);
    const inputPath = path.resolve(normalizedInputBasePath, input ?? `${name}.json`);
    const wasmPath = path.resolve(normalizedOutputBasePath, wasm ?? `${name}.wasm`);
    const r1csPath = path.resolve(normalizedOutputBasePath, r1cs ?? `${name}.r1cs`);
    const zkeyPath = path.resolve(normalizedOutputBasePath, zkey ?? `${name}.zkey`);
    const vkeyPath = path.resolve(normalizedOutputBasePath, vkey ?? `${name}.vkey.json`);

    config.circom.circuits.push({
      name: name,
      version: version !== 1 ? 2 : 1,
      protocol: protocol !== "plonk" ? "groth16" : "plonk",
      beacon: beacon != null ? beacon : "0000000000000000000000000000000000000000000000000000000000000000",
      circuit: circuitPath,
      input: inputPath,
      wasm: wasmPath,
      r1cs: r1csPath,
      zkey: zkeyPath,
      vkey: vkeyPath,
    });
  }
});

async function getInputJson(input: string) {
  const inputString = await fs.readFile(input, "utf8");
  try {
    return JSON.parse(inputString);
  } catch (err) {
    throw new HardhatPluginError(PLUGIN_NAME, `Failed to parse JSON in file: ${input}`, err as Error);
  }
}

async function circom1({ circuit, debug }: { circuit: CircomCircuitConfig; debug?: { path: string } }) {
  const r1csFastFile: MemFastFile = { type: "mem" };
  const wasmFastFile: MemFastFile = { type: "mem" };
  const watFastFile: MemFastFile = { type: "mem" };
  const symWriteStream = new BufferList();
  await circom1Compiler.compiler(circuit.circuit, {
    watFileName: watFastFile,
    wasmFileName: wasmFastFile,
    r1csFileName: r1csFastFile,
    symWriteStream,
  });

  const symFastFile: MemFastFile = {
    type: "mem",
    data: symWriteStream.slice(),
  };

  if (!r1csFastFile.data) {
    throw new HardhatPluginError(PLUGIN_NAME, `Unable to generate r1cs for circuit named: ${circuit.name}`);
  }
  if (!wasmFastFile.data) {
    throw new HardhatPluginError(PLUGIN_NAME, `Unable to generate wasm for circuit named: ${circuit.name}`);
  }

  if (debug) {
    await fs.writeFile(path.join(debug.path, `${circuit.name}.r1cs`), r1csFastFile.data);
    await fs.writeFile(path.join(debug.path, `${circuit.name}.wasm`), wasmFastFile.data);

    // The .wat file is only used for debug
    if (watFastFile.data) {
      await fs.writeFile(path.join(debug.path, `${circuit.name}.wat`), watFastFile.data);
    }
    // The .sym file is only used for debug
    if (symFastFile.data) {
      await fs.writeFile(path.join(debug.path, `${circuit.name}.sym`), symFastFile.data);
    }
  }

  return {
    // the `.data` property is checked above
    r1cs: r1csFastFile as Required<MemFastFile>,
    wasm: wasmFastFile as Required<MemFastFile>,
    sym: symFastFile as Required<MemFastFile>,
  } as const;
}

async function circom2({ circuit, debug }: { circuit: CircomCircuitConfig; debug?: { path: string } }) {
  // Prepare a virtual filesystem because circom2 only operates on files
  const vol = Volume.fromJSON({
    "/dev/stdin": "",
    "/dev/stdout": "",
    "/dev/stderr": "",
  });
  const memfs = createFsFromVolume(vol);

  // Using this order to prefer writing virtual files from the circom2 wasm
  ufs
    .use(nodefs)
    // I hate typescript
    .use(memfs as unknown as typeof nodefs);

  // Get the circuit's filename without extension
  // This is what circom2 names all files it outputs (with different extensions)
  const { name: circuitName, dir } = path.parse(circuit.circuit);
  const wasmDir = path.join(dir, `${circuitName}_js`);

  // We build virtual paths here because circom2 outputs these into dumb places
  const r1csVirtualPath = path.join(dir, `${circuitName}.r1cs`);
  const symVirtualPath = path.join(dir, `${circuitName}.sym`);
  const wasmVirtualPath = path.join(wasmDir, `${circuitName}.wasm`);
  const watVirtualPath = path.join(wasmDir, `${circuitName}.wat`);

  // Make the r1cs directory so it doesn't defer to nodefs for writing
  // but don't make the wasm directory because otherwise circom2 won't proceed
  await ufs.promises.mkdir(dir, { recursive: true });

  let stdout = "";
  let stderr = "";
  // We wrap the writeSync function because circom2 doesn't allow us to
  // configure the logging and it doesn't exit with proper exit codes
  shimmer.wrap(ufs, "writeSync", function (original) {
    return function (
      fd: number,
      data: NodeJS.ArrayBufferView | string,
      offsetOrPosition?: number | null | undefined,
      lengthOrEncoding?: number | null | undefined | BufferEncoding,
      position?: number | null | undefined
    ): number {
      // If writing to stdout, we hijack to hide unless debug
      if (fd === 1) {
        if (typeof data === "string") {
          stdout += data;
          // This is a little fragile, but we assume the wasmer-js
          // terminal character is a newline by itself
          if (stdout.endsWith("\n")) {
            const msg = stdout.trim();
            stdout = "";
            logger.info(msg);
          }
          return data.length;
        } else {
          stdout += new TextDecoder().decode(data);
          // This is a little fragile, but we assume the wasmer-js
          // terminal character is a newline by itself
          if (stdout.endsWith("\n")) {
            const msg = stdout.trim();
            stdout = "";
            logger.info(msg);
          }
          return data.byteLength;
        }
      }

      // If writing to stderr, we hijack and throw an error
      if (fd == 2) {
        if (typeof data === "string") {
          stderr += data;
          // This is a little fragile, but we assume that circom2
          // ends the failed compile with "previous errors were found"
          if (stderr.includes("previous errors were found")) {
            const msg = stderr.trim();
            stderr = "";
            logger.error(msg);
            throw new Error(msg);
          }
          return data.length;
        } else {
          stderr += new TextDecoder().decode(data);
          // This is a little fragile, but we assume that circom2
          // ends the failed compile with "previous errors were found"
          if (stderr.includes("previous errors were found")) {
            const msg = stderr.trim();
            stderr = "";
            logger.error(msg);
            throw new Error(msg);
          }
          return data.byteLength;
        }
      }

      if (typeof data === "string") {
        if (typeof lengthOrEncoding !== "number") {
          return original(fd, data, offsetOrPosition, lengthOrEncoding);
        } else {
          throw Error("Invalid arguments");
        }
      } else {
        if (typeof lengthOrEncoding !== "string") {
          return original(fd, data, offsetOrPosition, lengthOrEncoding, position);
        } else {
          throw Error("Invalid arguments");
        }
      }
    };
  });

  const circom = new CircomRunner({
    args: [circuit.circuit, "--r1cs", "--wat", "--wasm", "--sym", "-o", dir],
    env: {},
    // Preopen from the root because we use absolute paths
    preopens: {
      "/": "/",
    },
    bindings: {
      ...bindings,
      fs: ufs,
    },
  });

  const circomWasm = await fs.readFile(require.resolve("circom2/circom.wasm"));

  await circom.execute(circomWasm);

  const r1csFastFile: MemFastFile = {
    type: "mem",
    data: await ufs.promises.readFile(r1csVirtualPath),
  };
  const symFastFile: MemFastFile = {
    type: "mem",
    data: await ufs.promises.readFile(symVirtualPath),
  };
  const wasmFastFile: MemFastFile = {
    type: "mem",
    data: await ufs.promises.readFile(wasmVirtualPath),
  };
  const watFastFile: MemFastFile = {
    type: "mem",
    data: await ufs.promises.readFile(watVirtualPath),
  };

  if (!r1csFastFile.data) {
    throw new HardhatPluginError(PLUGIN_NAME, `Unable to generate r1cs for circuit named: ${circuit.name}`);
  }
  if (!wasmFastFile.data) {
    throw new HardhatPluginError(PLUGIN_NAME, `Unable to generate wasm for circuit named: ${circuit.name}`);
  }

  if (debug) {
    await fs.writeFile(path.join(debug.path, `${circuit.name}.r1cs`), r1csFastFile.data);
    await fs.writeFile(path.join(debug.path, `${circuit.name}.wasm`), wasmFastFile.data);

    // The .wat file is only used for debug
    if (watFastFile.data) {
      await fs.writeFile(path.join(debug.path, `${circuit.name}.wat`), watFastFile.data);
    }
    // The .sym file is only used for debug
    if (symFastFile.data) {
      await fs.writeFile(path.join(debug.path, `${circuit.name}.sym`), symFastFile.data);
    }
  }

  return {
    // the `.data` property is checked above
    r1cs: r1csFastFile as Required<MemFastFile>,
    wasm: wasmFastFile as Required<MemFastFile>,
    sym: symFastFile as Required<MemFastFile>,
  } as const;
}

async function groth16({
  circuit,
  deterministic,
  debug,
  wasm: wasmFastFile,
  r1cs: r1csFastFile,
  ptau,
}: {
  circuit: CircomCircuitConfig;
  deterministic: boolean;
  debug?: { path: string };
  wasm: Required<MemFastFile>;
  r1cs: Required<MemFastFile>;
  ptau: string;
}): Promise<ZkeyFastFile> {
  const input = await getInputJson(circuit.input);

  const newKeyFastFile: MemFastFile = { type: "mem" };
  const _csHash = await snarkjs.zKey.newZKey(r1csFastFile, ptau, newKeyFastFile);

  if (!newKeyFastFile.data) {
    throw new HardhatPluginError(PLUGIN_NAME, `Unable to generate new zkey for circuit named: ${circuit.name}`);
  }

  if (debug) {
    await fs.writeFile(path.join(debug.path, `${circuit.name}-contribution.zkey`), newKeyFastFile.data);
  }

  const beaconZkeyFastFile: MemFastFile = { type: "mem" };

  const _contributionHash = await snarkjs.zKey.beacon(
    newKeyFastFile,
    beaconZkeyFastFile,
    undefined,
    deterministic ? circuit.beacon : crypto.randomBytes(32).toString("hex"),
    10
  );

  if (!beaconZkeyFastFile.data) {
    throw new HardhatPluginError(PLUGIN_NAME, `Unable to generate beacon zkey for circuit named: ${circuit.name}`);
  }

  if (debug) {
    await fs.writeFile(path.join(debug.path, `${circuit.name}.zkey`), beaconZkeyFastFile.data);
  }

  const verificationKey = await snarkjs.zKey.exportVerificationKey(beaconZkeyFastFile);
  if (debug) {
    await fs.writeFile(path.join(debug.path, `${circuit.name}.vkey.json`), JSON.stringify(verificationKey));
  }

  const wtnsFastFile: MemFastFile = { type: "mem" };
  await snarkjs.wtns.calculate(input, wasmFastFile, wtnsFastFile);

  if (!wtnsFastFile.data) {
    throw new HardhatPluginError(PLUGIN_NAME, `Unable to generate witness for circuit named: ${circuit.name}`);
  }

  if (debug) {
    await fs.writeFile(path.join(debug.path, `${circuit.name}.wtns`), wtnsFastFile.data);
  }

  const { proof, publicSignals } = await snarkjs.groth16.prove(beaconZkeyFastFile, wtnsFastFile);

  if (debug) {
    await fs.writeFile(path.join(debug.path, `${circuit.name}.proof.json`), JSON.stringify(proof));
    await fs.writeFile(path.join(debug.path, `${circuit.name}.public.json`), JSON.stringify(publicSignals));
  }

  const verified = await snarkjs.groth16.verify(verificationKey, publicSignals, proof);
  if (!verified) {
    throw new HardhatPluginError(PLUGIN_NAME, `Could not verify the proof for circuit named: ${circuit.name}`);
  }

  await fs.mkdir(path.dirname(circuit.wasm), { recursive: true });
  await fs.writeFile(circuit.wasm, wasmFastFile.data);

  await fs.mkdir(path.dirname(circuit.zkey), { recursive: true });
  await fs.writeFile(circuit.zkey, beaconZkeyFastFile.data);

  await fs.mkdir(path.dirname(circuit.r1cs), { recursive: true });
  await fs.writeFile(circuit.r1cs, r1csFastFile.data);

  await fs.mkdir(path.dirname(circuit.vkey), { recursive: true });
  await fs.writeFile(circuit.vkey, JSON.stringify(verificationKey));

  return { type: "mem", name: circuit.name, data: beaconZkeyFastFile.data };
}

async function plonk({
  circuit,
  debug,
  wasm: wasmFastFile,
  r1cs: r1csFastFile,
  ptau,
}: {
  circuit: CircomCircuitConfig;
  debug?: { path: string };
  wasm: Required<MemFastFile>;
  r1cs: Required<MemFastFile>;
  ptau: string;
}): Promise<ZkeyFastFile> {
  const input = await getInputJson(circuit.input);

  const newKeyFastFile: MemFastFile = { type: "mem" };

  await snarkjs.plonk.setup(r1csFastFile, ptau, newKeyFastFile);

  if (!newKeyFastFile.data) {
    throw new HardhatPluginError(PLUGIN_NAME, `Unable to generate new zkey for circuit named: ${circuit.name}`);
  }

  const verificationKey = await snarkjs.zKey.exportVerificationKey(newKeyFastFile);
  if (debug) {
    await fs.writeFile(path.join(debug.path, `${circuit.name}.vkey.json`), JSON.stringify(verificationKey));
  }

  const wtnsFastFile: MemFastFile = { type: "mem" };
  await snarkjs.wtns.calculate(input, wasmFastFile, wtnsFastFile);

  if (!wtnsFastFile.data) {
    throw new HardhatPluginError(PLUGIN_NAME, `Unable to generate witness for circuit named: ${circuit.name}`);
  }

  if (debug) {
    await fs.writeFile(path.join(debug.path, `${circuit.name}.wtns`), wtnsFastFile.data);
  }

  const { proof, publicSignals } = await snarkjs.plonk.prove(newKeyFastFile, wtnsFastFile);

  if (debug) {
    await fs.writeFile(path.join(debug.path, `${circuit.name}.proof.json`), JSON.stringify(proof));
    await fs.writeFile(path.join(debug.path, `${circuit.name}.public.json`), JSON.stringify(publicSignals));
  }

  const verified = await snarkjs.plonk.verify(verificationKey, publicSignals, proof);
  if (!verified) {
    throw new HardhatPluginError(PLUGIN_NAME, `Could not verify the proof for circuit named: ${circuit.name}`);
  }

  await fs.mkdir(path.dirname(circuit.wasm), { recursive: true });
  await fs.writeFile(circuit.wasm, wasmFastFile.data);

  await fs.mkdir(path.dirname(circuit.zkey), { recursive: true });
  await fs.writeFile(circuit.zkey, newKeyFastFile.data);

  await fs.mkdir(path.dirname(circuit.r1cs), { recursive: true });
  await fs.writeFile(circuit.r1cs, r1csFastFile.data);

  await fs.mkdir(path.dirname(circuit.vkey), { recursive: true });
  await fs.writeFile(circuit.vkey, JSON.stringify(verificationKey));

  return { type: "mem", name: circuit.name, data: newKeyFastFile.data };
}

task(TASK_CIRCOM, "compile circom circuits and template Verifier")
  .addFlag("deterministic", "enable deterministic builds for groth16 protocol circuits (except for .wasm)")
  .addFlag("debug", "output intermediate files to artifacts directory, generally for debug")
  .addOptionalParam("circuit", "limit your circom task to a single circuit name", undefined, types.string)
  .setAction(circomCompile);

async function circomCompile(
  { deterministic, debug, circuit: onlyCircuitNamed }: { deterministic: boolean; debug: boolean; circuit?: string },
  hre: HardhatRuntimeEnvironment
) {
  const artifactPath = path.join(hre.config.paths.artifacts, "circom");
  const { ptauDownload } = hre.config.circom;
  if (debug || ptauDownload) {
    await fs.mkdir(path.join(artifactPath), { recursive: true });
  }

  if (ptauDownload) {
    if (existsSync(hre.config.circom.ptau)) {
      logger.info(`Using cached Powers of Tau file at ${hre.config.circom.ptau}`);
    } else {
      logger.info(`Downloading Powers of Tau file from ${ptauDownload}`);
      await stream(ptauDownload, { method: "GET", opaque: { path: hre.config.circom.ptau } }, ({ opaque }) =>
        createWriteStream((opaque as { path: string }).path)
      );
    }
  }

  if (!existsSync(hre.config.circom.ptau)) {
    throw new HardhatPluginError(PLUGIN_NAME, `Could not locate ptau file: ${hre.config.circom.ptau}`);
  }

  const zkeys: ZkeyFastFile[] = [];
  for (const circuit of hre.config.circom.circuits) {
    if (onlyCircuitNamed && onlyCircuitNamed !== circuit.name) {
      continue;
    }

    const compiler = circuit.version === 1 ? circom1 : circom2;

    let compilerOutput: Awaited<ReturnType<typeof compiler>>;

    try {
      compilerOutput = await compiler({
        circuit,
        debug: debug ? { path: artifactPath } : undefined,
      });
    } catch (err) {
      throw new HardhatPluginError(PLUGIN_NAME, `Unable to compile circuit named: ${circuit.name}`, err as Error);
    }

    const { r1cs, wasm } = compilerOutput;

    const _cir = await snarkjs.r1cs.info(r1cs);

    const snarker = circuit.protocol === "groth16" ? groth16 : plonk;

    const zkey = await snarker({
      circuit,
      debug: debug ? { path: artifactPath } : undefined,
      wasm,
      r1cs,
      ptau: hre.config.circom.ptau,
      // Only used by groth16
      deterministic,
    });

    zkeys.push(zkey);
  }

  await hre.run(TASK_CIRCOM_TEMPLATE, { zkeys: zkeys });
}

function normalize(basePath: string | undefined, userPath: string | undefined): string | undefined {
  let normalPath: string;
  if (userPath === undefined) {
    return undefined;
  } else {
    if (path.isAbsolute(userPath)) {
      normalPath = path.normalize(userPath);
    } else {
      if (basePath === undefined) {
        return undefined;
      }
      // We resolve relative paths starting from the project's root.
      // Please keep this convention to avoid confusion.
      normalPath = path.normalize(path.join(basePath, userPath));
    }
  }
  return normalPath;
}

subtask(TASK_CIRCOM_TEMPLATE, "template Verifier with zkeys")
  .addParam("zkeys", "array of zkey fastfiles (can be passed directly to SnarkJS)", undefined, types.any)
  .setAction(circomTemplate);

async function circomTemplate({ zkeys }: { zkeys: ZkeyFastFile[] }, hre: HardhatRuntimeEnvironment) {
  const warning = "// THIS FILE IS GENERATED BY HARDHAT-CIRCOM. DO NOT EDIT THIS FILE.\n";

  const snarkjsRoot = path.dirname(require.resolve("snarkjs"));
  const templateDir = existsSync(path.join(snarkjsRoot, "templates")) ? "templates" : "../templates";

  const verifierGroth16TemplatePath = path.join(snarkjsRoot, templateDir, "verifier_groth16.sol.ejs");
  const verifierPlonkTemplatePath = path.join(snarkjsRoot, templateDir, "verifier_plonk.sol.ejs");

  const groth16Template = await fs.readFile(verifierGroth16TemplatePath, "utf8");
  const plonkTemplate = await fs.readFile(verifierPlonkTemplatePath, "utf8");
  for (const zkey of zkeys) {
    const circuitSol = await snarkjs.zKey.exportSolidityVerifier(zkey, {
      groth16: groth16Template,
      plonk: plonkTemplate,
    });

    const finalSol = warning + circuitSol;

    const name = camelcase(zkey.name, {
      pascalCase: true,
      preserveConsecutiveUppercase: true,
      locale: false,
    });

    const verifier = path.join(hre.config.paths.sources, `${name}Verifier.sol`);

    await fs.mkdir(path.dirname(verifier), { recursive: true });

    await fs.writeFile(verifier, finalSol);
  }
}

// Testing utility
// Based on https://github.com/iden3/circom_tester/blob/3e9963ce7d371c15978674331cff1d14027d209d/wasm/tester.js
// but adapted for use in the hardhat-circom infrastructure
export class CircuitTestUtils {
  private r1cs: Required<MemFastFile>;
  private wasm: Required<MemFastFile>;
  private sym: Required<MemFastFile>;

  private symbols?: {
    [key: string]: {
      labelIdx: number;
      varIdx: number;
      componentIdx: number;
    };
  };

  private F?: F1Field;
  private constraints?: Constraint[];

  constructor({
    r1cs,
    wasm,
    sym,
  }: {
    r1cs: Required<MemFastFile>;
    wasm: Required<MemFastFile>;
    sym: Required<MemFastFile>;
  }) {
    this.r1cs = r1cs;
    this.wasm = wasm;
    this.sym = sym;
  }

  public async calculateWitness(input: unknown, sanityCheck: boolean): Promise<BigInt[]> {
    const wc = await WitnessCalculatorBuilder(this.wasm.data);

    return wc.calculateWitness(input, sanityCheck);
  }

  public async calculateLabeledWitness(input: unknown, sanityCheck: boolean): Promise<LabeledWitness> {
    const wc = await WitnessCalculatorBuilder(this.wasm.data);
    const witness = await wc.calculateWitness(input, sanityCheck);
    const symbols = await this.loadSymbols();
    const labels: { [label: string]: string | undefined } = {};

    for (const n in symbols) {
      let v = undefined;
      if (typeof witness[symbols[n].varIdx] !== "undefined") {
        v = witness[symbols[n].varIdx].toString();
      }
      labels[n] = v;
    }

    return new LabeledWitness(witness, labels);
  }

  public async loadSymbols(): Promise<NonNullable<CircuitTestUtils["symbols"]>> {
    if (!this.symbols) {
      this.symbols = {};

      const lines = this.sym.data.toString().split("\n");
      for (const line of lines) {
        const arr = line.split(",");

        if (arr.length != 4) continue;

        this.symbols[arr[3]] = {
          labelIdx: Number(arr[0]),
          varIdx: Number(arr[1]),
          componentIdx: Number(arr[2]),
        };
      }
    }

    return this.symbols;
  }

  public async loadConstraints(): Promise<NonNullable<CircuitTestUtils["constraints"]>> {
    if (!this.constraints) {
      const r1cs = await readR1cs(this.r1cs, {
        loadConstraints: true,
        loadMaps: false,
        getFieldFromPrime: (p: unknown) => new F1Field(p),
      });

      this.F = r1cs.F;
      this.constraints = r1cs.constraints;
    }

    return this.constraints as NonNullable<CircuitTestUtils["constraints"]>;
  }

  public async assertOut(actualOut: HasToString[], expectedOut: HasToString): Promise<void> {
    const symbols = await this.loadSymbols();

    const checkObject = (prefix: string, eOut: HasToString) => {
      if (Array.isArray(eOut)) {
        for (let i = 0; i < eOut.length; i++) {
          checkObject(`${prefix}[${i}]`, eOut[i]);
        }
      } else if (isPlainObject(eOut)) {
        for (const k in eOut) {
          checkObject(`${prefix}.${k}`, eOut[k]);
        }
      } else {
        if (typeof symbols[prefix] == "undefined") {
          assert(false, `Output variable not defined: ${prefix}`);
        }
        const ba = actualOut[symbols[prefix].varIdx].toString();
        const be = eOut.toString();
        assert.strictEqual(ba, be, prefix);
      }
    };

    checkObject("main", expectedOut);
  }

  public async getDecoratedOutput(witness: HasToString[]): Promise<string> {
    const symbols = await this.loadSymbols();

    const lines = [];
    for (const n in symbols) {
      let v;
      if (typeof witness[symbols[n].varIdx] !== "undefined") {
        v = witness[symbols[n].varIdx].toString();
      } else {
        v = "undefined";
      }
      lines.push(`${n} --> ${v}`);
    }
    return lines.join("\n");
  }

  public async checkConstraints(witness: BigInt[]): Promise<void> {
    const constraints = await this.loadConstraints();

    const evalLC = (lc: ConstraintElement) => {
      const F = this.F;
      let v = F.zero;
      for (const w in lc) {
        v = F.add(v, F.mul(lc[w], F.e(witness[w])));
      }
      return v;
    };

    const checkConstraint = (constraint: Constraint) => {
      const F = this.F;
      const a = evalLC(constraint[0]);
      const b = evalLC(constraint[1]);
      const c = evalLC(constraint[2]);
      assert(F.isZero(F.sub(F.mul(a, b), c)), "Constraint doesn't match");
    };

    for (let i = 0; i < constraints.length; i++) {
      checkConstraint(constraints[i]);
    }
  }
}

export class LabeledWitness implements ArrayLike<BigInt> {
  length: number;

  [label: string]: string | undefined | any;

  private _labels: { [label: string]: string | undefined };

  constructor(witness: BigInt[], labels: { [label: string]: string | undefined }) {
    this.length = witness.length;

    for (const [idx, val] of witness.entries()) {
      this[idx] = val;
    }

    this._labels = labels;
    for (const [label, val] of Object.entries(labels)) {
      this[label] = val;
    }
  }
  [Symbol.toStringTag] = "LabeledWitness";
  [inspect.custom](): { [label: string]: string | undefined } {
    return this._labels;
  }
}

// Some helpers

function isPlainObject(val: unknown): val is { [key: string]: HasToString } {
  if (typeof val === "object") {
    if (val != null) {
      if (val.constructor.name === "Object") {
        for (const v of Object.values(val)) {
          if (typeof v.toString !== "function") {
            return false;
          }
        }
        return true;
      }
    }
  }
  return false;
}
