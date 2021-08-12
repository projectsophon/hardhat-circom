import * as path from "path";
import * as crypto from "crypto";
import * as fs from "fs/promises";
import { extendConfig, extendEnvironment, task, subtask, types } from "hardhat/config";
import { HardhatPluginError } from "hardhat/plugins";
import type { HardhatConfig, HardhatRuntimeEnvironment, HardhatUserConfig } from "hardhat/types";

import snarkjs from "./snarkjs";
// @ts-ignore because they don't ship types
import * as circomCompiler from "circom";

declare module "hardhat/types/runtime" {
  interface HardhatRuntimeEnvironment {
    circom: {
      // eslint-disable-next-line @typescript-eslint/ban-types
      [key: string]: Function;
    };
    snarkjs: typeof snarkjs;
  }
}

extendEnvironment((hre) => {
  hre.circom = circomCompiler;
  hre.snarkjs = snarkjs;
});

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
  circuit?: string;
  input?: string;
  wasm?: string;
  r1cs?: string;
  zkey?: string;
  beacon?: string;
}

export interface CircomCircuitConfig {
  name: string;
  circuit: string;
  input: string;
  wasm: string;
  r1cs: string;
  zkey: string;
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
  circuits: CircomCircuitConfig[];
}

export const PLUGIN_NAME = "hardhat-circom";
export const TASK_CIRCOM = "circom";
export const TASK_CIRCOM_TEMPLATE = "circom:template";

interface MemFastFile {
  type: "mem";
  data?: Uint8Array;
}

export interface ZkeyFastFile {
  type: "mem";
  name: string;
  data: Uint8Array;
}

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

  const normalizedPtauPath = path.resolve(normalizedInputBasePath, ptau);

  config.circom = {
    inputBasePath: normalizedInputBasePath,
    outputBasePath: normalizedOutputBasePath,
    ptau: normalizedPtauPath,
    circuits: [],
  };

  for (const { name, beacon, circuit, input, wasm, r1cs, zkey } of circuits) {
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

    config.circom.circuits.push({
      name: name,
      beacon: beacon != null ? beacon : "0000000000000000000000000000000000000000000000000000000000000000",
      circuit: circuitPath,
      input: inputPath,
      wasm: wasmPath,
      r1cs: r1csPath,
      zkey: zkeyPath,
    });
  }
});

async function getInputJson(input: string) {
  const inputString = await fs.readFile(input, "utf8");
  try {
    return JSON.parse(inputString);
  } catch (err) {
    throw new HardhatPluginError(PLUGIN_NAME, `Failed to parse JSON in file: ${input}`, err);
  }
}

task(TASK_CIRCOM, "compile circom circuits and template Verifier")
  .addFlag("deterministic", "enable deterministic builds (except for .wasm)")
  .addFlag("debug", "output intermediate files to artifacts directory, generally for debug")
  .setAction(circomCompile);

async function circomCompile(
  { deterministic, debug }: { deterministic: boolean; debug: boolean },
  hre: HardhatRuntimeEnvironment
) {
  const debugPath = path.join(hre.config.paths.artifacts, "circom");
  if (debug) {
    await fs.mkdir(path.join(debugPath), { recursive: true });
  }

  const ptau = await fs.readFile(hre.config.circom.ptau);

  const zkeys = [];
  for (const circuit of hre.config.circom.circuits) {
    const input = await getInputJson(circuit.input);

    const r1csFastFile: MemFastFile = { type: "mem" };
    const wasmFastFile: MemFastFile = { type: "mem" };
    await circomCompiler.compiler(circuit.circuit, {
      wasmFileName: wasmFastFile,
      r1csFileName: r1csFastFile,
    });

    if (!r1csFastFile.data) {
      throw new HardhatPluginError(PLUGIN_NAME, `Unable to generate r1cs for circuit named: ${circuit.name}`);
    }
    if (!wasmFastFile.data) {
      throw new HardhatPluginError(PLUGIN_NAME, `Unable to generate wasm for circuit named: ${circuit.name}`);
    }

    if (debug) {
      await fs.writeFile(path.join(debugPath, `${circuit.name}.r1cs`), r1csFastFile.data);
      await fs.writeFile(path.join(debugPath, `${circuit.name}.wasm`), wasmFastFile.data);
    }

    const _cir = await snarkjs.r1cs.info(r1csFastFile);

    const newKeyFastFile: MemFastFile = { type: "mem" };
    const _csHash = await snarkjs.zKey.newZKey(r1csFastFile, ptau, newKeyFastFile);

    if (!newKeyFastFile.data) {
      throw new HardhatPluginError(PLUGIN_NAME, `Unable to generate new zkey for circuit named: ${circuit.name}`);
    }

    if (debug) {
      await fs.writeFile(path.join(debugPath, `${circuit.name}-contribution.zkey`), newKeyFastFile.data);
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
      await fs.writeFile(path.join(debugPath, `${circuit.name}.zkey`), beaconZkeyFastFile.data);
    }

    const verificationKey = await snarkjs.zKey.exportVerificationKey(beaconZkeyFastFile);

    const wtnsFastFile: MemFastFile = { type: "mem" };
    await snarkjs.wtns.calculate(input, wasmFastFile, wtnsFastFile);

    if (!wtnsFastFile.data) {
      throw new HardhatPluginError(PLUGIN_NAME, `Unable to generate witness for circuit named: ${circuit.name}`);
    }

    if (debug) {
      await fs.writeFile(path.join(debugPath, `${circuit.name}.wtns`), wtnsFastFile.data);
    }

    const { proof, publicSignals } = await snarkjs.groth16.prove(beaconZkeyFastFile, wtnsFastFile);
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

    zkeys.push({ type: "mem", name: circuit.name, data: beaconZkeyFastFile.data });
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
  let finalSol = "";
  for (const zkey of zkeys) {
    const userTemplate = `
    function ${zkey.name}VerifyingKey() internal pure returns (VerifyingKey memory vk) {
      vk.alfa1 = Pairing.G1Point(<%vk_alpha1%>);
      vk.beta2 = Pairing.G2Point(<%vk_beta2%>);
      vk.gamma2 = Pairing.G2Point(<%vk_gamma2%>);
      vk.delta2 = Pairing.G2Point(<%vk_delta2%>);
      vk.IC = new Pairing.G1Point[](<%vk_ic_length%>);
    <%vk_ic_pts%>
    }

    function verify${zkey.name.charAt(0).toUpperCase() + zkey.name.slice(1)}Proof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[<%vk_input_length%>] memory input
    ) public view returns (bool) {
        uint256[] memory inputValues = new uint256[](input.length);
        for (uint256 i = 0; i < input.length; i++) {
            inputValues[i] = input[i];
        }
        return verifyProof(a, b, c, inputValues, ${zkey.name}VerifyingKey());
    }`;

    // strings are opened as relative path files, so turn into an array of bytes
    const circuitSol = await snarkjs.zKey.exportSolidityVerifier(zkey, new TextEncoder().encode(userTemplate));

    finalSol = finalSol.concat(circuitSol);
  }

  const verifierTemplatePath = path.join(__dirname, "Verifier.sol.template");
  const verifier = path.join(hre.config.paths.sources, "Verifier.sol");

  const warning = "// THIS FILE IS GENERATED BY HARDHAT-CIRCOM. DO NOT EDIT THIS FILE.\n\n";
  const template = warning + (await fs.readFile(verifierTemplatePath)).toString();

  await fs.mkdir(path.dirname(verifier), { recursive: true });

  await fs.writeFile(verifier, template.replace(/<%full_circuit%>/g, finalSol));
}
