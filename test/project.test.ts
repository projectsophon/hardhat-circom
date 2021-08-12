import * as path from "path";
import { assert } from "chai";
import { resetHardhatContext } from "hardhat/plugins-testing";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

function assertPathIncludes(config: string, unixPath: string) {
  assert.include(config, path.normalize(unixPath));
}
function assertPathEqualsAbsolute(config: string, unixPath: string) {
  assert(path.isAbsolute(unixPath));
  assert.equal(config, path.resolve(unixPath));
}

describe("Hardhat Circom", function () {
  describe("Test Defaults", function () {
    beforeEach("Loading hardhat environment", function () {
      process.chdir(path.join(__dirname, "fixture-projects", "hardhat-defaults"));

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
      assert.equal(first.beacon, "0000000000000000000000000000000000000000000000000000000000000000");
    });

    it("Should use default inputBasePath and circuit name", function () {
      const first = this.hre.config.circom.circuits[0];
      assertPathIncludes(first.circuit, "/hardhat-defaults/circuits/hash.circom");
    });

    it("Should use default inputBasePath and input name", function () {
      const first = this.hre.config.circom.circuits[0];
      assertPathIncludes(first.input, "/hardhat-defaults/circuits/hash.json");
    });

    it("Applies default inputBasePath with required ptau name", function () {
      const { ptau } = this.hre.config.circom;
      assertPathIncludes(ptau, "/hardhat-defaults/circuits/pot15_final.ptau");
    });

    it("Should use default outputBasePath and wasm name", function () {
      const first = this.hre.config.circom.circuits[0];
      assertPathIncludes(first.wasm, "/hardhat-defaults/circuits/hash.wasm");
    });

    it("Should use default outputBasePath and zkey name", function () {
      const first = this.hre.config.circom.circuits[0];
      assertPathIncludes(first.zkey, "/hardhat-defaults/circuits/hash.zkey");
    });
  });

  describe("Test Overrides", function () {
    beforeEach("Loading hardhat environment", function () {
      process.chdir(path.join(__dirname, "fixture-projects", "hardhat-overrides"));

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
      assert.equal(first.beacon, "0000000005060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f");
    });

    it("Should override inputBasePath and circuit name", function () {
      const third = this.hre.config.circom.circuits[2];
      assertPathEqualsAbsolute(third.circuit, "/circuits/circuit.circom");
    });

    it("Should override inputBasePath and input name", function () {
      const third = this.hre.config.circom.circuits[2];
      assertPathEqualsAbsolute(third.input, "/circuits/input.json");
    });

    it("Applies override inputBasePath and with required ptau name", function () {
      const { ptau } = this.hre.config.circom;
      assertPathEqualsAbsolute(ptau, "/circuits/pot15_final.ptau");
    });

    it("Should override outputBasePath and wasm name", function () {
      const third = this.hre.config.circom.circuits[2];
      assertPathEqualsAbsolute(third.wasm, "/client/public/circuit.wasm");
    });

    it("Should override outputBasePath and r1cs name", function () {
      const third = this.hre.config.circom.circuits[2];
      assertPathEqualsAbsolute(third.r1cs, "/client/public/circuit.r1cs");
    });

    it("Should override outputBasePath and zkey name", function () {
      const third = this.hre.config.circom.circuits[2];
      assertPathEqualsAbsolute(third.zkey, "/client/public/circuit.zkey");
    });
  });
});
