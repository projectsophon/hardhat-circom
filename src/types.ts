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
