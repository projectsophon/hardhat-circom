import * as path from "path";
import * as fs from "fs/promises";
import { extendConfig, task } from "hardhat/config";
import { HardhatPluginError } from "hardhat/plugins";
import type { HardhatConfig, HardhatRuntimeEnvironment, HardhatUserConfig } from "hardhat/types";

// @ts-ignore because they don't ship types
import * as snarkjs from "snarkjs";
// @ts-ignore because they don't ship types
import * as circomCompiler from "circom";

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
  ptau?: string;
  wasm?: string;
  zkey?: string;
  beacon?: string;
}

export interface CircomCircuitConfig {
  name: string;
  circuit: string;
  input: string;
  ptau: string;
  wasm: string;
  zkey: string;
  beacon: string;
}

export interface CircomUserConfig {
  verifierTemplatePath?: string;
  verifierOutName?: string;
  circuitInputBasePath?: string;
  circuitOutputBasePath?: string;
  circuits?: CircomCircuitUserConfig[];
}

export interface CircomConfig {
  verifierTemplatePath: string;
  verifier: string;
  circuitInputBasePath: string;
  circuitOutputBasePath: string;
  circuits: CircomCircuitConfig[];
}

export const TASK_CIRCOM = "circom";

interface MemFastFile {
  type: "mem";
  data?: Uint8Array;
}

extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
  if (!userConfig.circom || !userConfig.circom.circuits || userConfig.circom.circuits.length === 0) {
    throw new HardhatPluginError(
      "Circom",
      "Missing required circuits list, please provide via hardhat.config.js (circom.circuits) a list of circuit names to load from the circuitInputBasePath"
    );
  }

  const defaultcircuitInputBasePath = path.join(config.paths.root, "circuits");
  const defaultcircuitOutputBasePath = path.join(config.paths.root, "client", "public");

  const normalizedUserInput =
    normalize(config.paths.root, userConfig.circom.circuitInputBasePath) ?? defaultcircuitInputBasePath;
  const normalizedUserOutput =
    normalize(config.paths.root, userConfig.circom.circuitOutputBasePath) ?? defaultcircuitOutputBasePath;

  config.circom = {
    circuitInputBasePath: normalizedUserInput,
    circuitOutputBasePath: normalizedUserOutput,
    verifierTemplatePath:
      normalize(config.paths.root, userConfig.circom?.verifierTemplatePath) ??
      path.join(__dirname, "Verifier.sol.template"),
    verifier:
      normalize(config.paths.sources, userConfig.circom?.verifierOutName) ??
      path.join(config.paths.sources, "Verifier.sol"),
    circuits: [],
  };

  for (const circuit of userConfig.circom?.circuits ?? []) {
    if (!circuit.name) {
      throw new HardhatPluginError(
        "Circom",
        "Missing required name field in circuits list, please provide via hardhat.config.js (circom.circuits.name)"
      );
    }

    config.circom.circuits.push({
      name: circuit.name,
      beacon:
        circuit.beacon !== undefined
          ? circuit.beacon
          : "00000000000000000000000000000000000000000000000000000000000000",
      circuit:
        normalize(normalizedUserInput, circuit.circuit) ??
        path.join(defaultcircuitInputBasePath, `${circuit.name}.circom`),
      input:
        normalize(normalizedUserInput, circuit.input) ?? path.join(defaultcircuitInputBasePath, `${circuit.name}.json`),
      ptau:
        normalize(normalizedUserInput, circuit.ptau) ?? path.join(defaultcircuitInputBasePath, `${circuit.name}.ptau`),
      wasm:
        normalize(normalizedUserOutput, circuit.wasm) ??
        path.join(defaultcircuitOutputBasePath, `${circuit.name}.wasm`),
      zkey:
        normalize(normalizedUserOutput, circuit.zkey) ??
        path.join(defaultcircuitOutputBasePath, `${circuit.name}.zkey`),
    });
  }
});

task(TASK_CIRCOM, "compile circom circuits and template Verifier")
  .addFlag("deterministic", "enable deterministic builds (except for .wasm)")
  .addFlag("debug", "output intermediate files to artifacts directory, generally for debug")
  .setAction(circomCompile);

