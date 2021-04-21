// We load the plugin here.
import { HardhatUserConfig } from "hardhat/types";

import "../../../src/index";

const config: HardhatUserConfig = {
  solidity: "0.6.7",
  circom: {
    circuits: [
      {
        name: `hash`,
      },
    ],
  },
};

export default config;
