// 对nftMarket.sol的测试
const { assert, expect } = require("chai");
const { deployments, ethers, getNamedAccounts } = require("hardhat");
// const { it } = require("node:test");
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
              signers,
              namedAccounts;

          beforeEach(async function () {
              await deployments.fixture(["all"]);
              namedAccounts = await getNamedAccounts();
              signers = await ethers.getSigners();
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
              it("上架失败，不是nft持有者", async function () {
                  const nftMarketwithUser2 = nftMarket.connect(signers[2]);
                  await expect(
                      nftMarketwithUser2.listItem(
                          chibiNft.address,
                          0,
                          ethers.utils.parseEther("1")
                      )
                  ).to.be.revertedWithCustomError(
                      nftMarketwithUser2,
                      "NftMarket__NotNftOwner"
                  );
              });
          });
          describe("cencelItem", async function () {
              beforeEach(async function () {
                  // 上架一个token0
                  await nftMarketwithUser.listItem(
                      chibiNftwithUser.address,
                      0,
                      ethers.utils.parseEther("1")
                  );
              });
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
              it("下架失败，nft不在mapping中", async function () {
                  await expect(
                      nftMarketwithUser.cencelItem(chibiNftwithUser.address, 1)
                  ).to.be.revertedWithCustomError(
                      nftMarketwithUser,
                      "NftMarket__NotListingItem"
                  );
              });
          });

          describe("buyItem", async function () {
              beforeEach(async function () {
                  // user1上架token0
                  await nftMarketwithUser.listItem(
                      chibiNftwithUser.address,
                      0,
                      ethers.utils.parseEther("1")
                  );
              });
              it("购买失败，value小于价格", async function () {
                  // user2购买
                  const nftMarketwithUser2 = nftMarket.connect(signers[2]);
                  await expect(
                      nftMarketwithUser2.buyItem(chibiNft.address, 0, {
                          value: ethers.utils.parseEther("0.9"),
                      })
                  ).to.be.revertedWithCustomError(
                      nftMarketwithUser2,
                      "NftMarket__NotEnoughValue"
                  );
              });
              it("成功购买，释放购买成功事件，mapping移除nft信息，完成mapping账户余额记录", async function () {
                  // user2购买
                  const nftMarketwithUser2 = nftMarket.connect(signers[2]);
                  const tx = await nftMarketwithUser2.buyItem(
                      chibiNft.address,
                      0,
                      { value: ethers.utils.parseEther("1") }
                  );
                  const receipt = await tx.wait();

                  //   事件释放
                  assert.equal(receipt.events[1].event, "boughtEvent");
                  const { owner } = await nftMarketwithUser.nftListings(
                      chibiNftwithUser.address,
                      0
                  );

                  //   mapping移除nft信息
                  assert.equal(owner, ethers.constants.AddressZero);

                  //   mapping user1余额记录
                  const balance = await nftMarketwithUser.sellerBalances(user);
                  assert.equal(
                      balance.toString(),
                      ethers.utils.parseEther("1").toString()
                  );
              });
          });

          describe("updatePrice", async function () {
              beforeEach(async function () {
                  // 上架一个token0
                  await nftMarketwithUser.listItem(
                      chibiNftwithUser.address,
                      0,
                      ethers.utils.parseEther("1")
                  );
              });
              it("成功更新价格", async function () {
                  // user1更新价格
                  await nftMarketwithUser.updatePrice(
                      chibiNftwithUser.address,
                      0,
                      ethers.utils.parseEther("2")
                  );

                  //   获取mapping中的价格
                  const { price } = await nftMarketwithUser.nftListings(
                      chibiNftwithUser.address,
                      0
                  );
                  assert.equal(
                      price.toString(),
                      ethers.utils.parseEther("2").toString()
                  );
              });
          });

          describe("withdraw", async function () {
              beforeEach(async function () {
                  // 上架一个token0
                  await nftMarketwithUser.listItem(
                      chibiNftwithUser.address,
                      0,
                      ethers.utils.parseEther("1")
                  );

                  // user2购买
                  const nftMarketwithUser2 = nftMarket.connect(signers[2]);
                  await nftMarketwithUser2.buyItem(chibiNft.address, 0, {
                      value: ethers.utils.parseEther("1"),
                  });
              });
              it("提现失败，mapping账户余额为0", async function () {
                  // user2提现
                  const nftMarketwithUser2 = nftMarket.connect(signers[2]);
                  await expect(
                      nftMarketwithUser2.withdraw()
                  ).to.be.revertedWithCustomError(
                      nftMarketwithUser2,
                      "NftMarket__NoBalance"
                  );
              });

              it("成功提现，mapping账户余额清0，提取后=提取前+（余额/100*99）-gas", async function () {
                  // 获取提现前的余额
                  const balanceBefore = await ethers.provider.getBalance(user);
                  //   获取提现前的mapping余额
                  const balanceMappingBefore =
                      await nftMarketwithUser.sellerBalances(user);

                  // user1提现
                  const tx = await nftMarketwithUser.withdraw();
                  const gasPrice = tx.gasPrice;
                  const receipt = await tx.wait();
                  const ethCost = receipt.gasUsed.mul(gasPrice);

                  //   断言提取后=提取前+（余额/100*99）-gas
                  assert.equal(
                      (await ethers.provider.getBalance(user)).toString(),
                      balanceBefore
                          .add(balanceMappingBefore.div(100).mul(99))
                          .sub(ethCost)
                          .toString()
                  );
              });
          });
          describe("contractOwnerWithdraw", async function () {
              beforeEach(async function () {
                  await signers[0].sendTransaction({
                      to: nftMarket.address,
                      value: ethers.utils.parseEther("1"),
                  });
              });
              it("提现失败，非合约所有者", async function () {
                  await expect(
                      nftMarketwithUser.contractOwnerWithdraw()
                  ).to.be.rejectedWith("Ownable: caller is not the owner");
              });
              it("提现成功,提取后=提取前+合约-gas", async function () {
                  const contractBefore = await ethers.provider.getBalance(
                      nftMarket.address
                  );
                  const balanceBefore = await signers[0].getBalance();
                  const tx = await nftMarket.contractOwnerWithdraw();
                  const gasPrice = tx.gasPrice;
                  const receipt = await tx.wait();
                  const ethCost = receipt.gasUsed.mul(gasPrice);
                  assert.equal(
                      (await signers[0].getBalance()).toString(),
                      balanceBefore.add(contractBefore).sub(ethCost).toString()
                  );
              });
          });

          describe("clearNotApprovedNft", async function () {
              beforeEach(async function () {
                  // 授权nft
                  await chibiNftwithUser.approve(nftMarket.address, 0);
                  // 上架一个token0
                  await nftMarketwithUser.listItem(
                      chibiNftwithUser.address,
                      0,
                      ethers.utils.parseEther("1")
                  );
              });
              it("清除已不被授权的nft", async function () {
                  // 取消授权
                  await chibiNftwithUser.approve(
                      ethers.constants.AddressZero,
                      0
                  );

                  //   调用clear方法，断言mapping中的nft已被清除
                  await nftMarket.clearNotApprovedNft(
                      chibiNftwithUser.address,
                      0
                  );
                  assert.equal(
                      (
                          await nftMarketwithUser.nftListings(
                              chibiNftwithUser.address,
                              0
                          )
                      ).owner,
                      ethers.constants.AddressZero
                  );
              });
              it("nft已授权，revert", async function () {
                  await expect(
                      nftMarket.clearNotApprovedNft(chibiNftwithUser.address, 0)
                  ).to.be.revertedWithCustomError(
                      nftMarket,
                      "NftMarket__IsApproved"
                  );
              });
          });
      });
