const { network, ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts }) => {
    const { deployer, user1 } = await getNamedAccounts();
    const chainId = network.config.chainId;

    // // Basic NFT
    // const basicNft = await ethers.getContract("BasicNft", deployer)
    // const basicMintTx = await basicNft.mintNft()
    // await basicMintTx.wait(1)
    // console.log(`Basic NFT index 0 tokenURI: ${await basicNft.tokenURI(0)}`)

    // // Dynamic SVG  NFT
    // const highValue = ethers.utils.parseEther("4000")
    // const dynamicSvgNft = await ethers.getContract("DynamicSvgNft", deployer)
    // const dynamicSvgNftMintTx = await dynamicSvgNft.mintNft(highValue)
    // await dynamicSvgNftMintTx.wait(1)
    // console.log(`Dynamic SVG NFT index 0 tokenURI: ${await dynamicSvgNft.tokenURI(0)}`)

    // Random IPFS NFT
    const ChibiNft = await ethers.getContract("ChibiNft", user1);
    const mintFee = await ChibiNft.getMintFee();
    const ChibiNftMintTx = await ChibiNft.RequestNft({
        value: mintFee.toString(),
        gasLimit: 2100000,
    });
    const ChibiNftMintTxReceipt = await ChibiNftMintTx.wait(1);
    // Need to listen for response
    await new Promise(async (resolve, reject) => {
        setTimeout(
            () => reject("Timeout: 'NFTMinted' event did not fire"),
            2100000
        ); // 5 minute timeout time
        // setup listener for our event
        ChibiNft.once("NftMinted", async () => {
            console.log(
                `Random IPFS NFT index 0 tokenURI: ${await ChibiNft.tokenURI(
                    0
                )}`
            );
            resolve();
        });
        if (chainId == 31337) {
            const requestId =
                ChibiNftMintTxReceipt.events[1].args.requestId.toString();
            const vrfCoordinatorV2Mock = await ethers.getContract(
                "VRFCoordinatorV2Mock",
                deployer
            );
            await vrfCoordinatorV2Mock.fulfillRandomWords(
                requestId,
                ChibiNft.address
            );
        }
    });
};
module.exports.tags = ["mint"];
