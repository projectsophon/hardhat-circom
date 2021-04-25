# hardhat-circom

Hardhat plugin for iden3 circom and snarkjs build process

## What

This plugin uses the fast file (in memory) apis from snarkjs and circom in order to compile one or more circom circuits into zkey, wasm, and verifier solidity outputs.

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

This plugin adds the circom task to Hardhat to build circuit(s) into wasm and zkey assets and template them to a `Verifier.sol` contract saved to the `sources` hardhat directory.

```bash
Usage: hardhat [GLOBAL OPTIONS] circom [--deterministic <BOOLEAN>]

OPTIONS:

  --debug               output intermediate files to artifacts directory, generally for debug
  --deterministic       enable deterministic builds (except for .wasm)

circom: rebuild circom circuit

For global options help run: hardhat help
```

This must be done at least once to build the assets.

Note the `.wasm` files include fully qualified path names from your machine and are never deterministic sadly.

## Configuration

Assuming the hardhatroot (in this case `best_dapp_ever`) with the following minimal `hardhat.config.js`

```js
module.exports = {
  solidity: "0.6.7",
  circom: {
    circuits: [{ name: "init" }],
  },
};
```

The `/best_dapp_ever/circuits` directory would look like this:

```bash
j:~/best_dapp_ever/circuits $ ls
init.circom  init.json  circom.ptau
```

Then using `npx hardhat circom --verbose` turns your `Verifier.sol.template` into `Verifier.sol` and outputs the files:

```bash
j:~/best_dapp_ever/client/public $ ls
init.zkey  init.wasm
```

NOTE: If `verifierTemplatePath` is not provided this plugin provides a `Verifier.sol.template` for your convenience. However there are no guarantees this template is audited or up to date. It would be best to edit it to your liking and provide it to the `verifierTemplatePath` configuration.

You can overide all of these settings to name every and input and output:

```js
module.exports = {
  circom: {
    verifierTemplatePath: "./contracts/Verifier.sol.template",
    ptauPath: "./mycircuits/pot15_final.ptau",
    verifierOutName: "Verifier.sol", // Output path is hardcoded to hardhat artifact directory
    circuitInputBasePath: "./mycircuits/",
    circuitOutputBasePath: "./public/",
    circuits: [
      {
        name: "init",
        circuit: "init/circuit.circom",
        input: "init/input.json",
        wasm: "circuits/init/circuit.wasm",
        zkey: "init.zkey",
        beacon: "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
      },
    ],
  },
};
```

Assuming this circuits directory structure:

```bash
j:~/best_dapp_ever/mycircuits/ $ ls
pot15_final.ptau init
j:~/best_dapp_ever/mycircuits/ $ cd init
j:~/best_dapp_ever/mycircuits/init $ ls
circuit.circom  input.json
```

Outputs files:

```bash
j:~/best_dapp_ever/public $ ls
circuits init.zkey
j:~/best_dapp_ever/public $ cd circuits/init
j:~/best_dapp_ever/public/circuits/init $ ls
circuit.wasm
```

Note the new optional beacon field, for use with `--deterministic` builds (instead of the default all 0s beacon.
