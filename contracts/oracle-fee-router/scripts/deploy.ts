import { ethers } from "hardhat";

/**
 * Deploys OracleFeeRouter to whatever network `--network` selects.
 * FEE_TREASURY_ADDRESS in .env.local sets the initial treasury; defaults
 * to the deployer's own address if unset (fine for a testnet deploy,
 * change before anything resembling production).
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const treasury = process.env.FEE_TREASURY_ADDRESS || deployer.address;

  console.log("Deployer:", deployer.address);
  console.log("Fee treasury:", treasury);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");
  if (balance === 0n) {
    throw new Error("Deployer has zero balance — fund it before deploying.");
  }

  const Router = await ethers.getContractFactory("OracleFeeRouter");
  const router = await Router.deploy(treasury);
  await router.waitForDeployment();

  const address = await router.getAddress();
  const tx = router.deploymentTransaction();
  console.log("OracleFeeRouter deployed to:", address);
  console.log("Deployment tx:", tx?.hash);
  console.log(`Explorer: https://sepolia.basescan.org/address/${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
