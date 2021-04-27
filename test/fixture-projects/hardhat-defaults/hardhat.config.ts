// We load the plugin here.
import type { HardhatUserConfig } from "hardhat/types";

import "../../../";

const config: HardhatUserConfig = {
  solidity: "0.6.7",
  circom: {
    ptau: "pot15_final.ptau",
    circuits: [
      {
        name: "hash",
      },
    ],
  },
};

export default config;