async function circomCompile(
  { deterministic, debug }: { deterministic: boolean; debug: boolean },
  hre: HardhatRuntimeEnvironment
) {
  const logger = {
    debug: () => {},
    info: hre.hardhatArguments.verbose ? console.log : () => {},
    warn: hre.hardhatArguments.verbose ? console.log : () => {},
    error: console.log,
  };

  const debugPath = path.join(hre.config.paths.artifacts, "circom");
  if (debug) {
    await fs.mkdir(path.join(debugPath), { recursive: true });
  }

  let finalSol = "";

  for (const circuit of hre.config.circom.circuits) {
    const inputString = (await fs.readFile(circuit.input)).toString();
    const input = JSON.parse(inputString);
    const ptau = await fs.readFile(circuit.ptau);

    const r1cs: MemFastFile = { type: "mem" };
    const wasm: MemFastFile = { type: "mem" };
    await circomCompiler.compiler(circuit.circuit, {
      wasmFileName: wasm,
      r1csFileName: r1cs,
    });

    if (debug) {
      await fs.writeFile(path.join(debugPath, `${circuit.name}.r1cs`), r1cs.data ?? new Uint8Array());
      await fs.writeFile(path.join(debugPath, `${circuit.name}.wasm`), wasm.data ?? new Uint8Array());
    }

    const _cir = await snarkjs.r1cs.info(r1cs, logger);

    const newKey: MemFastFile = { type: "mem" };
    const _csHash = await snarkjs.zKey.newZKey(r1cs, ptau, newKey, logger);
    if (debug) {
      await fs.writeFile(path.join(debugPath, `${circuit.name}-contribution.zkey`), newKey.data ?? new Uint8Array());
    }

    const finalZkey: MemFastFile = { type: "mem" };
    const _contributionHash = deterministic
      ? await snarkjs.zKey.beacon(newKey, finalZkey, undefined, circuit.beacon, 10, logger)
      : await snarkjs.zKey.contribute(newKey, finalZkey, undefined, `${Date.now()}`, logger);
    if (debug) {
      await fs.writeFile(path.join(debugPath, `${circuit.name}.zkey`), finalZkey.data ?? new Uint8Array());
    }

    const verificationKey = await snarkjs.zKey.exportVerificationKey(finalZkey);

    const wtns: MemFastFile = { type: "mem" };
    await snarkjs.wtns.calculate(input, wasm, wtns, logger);
    if (debug) {
      await fs.writeFile(path.join(debugPath, `${circuit.name}.wtns`), wtns.data ?? new Uint8Array());
    }

    const { proof, publicSignals } = await snarkjs.groth16.prove(finalZkey, wtns, logger);
    const verified = await snarkjs.groth16.verify(verificationKey, publicSignals, proof, logger);
    if (!verified) {
      throw new Error("Could not verify the proof");
    }

    await fs.mkdir(path.dirname(circuit.wasm), { recursive: true });
    await fs.writeFile(circuit.wasm, wasm.data ?? new Uint8Array());

    await fs.mkdir(path.dirname(circuit.zkey), { recursive: true });
    await fs.writeFile(circuit.zkey, finalZkey.data ?? new Uint8Array());

    // replace name and name_capped with circuit.name
    const namedTemplate = `
        function <%name%>VerifyingKey() internal pure returns (VerifyingKey memory vk) {
          vk.alfa1 = Pairing.G1Point(<%vk_alpha1%>);
          vk.beta2 = Pairing.G2Point(<%vk_beta2%>);
          vk.gamma2 = Pairing.G2Point(<%vk_gamma2%>);
          vk.delta2 = Pairing.G2Point(<%vk_delta2%>);
          vk.IC = new Pairing.G1Point[](<%vk_ic_length%>);
        <%vk_ic_pts%>
        }
    
        function verify<%name_capped%>Proof(
            uint256[2] memory a,
            uint256[2][2] memory b,
            uint256[2] memory c,
            uint256[<%vk_input_length%>] memory input
        ) public view returns (bool) {
            uint256[] memory inputValues = new uint256[](input.length);
            for (uint256 i = 0; i < input.length; i++) {
                inputValues[i] = input[i];
            }
            return verifyProof(a, b, c, inputValues, <%name%>VerifyingKey());
        }
        `
      .replace(/<%name_capped%>/g, circuit.name.charAt(0).toUpperCase() + circuit.name.slice(1))
      .replace(/<%name%>/g, circuit.name);

    // they replace everything else
    const circuitSol = await snarkjs.zKey.exportSolidityVerifier(
      finalZkey,
      // strings are opened as relative path files, so turn into an array of bytes
      new TextEncoder().encode(namedTemplate),
      logger
    );

    finalSol = finalSol.concat(circuitSol);
  }

  const warning = "// THIS FILE IS GENERATED BY HARDHAT-CIRCOM. DO NOT EDIT THIS FILE.\n\n";
  const template = warning + (await fs.readFile(hre.config.circom.verifierTemplatePath)).toString();

  await fs.mkdir(path.dirname(hre.config.circom.verifier), { recursive: true });

  await fs.writeFile(hre.config.circom.verifier, template.replace(/<%full_circuit%>/g, finalSol));
}

function normalize(basePath: string | undefined, userPath: string | undefined): string | undefined {
  let normalPath: string;
  if (userPath === undefined) {
    return undefined;
  } else {
    if (path.isAbsolute(userPath)) {
      normalPath = userPath;
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
