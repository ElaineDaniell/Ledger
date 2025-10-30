import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedLedger = await deploy("Ledger", {
    from: deployer,
    log: true,
  });

  console.log(`Ledger contract: `, deployedLedger.address);
};
export default func;
func.id = "deploy_ledger"; // id required to prevent reexecution
func.tags = ["Ledger"];

