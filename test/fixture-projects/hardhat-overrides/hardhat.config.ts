// We load the plugin here.
import type { HardhatUserConfig } from "hardhat/types";

import "../../../";

const config: HardhatUserConfig = {
  solidity: "0.7.3",
  defaultNetwork: "hardhat",
  paths: {
    sources: "/contracts",
    artifacts: "/artifacts",
  },
  circom: {
    inputBasePath: "/circuits",
    outputBasePath: "/client/public",
    ptau: "pot15_final.ptau",
    circuits: [
      {
        name: "biomebase",
        beacon: "0000000005060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
      },
      {
        name: "move",
      },
      {
        name: "init",
        circuit: "circuit.circom",
        input: "input.json",
        wasm: "circuit.wasm",
        zkey: "circuit.zkey",
      },
    ],
  },
};

export default config;
