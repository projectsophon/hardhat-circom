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
    ptau: "https://hermezptau.blob.core.windows.net/ptau/powersOfTau28_hez_final_15.ptau",
    circuits: [
      {
        name: "biomebase",
        beacon: "0000000005060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
      },
      {
        name: "move",
        protocol: "plonk",
      },
      {
        name: "init",
        version: 1,
        circuit: "circuit.circom",
        input: "input.json",
        wasm: "circuit.wasm",
        r1cs: "circuit.r1cs",
        zkey: "circuit.zkey",
        vkey: "circuit.vkey.json",
      },
    ],
  },
};

export default config;
