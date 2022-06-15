// @ts-ignore because they don't ship types
import * as snarkjs from "snarkjs";

import pluginLogger from "./logger";

// This is extremely fragile and could break with SnarkJS updates
// TODO: Get the logger stuff upstreamed?
// TODO: Definitely get types upstreamed
const wrappedSnark = {
  groth16: {
    fullProve: async function groth16FullProve(
      input: unknown,
      wasmFile: unknown,
      zkeyFileName: unknown,
      logger = pluginLogger
    ): Promise<{ proof: unknown; publicSignals: unknown }> {
      return snarkjs.groth16.fullProve(input, wasmFile, zkeyFileName, logger);
    },
    prove: async function groth16Prove(
      zkeyFileName: unknown,
      witnessFileName: unknown,
      logger = pluginLogger
    ): Promise<{ proof: unknown; publicSignals: unknown }> {
      return snarkjs.groth16.prove(zkeyFileName, witnessFileName, logger);
    },
    verify: async function groth16Verify(
      vk_verifier: unknown,
      publicSignals: unknown,
      proof: unknown,
      logger = pluginLogger
    ): Promise<boolean> {
      return snarkjs.groth16.verify(vk_verifier, publicSignals, proof, logger);
    },
    exportSolidityCallData: async function groth16ExportSolidityCallData(
      proof: unknown,
      publicInputs: unknown
    ): Promise<string> {
      return snarkjs.groth16.exportSolidityCallData(proof, publicInputs);
    },
  },
  plonk: {
    fullProve: async function plonkFullProve(
      input: unknown,
      wasmFile: unknown,
      zkeyFileName: unknown,
      logger = pluginLogger
    ): Promise<{ proof: unknown; publicSignals: unknown }> {
      return snarkjs.plonk.fullProve(input, wasmFile, zkeyFileName, logger);
    },
    prove: async function plonk16Prove(
      zkeyFileName: unknown,
      witnessFileName: unknown,
      logger = pluginLogger
    ): Promise<{ proof: unknown; publicSignals: unknown }> {
      return snarkjs.plonk.prove(zkeyFileName, witnessFileName, logger);
    },
    setup: async function plonkSetup(
      r1csName: unknown,
      ptauName: unknown,
      zkeyName: unknown,
      logger = pluginLogger
    ): Promise<void> {
      return snarkjs.plonk.setup(r1csName, ptauName, zkeyName, logger);
    },
    verify: async function plonkVerify(
      vk_verifier: unknown,
      publicSignals: unknown,
      proof: unknown,
      logger = pluginLogger
    ): Promise<boolean> {
      return snarkjs.plonk.verify(vk_verifier, publicSignals, proof, logger);
    },
    exportSolidityCallData: async function plonkExportSolidityCallData(
      proof: unknown,
      publicInputs: unknown
    ): Promise<string> {
      return snarkjs.plonk.exportSolidityCallData(proof, publicInputs);
    },
  },
  powersOfTau: {
    newAccumulator: async function newAccumulator(
      curve: unknown,
      power: unknown,
      fileName: unknown,
      logger = pluginLogger
    ): Promise<unknown> {
      return snarkjs.powersOfTau.newAccumulator(curve, power, fileName, logger);
    },
    exportChallenge: async function exportChallenge(
      pTauFilename: unknown,
      challengeFilename: unknown,
      logger = pluginLogger
    ): Promise<unknown> {
      return snarkjs.powersOfTau.exportChallenge(pTauFilename, challengeFilename, logger);
    },
    importResponse: async function importResponse(
      oldPtauFilename: unknown,
      contributionFilename: unknown,
      newPTauFilename: unknown,
      name: unknown,
      importPoints: unknown,
      logger = pluginLogger
    ): Promise<unknown> {
      return snarkjs.powersOfTau.importResponse(
        oldPtauFilename,
        contributionFilename,
        newPTauFilename,
        name,
        importPoints,
        logger
      );
    },
    verify: async function verify(tauFilename: unknown, logger = pluginLogger): Promise<unknown> {
      return snarkjs.powersOfTau.verify(tauFilename, logger);
    },
    challengeContribute: async function challengeContribute(
      curve: unknown,
      challengeFilename: unknown,
      responesFileName: unknown,
      entropy: unknown,
      logger = pluginLogger
    ): Promise<unknown> {
      return snarkjs.powersOfTau.challengeContribute(curve, challengeFilename, responesFileName, entropy, logger);
    },
    beacon: async function beacon(
      oldPtauFilename: unknown,
      newPTauFilename: unknown,
      name: unknown,
      beaconHashStr: unknown,
      numIterationsExp: unknown,
      logger = pluginLogger
    ): Promise<unknown> {
      return snarkjs.powersOfTau.beacon(
        oldPtauFilename,
        newPTauFilename,
        name,
        beaconHashStr,
        numIterationsExp,
        logger
      );
    },
    contribute: async function contribute(
      oldPtauFilename: unknown,
      newPTauFilename: unknown,
      name: unknown,
      entropy: unknown,
      logger = pluginLogger
    ): Promise<unknown> {
      return snarkjs.powersOfTau.contribute(oldPtauFilename, newPTauFilename, name, entropy, logger);
    },
    preparePhase2: async function preparePhase2(
      oldPtauFilename: unknown,
      newPTauFilename: unknown,
      logger = pluginLogger
    ): Promise<unknown> {
      return snarkjs.powersOfTau.preparePhase2(oldPtauFilename, newPTauFilename, logger);
    },
    truncate: async function truncate(
      ptauFilename: unknown,
      template: unknown,
      logger = pluginLogger
    ): Promise<unknown> {
      return snarkjs.powersOfTau.truncate(ptauFilename, template, logger);
    },
    convert: async function convert(
      oldPtauFilename: unknown,
      newPTauFilename: unknown,
      logger = pluginLogger
    ): Promise<unknown> {
      return snarkjs.powersOfTau.convert(oldPtauFilename, newPTauFilename, logger);
    },
    exportJson: snarkjs.powersOfTau.exportJson,
  },
  r1cs: {
    print: function r1csPrint(r1cs: unknown, syms: unknown, logger = pluginLogger): unknown {
      return snarkjs.r1cs.print(r1cs, syms, logger);
    },
    info: async function r1csInfo(r1csName: unknown, logger = pluginLogger): Promise<unknown> {
      return snarkjs.r1cs.info(r1csName, logger);
    },
    exportJson: async function r1csExportJson(r1csFileName: unknown, logger = pluginLogger): Promise<unknown> {
      return snarkjs.r1cs.exportJson(r1csFileName, logger);
    },
  },
  wtns: {
    calculate: snarkjs.wtns.calculate,
    debug: async function wtnsDebug(
      input: unknown,
      wasmFileName: unknown,
      wtnsFileName: unknown,
      symName: unknown,
      options: unknown,
      logger = pluginLogger
    ): Promise<unknown> {
      return snarkjs.wtns.debug(input, wasmFileName, wtnsFileName, symName, options, logger);
    },
    exportJson: snarkjs.wtns.exportJson,
  },
  zKey: {
    newZKey: async function newZKey(
      r1csName: unknown,
      ptauName: unknown,
      zkeyName: unknown,
      logger = pluginLogger
    ): Promise<unknown> {
      return snarkjs.zKey.newZKey(r1csName, ptauName, zkeyName, logger);
    },
    exportBellman: async function phase2exportMPCParams(
      zkeyName: unknown,
      mpcparamsName: unknown,
      logger = pluginLogger
    ): Promise<unknown> {
      return snarkjs.zKey.exportBellman(zkeyName, mpcparamsName, logger);
    },
    importBellman: async function phase2importMPCParams(
      zkeyNameOld: unknown,
      mpcparamsName: unknown,
      zkeyNameNew: unknown,
      name: unknown,
      logger = pluginLogger
    ): Promise<unknown> {
      return snarkjs.zKey.importBellman(zkeyNameOld, mpcparamsName, zkeyNameNew, name, logger);
    },
    verifyFromR1cs: async function phase2verifyFromR1cs(
      r1csFileName: unknown,
      pTauFileName: unknown,
      zkeyFileName: unknown,
      logger = pluginLogger
    ): Promise<unknown> {
      return snarkjs.zKey.verifyFromR1cs(r1csFileName, pTauFileName, zkeyFileName, logger);
    },
    verifyFromInit: async function phase2verifyFromInit(
      initFileName: unknown,
      pTauFileName: unknown,
      zkeyFileName: unknown,
      logger = pluginLogger
    ): Promise<unknown> {
      return snarkjs.zKey.verifyFromInit(initFileName, pTauFileName, zkeyFileName, logger);
    },
    contribute: async function phase2contribute(
      zkeyNameOld: unknown,
      zkeyNameNew: unknown,
      name: unknown,
      entropy: unknown,
      logger = pluginLogger
    ): Promise<unknown> {
      return snarkjs.zKey.contribute(zkeyNameOld, zkeyNameNew, name, entropy, logger);
    },
    beacon: async function beacon$1(
      zkeyNameOld: unknown,
      zkeyNameNew: unknown,
      name: unknown,
      beaconHashStr: unknown,
      numIterationsExp: unknown,
      logger = pluginLogger
    ): Promise<unknown> {
      return snarkjs.zKey.beacon(zkeyNameOld, zkeyNameNew, name, beaconHashStr, numIterationsExp, logger);
    },
    exportJson: snarkjs.zKey.exportJson,
    bellmanContribute: async function bellmanContribute(
      curve: unknown,
      challengeFilename: unknown,
      responesFileName: unknown,
      entropy: unknown,
      logger = pluginLogger
    ): Promise<unknown> {
      return snarkjs.zKey.bellmanContribute(curve, challengeFilename, responesFileName, entropy, logger);
    },
    exportVerificationKey: async function zkeyExportVerificationKey(
      zkeyName: unknown,
      logger = pluginLogger
    ): Promise<unknown> {
      return snarkjs.zKey.exportVerificationKey(zkeyName, logger);
    },
    exportSolidityVerifier: async function exportSolidityVerifier(
      zKeyName: unknown,
      templates: { groth16: string; plonk: string },
      logger = pluginLogger
    ): Promise<string> {
      return snarkjs.zKey.exportSolidityVerifier(zKeyName, templates, logger);
    },
  },
};

export default wrappedSnark;
