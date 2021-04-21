import "hardhat/types/config";

import { CircomConfig, CircomUserConfig } from "./types";

declare module "hardhat/types/config" {
  interface HardhatUserConfig {
    circom?: CircomUserConfig;
  }

  interface HardhatConfig {
    circom: CircomConfig;
  }
}
