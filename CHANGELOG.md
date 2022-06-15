# Changelog

### [3.2.1](https://www.github.com/projectsophon/hardhat-circom/compare/v3.2.0...v3.2.1) (2022-06-15)

### Bug Fixes

- Upgrade r1csfile ([#61](https://www.github.com/projectsophon/hardhat-circom/issues/61)) ([9c24c87](https://www.github.com/projectsophon/hardhat-circom/commit/9c24c87da3528bf41b66d50c9cd264b2155a6bc5))

## [3.2.0](https://www.github.com/projectsophon/hardhat-circom/compare/v3.1.0...v3.2.0) (2022-06-15)

### Features

- Implement circuit testing utilities ([#58](https://www.github.com/projectsophon/hardhat-circom/issues/58)) ([42af8ed](https://www.github.com/projectsophon/hardhat-circom/commit/42af8eda28e960d3a07bc9506b2e23f931462258))

## [3.1.0](https://www.github.com/projectsophon/hardhat-circom/compare/v3.0.2...v3.1.0) (2022-06-13)

### Features

- Download URL ptau file & store in cache directory ([#56](https://www.github.com/projectsophon/hardhat-circom/issues/56)) ([6f0ef17](https://www.github.com/projectsophon/hardhat-circom/commit/6f0ef176fd3de68ee711c8a06eb356db86b20a2c))

### [3.0.2](https://www.github.com/projectsophon/hardhat-circom/compare/v3.0.1...v3.0.2) (2022-04-20)

### Bug Fixes

- Print entirety of circom2 errors ([#47](https://www.github.com/projectsophon/hardhat-circom/issues/47)) ([669bfc7](https://www.github.com/projectsophon/hardhat-circom/commit/669bfc7bbcec8b3fcd6cf2a8978235e4d18acea1))

### [3.0.1](https://www.github.com/projectsophon/hardhat-circom/compare/v3.0.0...v3.0.1) (2022-03-17)

### Bug Fixes

- Log circom2 errors before throwing ([5ac4f79](https://www.github.com/projectsophon/hardhat-circom/commit/5ac4f798fc76f81f989a3509ba8499947874287d))
- Properly handle explicit circuit names w/ circom2 ([#44](https://www.github.com/projectsophon/hardhat-circom/issues/44)) ([5ac4f79](https://www.github.com/projectsophon/hardhat-circom/commit/5ac4f798fc76f81f989a3509ba8499947874287d))
- Use the circuit directory for virtual paths ([5ac4f79](https://www.github.com/projectsophon/hardhat-circom/commit/5ac4f798fc76f81f989a3509ba8499947874287d))

## [3.0.0](https://www.github.com/projectsophon/hardhat-circom/compare/v2.1.0...v3.0.0) (2022-03-16)

### ⚠ BREAKING CHANGES

- Drop node 14 support
- Implement circom2 compiler (#40)

### Features

- Default circom version to 2 ([d67af4e](https://www.github.com/projectsophon/hardhat-circom/commit/d67af4e5c69cb4867cfd9eee5d34aec712426ba2))
- Implement circom2 compiler ([#40](https://www.github.com/projectsophon/hardhat-circom/issues/40)) ([d67af4e](https://www.github.com/projectsophon/hardhat-circom/commit/d67af4e5c69cb4867cfd9eee5d34aec712426ba2))

### Bug Fixes

- Hijack stdout/stderr from circom2 ([d67af4e](https://www.github.com/projectsophon/hardhat-circom/commit/d67af4e5c69cb4867cfd9eee5d34aec712426ba2))

### Miscellaneous Chores

- Drop node 14 support ([d67af4e](https://www.github.com/projectsophon/hardhat-circom/commit/d67af4e5c69cb4867cfd9eee5d34aec712426ba2))

## [2.1.0](https://www.github.com/projectsophon/hardhat-circom/compare/v2.0.0...v2.1.0) (2022-03-11)

### Features

- Add debug output for proof.json & public.json ([#38](https://www.github.com/projectsophon/hardhat-circom/issues/38)) ([ecfd2f5](https://www.github.com/projectsophon/hardhat-circom/commit/ecfd2f5bd63cb063ed251e624f688f091acbe7dd))

## [2.0.0](https://www.github.com/projectsophon/hardhat-circom/compare/v1.2.0...v2.0.0) (2022-03-09)

### ⚠ BREAKING CHANGES

- Generate separate verifiers by default
- Remove circomlib since it is a consumer dependency

### Features

- Add `--circuit` CLI parameter to compile one circuit by name ([f75a306](https://www.github.com/projectsophon/hardhat-circom/commit/f75a3069d3c87cde20b4e22d872721416fd50aa6))
- Generate separate verifiers by default ([f75a306](https://www.github.com/projectsophon/hardhat-circom/commit/f75a3069d3c87cde20b4e22d872721416fd50aa6))
- Implement plonk protocol ([f75a306](https://www.github.com/projectsophon/hardhat-circom/commit/f75a3069d3c87cde20b4e22d872721416fd50aa6))
- PascalCase Verifier contract names ([f75a306](https://www.github.com/projectsophon/hardhat-circom/commit/f75a3069d3c87cde20b4e22d872721416fd50aa6))
- Update snarkjs ([#35](https://www.github.com/projectsophon/hardhat-circom/issues/35)) ([f75a306](https://www.github.com/projectsophon/hardhat-circom/commit/f75a3069d3c87cde20b4e22d872721416fd50aa6))
- Update snarkjs typescript bindings for plonk ([f75a306](https://www.github.com/projectsophon/hardhat-circom/commit/f75a3069d3c87cde20b4e22d872721416fd50aa6))
- Write wat output for debugging ([f75a306](https://www.github.com/projectsophon/hardhat-circom/commit/f75a3069d3c87cde20b4e22d872721416fd50aa6))

### Miscellaneous Chores

- Remove circomlib since it is a consumer dependency ([f75a306](https://www.github.com/projectsophon/hardhat-circom/commit/f75a3069d3c87cde20b4e22d872721416fd50aa6))

## [1.2.0](https://www.github.com/projectsophon/hardhat-circom/compare/v1.1.0...v1.2.0) (2021-10-24)

### Features

- Allow naming and exporting of verification key json ([#32](https://www.github.com/projectsophon/hardhat-circom/issues/32)) ([11b6dcc](https://www.github.com/projectsophon/hardhat-circom/commit/11b6dcc5218949a6b8ff6e278d10a60755366427))

## [1.1.0](https://www.github.com/projectsophon/hardhat-circom/compare/v1.0.1...v1.1.0) (2021-08-12)

### Features

- allow naming and exporting r1cs file ([#29](https://www.github.com/projectsophon/hardhat-circom/issues/29)) ([bcb5787](https://www.github.com/projectsophon/hardhat-circom/commit/bcb5787fc7a1acc0d60afd6aedcd8d53277fe5e8))

### [1.0.1](https://www.github.com/projectsophon/hardhat-circom/compare/v1.0.0...v1.0.1) (2021-05-03)

### Bug Fixes

- **ci:** Release workflow needed an id ([#21](https://www.github.com/projectsophon/hardhat-circom/issues/21)) ([e59f172](https://www.github.com/projectsophon/hardhat-circom/commit/e59f172187656054bb7a42bac421e3b1efef4368))
- Use a hex entropy value for non-detereministic beacon ([#28](https://www.github.com/projectsophon/hardhat-circom/issues/28)) ([3e0d352](https://www.github.com/projectsophon/hardhat-circom/commit/3e0d352d19cad0c3481cfc8da20411654ee40d24))

## 1.0.0 (2021-04-27)

### ⚠ BREAKING CHANGES

- Change config, refactors & docs (#13)
- refactor circomTemplate subtask to receive zkeys as args (#11)

### Features

- Add circom and snarkjs to hre & default our logger ([#9](https://www.github.com/projectsophon/hardhat-circom/issues/9)) ([6009112](https://www.github.com/projectsophon/hardhat-circom/commit/6009112f6cb56d6993ef701145b68cc66320181b))
- add TASK_CIRCOM_TEMPLATE which can be completely overriden for complex templating needs ([#6](https://www.github.com/projectsophon/hardhat-circom/issues/6)) ([c0b7662](https://www.github.com/projectsophon/hardhat-circom/commit/c0b7662456456215ab90cd6b54ba10b37e29547e))
- Change config, refactors & docs ([#13](https://www.github.com/projectsophon/hardhat-circom/issues/13)) ([895724c](https://www.github.com/projectsophon/hardhat-circom/commit/895724c733730146ee1d220480ee2c4421603d56))
- initial implementation ([8281fdd](https://www.github.com/projectsophon/hardhat-circom/commit/8281fddfb9a3d6d5410fca1328d3208be7123c89))

### Bug Fixes

- **ci:** Actually check the release was created ([#18](https://www.github.com/projectsophon/hardhat-circom/issues/18)) ([c634e04](https://www.github.com/projectsophon/hardhat-circom/commit/c634e047fc469cdb4c08dddb95b1d26ab22ecfaa))
- templating task wasnt writing on exit ([#12](https://www.github.com/projectsophon/hardhat-circom/issues/12)) ([31b50d7](https://www.github.com/projectsophon/hardhat-circom/commit/31b50d785ce1daf598c662044bf5f6907839f62e))

### Miscellaneous Chores

- refactor circomTemplate subtask to receive zkeys as args ([#11](https://www.github.com/projectsophon/hardhat-circom/issues/11)) ([afe23c2](https://www.github.com/projectsophon/hardhat-circom/commit/afe23c2a18b75300d3233bc680f7ffcb4d4d5345))
