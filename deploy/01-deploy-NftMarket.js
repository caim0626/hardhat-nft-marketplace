const { network } = require("hardhat");
const {
    networkConfig,
    developmentChains,
} = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();

    const nftMarket = await deploy("NftMarket", {
        from: deployer,
        args: [],
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });
    if (networkConfig[network.name]) {
        await verify(nftMarket.address, [
            networkConfig[network.name].ethUsdPriceFeed,
        ]);
    }

    // 验证
    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        log("Verifying...");
        await verify(nftMarket.address, []);
    }
};
module.exports.tags = ["all", "NftMarket", "main"];
