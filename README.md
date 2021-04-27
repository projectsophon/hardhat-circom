# hardhat-circom

Hardhat plugin to integrate [Circom](https://github.com/iden3/circom) and [SnarkJS](https://github.com/iden3/snarkjs) into your build process.

## What

This combines the multiple steps of the Circom & SnarkJS workflow into your [Hardhat](https://hardhat.org) workflow.

By providing configuration containing your Phase 1 Powers of Tau and circuits, this plugin will:

1. Compile the circuits
2. Apply the final beacon
3. Output your `wasm` and `zkey` files
4. Generate and output a `Verifier.sol`

## Installation

```bash
npm install hardhat-circom
```

Import the plugin in your `hardhat.config.js`:

```js
require("hardhat-circom");
```

Or if you are using TypeScript, in your `hardhat.config.ts`:

```ts
import "hardhat-circom";
```

## Tasks

This plugin adds the `circom` task to build circuit(s) into `wasm` and `zkey` file and template them to a `Verifier.sol` contract saved to the Hardhat sources directory (usually `contracts/`).

```bash
Usage: hardhat [GLOBAL OPTIONS] circom [--deterministic <BOOLEAN>] [--debug <BOOLEAN>]

OPTIONS:

  --debug               output intermediate files to artifacts directory, generally for debug
  --deterministic       enable deterministic builds (except for .wasm)

circom: compile circom circuits and template Verifier

For global options help run: hardhat help
```

You must run `hardhat circom` at least once to build the assets before compiling or deploying your contracts. Additionally, you can hook Hardhat's compile task to build your circuits before every compile, see [Hooking compile](#hooking-compile) below.

## Basic configuration

Set up your project (we'll use `best_dapp_ever/`) with the following minimal `hardhat.config.js` at the root.

```js
module.exports = {
  solidity: "0.6.7",
  circom: {
    // The final ptau file from a Phase 1 ceremony
    ptau: "./circuits/pot15_final.ptau",
    // Each object in this array refers to a separate circuit
    circuits: [{ name: "init" }],
  },
};
```

Your project structure should look like this:

```bash
j:~/best_dapp_ever/ $ tree
└── circuits
    ├── init.circom
    ├── init.json
    └── pot15_final.ptau
```

Now, you can use `npx hardhat circom --verbose` to compile the circuits and output `Verifier.sol`, `init.zkey`, and `init.wasm` files into their respective directories:

```bash
j:~/best_dapp_ever/ $ tree
├── circuits
│   ├── init.circom
│   ├── init.json
│   ├── init.wasm
│   ├── init.zkey
│   └── pot15_final.ptau
└── contracts
    └── Verifier.sol
```

## Advanced configuration

If you'd like to adjust details about the circuit compilation or input/output locations, you can adjust any of these settings:

```js
module.exports = {
  circom: {
    inputBasePath: "./mycircuits/",
    outputBasePath: "./client/",
    ptau: "pot15_final.ptau",
    circuits: [
      {
        name: "init",
        circuit: "init/circuit.circom",
        input: "init/input.json",
        wasm: "circuits/init/circuit.wasm",
        zkey: "init.zkey",
        // Used when specifying `--deterministic` instead of the default of all 0s
        beacon: "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
      },
      {
        name: "play",
        circuit: "play/circuit.circom",
        input: "play/input.json",
        wasm: "circuits/play/circuit.wasm",
        zkey: "play.zkey",
        // Used when specifying `--deterministic` instead of the default of all 0s
        beacon: "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
      },
    ],
  },
};
```

Using the above file structure, you'd get this resulting tree after compile:

```bash
j:~/best_dapp_ever/ $ ls
├── client
│   ├── circuits
│   │   ├── init
│   │   │   └── circuit.wasm
│   │   └── play
│   │       └── circuit.wasm
│   ├── init.zkey
│   └── play.zkey
├── contracts
│   └── Verifier.sol
└── mycircuits
    ├── init
    │   ├── circuit.circom
    │   └── input.json
    ├── play
    │   ├── circuit.circom
    │   └── input.json
    └── pot15_final.ptau
```

## Verifier.sol and templating

This plugin provides a custom `Verifier.sol` template that injects mutliple circuit verifiers into a single Solidity contract.

**However, there are no guarantees this template is audited or up to date. It would be best to override the template by hooking the templating task yourself (exported as `TASK_CIRCOM_TEMPLATE`).**

You can hook the `TASK_CIRCOM_TEMPLATE` to output your own `Verifier.sol` contract.

For example, if you wanted to output a Verifier per circuit using the bundled snarkjs template:

```js
import * as path from "path";
import * as fs from "fs/promises";
import resolve from "resolve";
import { TASK_CIRCOM_TEMPLATE } from "hardhat-circom";

subtask(TASK_CIRCOM_TEMPLATE, "generate Verifier template shipped by SnarkjS").setAction(circomTemplate);

async function circomTemplate({ zkeys }, hre) {
  const snarkjsTemplate = resolve.sync("snarkjs/templates/verifier_groth16.sol");

  for (const zkey of zkeys) {
    const verifierSol = await hre.snarkjs.zKey.exportSolidityVerifier(zkey, snarkjsTemplate);
    const verifierPath = path.join(hre.config.paths.sources, `Verifier_${zkey.name}.sol`);
    await fs.writeFile(verifierPath, verifierSol);
  }
}
```

## Determinism

When you recompile the same circuit, even with no changes, this plugin will apply a new final beacon, changing all the zkey output files. This also causes your Verifier.sol to be updated.

This causes lots of churn on large binary files in git, and makes it hard to know if you've actually made fundamental changes between git commits.

For development builds you may use the `--deterministic` flag in order to use a **NON-RANDOM** and **UNSECURE** hardcoded entropy (0x000000 by default) which will allow you to more easily inspect and catch changes in your circuits. You can adjust this default beacon by setting the `beacon` property on a circuit's config in your `hardhat.config.js` file.

**Note:** The wasm files currently have hardcoded system paths, so they will be deterministic on the same machine, but not between machines. If the zkeys haven't changed you may disregard changes in the wasm files.

## Hooking compile

Some users might want their circuits compiled each time they run the Hardhat compile task. Hardhat's compile task isn't hooked by default because it imposes ordering restrictions on tasks you import and Circom compiles can take _quite a long time_ to generate.

To opt into this behavior, you can hook the Hardhat compile task like so:

```js
import { TASK_COMPILE } from "hardhat/builtin-tasks/task-names";
import { TASK_CIRCOM } from "hardhat-circom";

task(TASK_COMPILE, "hook compile task to include circuit compile and template").setAction(circuitsCompile);

async function circuitsCompile(args, hre, runSuper) {
  await hre.run(TASK_CIRCOM, args);
  await runSuper();
}
```
