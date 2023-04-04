# NftMarket.sol
## 功能：
1. listitem：上架让用户授权 nft 给合约，并释放上架 event，让前端监并展示
2. cencelitem：下架nft,释放下架event
3. buyitem：购买，接收买家设定金额，记录卖家进账，完成 nft 转让，emit卖出 event
4. updateprice: 更新价格
5. withdraw：提款，买家提款，收取 1%手续。
6. contractOwnerWithdraw：提款，合约所有者提取合约拥有的金额。