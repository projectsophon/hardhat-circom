// TODO: None of the path tests are cross platform
import * as path from "path";
import { assert } from "chai";
import { resetHardhatContext } from "hardhat/plugins-testing";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

describe("Hardhat Circom", function () {
  describe("Test Defaults", function () {
    beforeEach("Loading hardhat environment", function () {
      process.chdir(
        path.join(__dirname, "fixture-projects", "hardhat-defaults")
      );

      this.hre = require("hardhat") as HardhatRuntimeEnvironment;
    });

    afterEach("Resetting hardhat", function () {
      resetHardhatContext();
    });

    it("Should add the circom to the config", function () {
      assert.isDefined(this.hre.config.circom);
    });

    it("Should have 1 circuits", function () {
      assert.equal(this.hre.config.circom.circuits.length, 1);
    });

    it("first circuit default beacon", function () {
      const first = this.hre.config.circom.circuits[0];
      assert.equal(
        first.beacon,
        "00000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Should use default circuitInputBasePath and circuit name", function () {
      const first = this.hre.config.circom.circuits[0];
      assert.isTrue(
        first.circuit.includes("/hardhat-defaults/circuits/hash.circom")
      );
    });

    it("Should use default circuitInputBasePath and input name", function () {
      const first = this.hre.config.circom.circuits[0];
      assert.isTrue(
        first.input.includes("/hardhat-defaults/circuits/hash.json")
      );
    });

    it("Should use default circuitInputBasePath and ptau name", function () {
      const first = this.hre.config.circom.circuits[0];
      assert.isTrue(
        first.ptau.includes("/hardhat-defaults/circuits/hash.ptau")
      );
    });

    it("Should use default circuitOutputBasePath and wasm name", function () {
      const first = this.hre.config.circom.circuits[0];
      assert.isTrue(
        first.wasm.includes("/hardhat-defaults/client/public/hash.wasm")
      );
    });

    it("Should use default circuitOutputBasePath and zkey name", function () {
      const first = this.hre.config.circom.circuits[0];
      assert.isTrue(
        first.zkey.includes("/hardhat-defaults/client/public/hash.zkey")
      );
    });

    it("Should use default verifier output name", function () {
      assert.isTrue(
        this.hre.config.circom.verifier.includes(
          "/hardhat-defaults/contracts/Verifier.sol"
        )
      );
    });

    it("Should use default verifier input path", function () {
      assert.isTrue(
        this.hre.config.circom.verifierTemplatePath.includes(
          "hardhat-circom/dist/Verifier.sol.template"
        )
      );
    });
  });

  describe("Test Overrides", function () {
    beforeEach("Loading hardhat environment", function () {
      process.chdir(
        path.join(__dirname, "fixture-projects", "hardhat-overrides")
      );

      this.hre = require("hardhat") as HardhatRuntimeEnvironment;
    });

    afterEach("Resetting hardhat", function () {
      resetHardhatContext();
    });

    it("Should add the circom to the config", function () {
      assert.isDefined(this.hre.config.circom);
    });

    it("Should have 3 circuits", function () {
      assert.equal(this.hre.config.circom.circuits.length, 3);
    });

    it("first circuit user defined beacon", function () {
      const first = this.hre.config.circom.circuits[0];
      assert.equal(
        first.beacon,
        "0000000005060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f"
      );
    });

    it("Should override circuitInputBasePath and circuit name", function () {
      const third = this.hre.config.circom.circuits[2];
      assert.equal(third.circuit, "/circuits/circuit.circom");
    });

    it("Should override circuitInputBasePath and input name", function () {
      const third = this.hre.config.circom.circuits[2];
      assert.equal(third.input, "/circuits/input.json");
    });

    it("Should override circuitInputBasePath and ptau name", function () {
      const third = this.hre.config.circom.circuits[2];
      assert.equal(third.ptau, "/circuits/pot15_final.ptau");
    });

    it("Should override circuitOutputBasePath and wasm name", function () {
      const third = this.hre.config.circom.circuits[2];
      assert.equal(third.wasm, "/client/public/circuit.wasm");
    });

    it("Should override circuitOutputBasePath and zkey name", function () {
      const third = this.hre.config.circom.circuits[2];
      assert.equal(third.zkey, "/client/public/circuit.zkey");
    });

    it("Should override verifier output name", function () {
      assert.equal(
        this.hre.config.circom.verifier,
        "/contracts/VerifierContract.sol"
      );
    });

    it("Should override verifier input path", function () {
      assert.equal(
        this.hre.config.circom.verifierTemplatePath,
        "/contracts/Verifier.sol.template"
      );
    });
  });
});
