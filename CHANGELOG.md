# Changelog

## [1.1.0](https://www.github.com/projectsophon/hardhat-circom/compare/v1.0.1...v1.1.0) (2021-08-12)


### Features

* allow naming and exporting r1cs file ([#29](https://www.github.com/projectsophon/hardhat-circom/issues/29)) ([bcb5787](https://www.github.com/projectsophon/hardhat-circom/commit/bcb5787fc7a1acc0d60afd6aedcd8d53277fe5e8))

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
