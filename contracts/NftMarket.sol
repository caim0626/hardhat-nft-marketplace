// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/*

*/

/*
功能：
功能：
1、listitem，上架
    让用户授权 nft 给合约，并 emit 上架 event，让前端监控并展示
2、cencelitem 下架
    取消授权，emit 下架 event
3、buyitem 购买
    接收买家设定金额，记录卖家进账，完成 nft 转让，emit 卖出 event
4、updateprice: 更新价格
5、withdraw 提款
    买家提款，收取 1%手续。只实现全额提取。
6、contractOwnerWithdraw 提款
    合约所有者提款
注意：
    1、nft标准的aprove方法只能调用一次，如果调用两次，第二次会覆盖第一次的授权
    2、当nft授权该合约后，可以私自在其他地方转移nft，所以在cencel、buy方法中需要再次判断nft的所有者是否是当前用户。
    2.1、在设置下架时，如果发现nft的所有者不是当前用户，可以nft合约信息与当前合约信息进行比对，如果不一致，说明nft已经被转移，可以删除nft的信息。
 */

error NftMarket__NotNftOwner();
error NftMarket__NotEnoughValue(uint256 value, uint256 price);
error NftMarket__NotApproved();
error NftMarket__NotListingItem();
error NftMarket__NoBalance();
error NftMarket__withdrawCallfailure();
error NftMarket__PriceZero();

contract NftMarket is Ownable {
    struct nftOwner {
        address owner;
        uint256 price;
    }
    mapping(address => mapping(uint256 => nftOwner)) public nftListings;
    mapping(address => uint256) public sellerBalances;

    event listItemEvent(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    event boughtEvent(
        address indexed buyer,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    event updatePriceEvent(
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    event cencelItemEvent(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId
    );

    modifier isNftOwner(address nftAddress, uint256 tokenId) {
        address owner = IERC721(nftAddress).ownerOf(tokenId);
        if (owner != msg.sender) {
            revert NftMarket__NotNftOwner();
        }
        _;
    }

    modifier isListed(address nftAddress, uint256 tokenId) {
        nftOwner memory nft = nftListings[nftAddress][tokenId];
        if (nft.owner == address(0)) {
            revert NftMarket__NotListingItem();
        }
        _;
    }

    function listItem(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    ) public isNftOwner(nftAddress, tokenId) {
        if (price <= 0) {
            revert NftMarket__PriceZero();
        }
        IERC721 nft = IERC721(nftAddress);
        if (nft.getApproved(tokenId) != address(this)) {
            revert NftMarket__NotApproved();
        }
        nftListings[nftAddress][tokenId] = nftOwner(msg.sender, price);
        emit listItemEvent(msg.sender, nftAddress, tokenId, price);
    }

    function cencelItem(
        address nftAddress,
        uint256 tokenId
    ) public isNftOwner(nftAddress, tokenId) isListed(nftAddress, tokenId) {
        delete nftListings[nftAddress][tokenId];
        emit cencelItemEvent(msg.sender, nftAddress, tokenId);
    }

    function buyItem(
        address nftAddress,
        uint256 tokenId
    ) public payable isListed(nftAddress, tokenId) {
        nftOwner memory nft = nftListings[nftAddress][tokenId];
        if (msg.value < nft.price) {
            revert NftMarket__NotEnoughValue(msg.value, nft.price);
        }
        IERC721(nftAddress).safeTransferFrom(nft.owner, msg.sender, tokenId);
        delete nftListings[nftAddress][tokenId];
        sellerBalances[nft.owner] += msg.value;
        emit boughtEvent(msg.sender, nftAddress, tokenId, msg.value);
    }

    function updatePrice(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    ) public isListed(nftAddress, tokenId) isNftOwner(nftAddress, tokenId) {
        nftListings[nftAddress][tokenId].price = price;
        emit updatePriceEvent(nftAddress, tokenId, price);
    }

    function withdraw() public payable {
        uint256 balance = sellerBalances[msg.sender];
        if (balance <= 0) {
            revert NftMarket__NoBalance();
        }
        sellerBalances[msg.sender] = 0;
        // payable(msg.sender).transfer((balance / 100) * 99);
        (bool success, ) = payable(msg.sender).call{
            value: (balance / 100) * 99
        }("");
        if (!success) {
            revert NftMarket__withdrawCallfailure();
        }
    }

    function contractOwnerWithdraw() public payable onlyOwner {
        uint256 balance = address(this).balance;
        payable(msg.sender).transfer(balance);
    }
}
