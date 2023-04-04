# 项目介绍
hardhat-nft-market 是一个使用 Solidity 和 Hardhat 构建的智能合约项目。该合约实现了 NFT 的上架、下架、购买、价格更新、提款等功能。用户可以将自己的 NFT 上架到该合约中，并设置出售价格。其他用户可以在该合约中购买 NFT，购买成功后，卖家会收到相应的报酬。

# 合约地址
Sepolia：https://sepolia.etherscan.io/address/0x66F544A79CBfC9410D7Fb38E2BCa06260ff8366A

# 功能
1. listitem：上架nft
   - 检查nft是否授权
   - 状态变量nftListings添加上架nft信息
   - 合约emit上架事件，以便前端监控并展示
2. cencelitem：下架nft
   - 状态变量nftListings移除上架nft信息
   - 合约emit下架事件
3. buyitem：购买nft
   - 判断转账金额是否足够
   - 合约完成nft转让
   - 移除上架信息
   - 状态变量nftListings记录卖家进账
   - 合约emit卖出事件
4. updateprice：更新nft价格
5. withdraw：提款
   - 买家提款
   - 合约收取1%手续费
6. contractOwnerWithdraw：合约所有者提款
7. clearNotApprovedNft：移除状态过期的nft
   - 仅支持合约所有者调用。

# 注意事项
1. nft标准的approve方法只能调用一次，如果调用两次，第二次会覆盖第一次的授权
2. 当nft授权该合约后，可以私自在其他地方转移nft。
   - 当cencelitem、buyitem、updateprice调用失败时，可以交由前端记录判断，并确定是让用户重新授权还是调用清除状态过期nft。
   - 也可以在合约的自定义修饰符isNftOwner()里增加判断，看当前记录的owner是否与nft合约的owner一致。
3. 仅支持合约所有者清除nftListings中已不被授权的nft