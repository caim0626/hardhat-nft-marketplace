// 对nftMarket.sol的测试
const { assert, expect } = require("chai");
const { BigNumber } = require("ethers");
const { deployments, ethers, getNamedAccounts } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("NftMarket", function () {
          let nftMarket,
              nftMarketwithUser,
              chibiNft,
              chibiNftwithUser,
              vrfCoordinatorV2Mock,
              deployer,
              user,
              namedAccounts;

          before(async function () {
              await deployments.fixture(["all"]);
              namedAccounts = await getNamedAccounts();
              const signers = await ethers.getSigners();
              deployer = namedAccounts.deployer;
              //   console.log(namedAccounts);
              //   console.log(signers[0]);
              nftMarket = await ethers.getContract("NftMarket");
              chibiNft = await ethers.getContract("ChibiNft");
              vrfCoordinatorV2Mock = await ethers.getContract(
                  "VRFCoordinatorV2Mock"
              );
              user = signers[1].address;

              // nftMarket连接的是deployer，chibiNftwithUser连接的是user。chibinft同理。
              nftMarketwithUser = nftMarket.connect(signers[1]);

              //   mint两个nft，token0授权，token1不授权
              chibiNftwithUser = chibiNft.connect(signers[1]);
              const fee = await chibiNftwithUser.getMintFee();
              for (let i = 0; i < 2; i++) {
                  const response = await chibiNftwithUser.RequestNft({
                      value: fee,
                  });
                  const receipt = await response.wait(1);
                  await vrfCoordinatorV2Mock.fulfillRandomWords(
                      receipt.events[1].args.requestId,
                      chibiNftwithUser.address
                  );
              }
              chibiNftwithUser.approve(nftMarketwithUser.address, 0);
          });

          //   对项目里contracts的NftMarket.sol的listItem()方法测试
          describe("listItem()", function () {
              it("成功上架，调用nftListings需要返回一个tokenid值为0、owner地址为：user", async function () {
                  await nftMarketwithUser.listItem(
                      chibiNftwithUser.address,
                      0,
                      ethers.utils.parseEther("1")
                  );
                  const { owner: nftOwner, price } =
                      await nftMarketwithUser.nftListings(
                          chibiNftwithUser.address,
                          0
                      );
                  assert.equal(nftOwner, user);
                  console.log(price);
                  console.log(ethers.utils.parseEther("1"));
                  assert.equal(
                      price.toString(),
                      ethers.utils.parseEther("1").toString()
                  );
              });
              it("上架失败，tokenid不存在", async function () {
                  await expect(
                      nftMarketwithUser.listItem(
                          chibiNft.address,
                          2,
                          ethers.utils.parseEther("1")
                      )
                  ).to.be.revertedWith("ERC721: invalid token ID");
              });
              it("上架失败，用户没授权", async function () {
                  await expect(
                      nftMarketwithUser.listItem(
                          chibiNft.address,
                          1,
                          ethers.utils.parseEther("1")
                      )
                  ).to.be.revertedWithCustomError(
                      nftMarketwithUser,
                      "NftMarket__NotApproved"
                  );
              });
              it("上架失败，价格为0", async function () {
                  await expect(
                      nftMarketwithUser.listItem(
                          chibiNftwithUser.address,
                          0,
                          ethers.utils.parseEther("0")
                      )
                  ).to.be.revertedWithCustomError(
                      nftMarketwithUser,
                      "NftMarket__PriceZero"
                  );
              });
          });
          describe("cencelItem", async function () {
              it("成功下架,释放event,mapping状态已更新", async function () {
                  const tx = await nftMarketwithUser.cencelItem(
                      chibiNftwithUser.address,
                      0
                  );
                  const receipt = await tx.wait();
                  assert.equal(receipt.events[0].event, "cencelItemEvent");
                  const { owner } = await nftMarketwithUser.nftListings(
                      chibiNftwithUser.address,
                      0
                  );
                  assert.equal(owner, ethers.constants.AddressZero);
              });
          });
      });
