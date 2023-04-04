// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "hardhat/console.sol";

error ChibiNft__NotenoughMintfee(uint256, uint256);
error ChibiNft__getEnumChibi(uint256);
error ChibiNft__withdraw();

contract ChibiNft is ERC721URIStorage, VRFConsumerBaseV2, Ownable {
    // event
    event NftRequested(uint256 indexed requestId, address requester);
    event NftMinted(Chibi chibi, address minter);

    // type
    enum Chibi {
        SR_CHIBI,
        N_CHIBI
    }

    // VRFvariables
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint256 private immutable mint_fee;
    // 只有一个值，30 gwei Key i_gasLane
    bytes32 private immutable i_gasLane;
    // 如果严格遵循去中心化，请求随机数的fee应该由用户支付。
    uint64 private s_subId;
    // hardcore，至少经过3个区块确认。
    uint16 private constant requestConfirmations = 3;
    // 回调fulfillRandomWords预支付的gas上限，存储每个词大约需要20,000 gas
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant numWords = 1;

    // 记录requestId与对应的minter。用于回调函数时制造nft。
    mapping(uint256 => address) public s_requestIdToSender;

    //NFTVariables
    uint256 private s_tokenCounter;
    string[] internal s_chibiURIs;
    uint256 private constant MAXRANDOMVALUE = 100;

    constructor(
        address vrfCoordinatorV2,
        uint64 _s_subId,
        bytes32 gasLane, // keyHash
        uint256 _mint_fee,
        uint32 callbackGasLimit,
        string[2] memory _chibiURIs
    ) VRFConsumerBaseV2(vrfCoordinatorV2) ERC721("RandomnCHIBI", "NKO") {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        mint_fee = _mint_fee;
        s_subId = _s_subId;
        s_tokenCounter = 0;
        s_chibiURIs = _chibiURIs;
        i_gasLane = gasLane;
        i_callbackGasLimit = callbackGasLimit;
    }

    // 向vrfCoordinatorv2请求随机数，随后等它调用fulfillRandomWords
    function RequestNft() public payable returns (uint256 requestId) {
        if (msg.value < mint_fee) {
            revert ChibiNft__NotenoughMintfee(msg.value, mint_fee);
        }
        requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            s_subId,
            requestConfirmations,
            i_callbackGasLimit,
            numWords
        );
        s_requestIdToSender[requestId] = msg.sender;
        emit NftRequested(requestId, msg.sender);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomwords) internal override {
        address minner = s_requestIdToSender[requestId];
        uint256 newItemId = s_tokenCounter;
        s_tokenCounter = s_tokenCounter + 1;
        uint256 mod = randomwords[0] % MAXRANDOMVALUE;
        Chibi mintChibi = getEnumChibi(mod);
        _safeMint(minner, newItemId);
        _setTokenURI(newItemId, s_chibiURIs[uint256(mintChibi)]);
        emit NftMinted(mintChibi, minner);
    }

    function getEnumChibi(uint256 mod) internal pure returns (Chibi) {
        uint256 cumulativeSum = 0;
        uint256[2] memory probabilityArray = getProbabilityArray();
        for (uint256 i = 0; i < probabilityArray.length; i++) {
            if (mod >= cumulativeSum && mod < probabilityArray[i]) {
                return Chibi(i);
            }
            cumulativeSum = probabilityArray[i];
        }
        revert ChibiNft__getEnumChibi(mod);
    }

    function withdraw() public payable onlyOwner {
        if (address(this).balance <= 0) {
            revert ChibiNft__withdraw();
        }
        payable(msg.sender).transfer(address(this).balance);
    }

    function getProbabilityArray() public pure returns (uint256[2] memory) {
        return [10, MAXRANDOMVALUE];
    }

    function getChibiTokenUris(uint256 index) public view returns (string memory) {
        return s_chibiURIs[index];
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }

    function getMintFee() public view returns (uint256) {
        return mint_fee;
    }

    // 这是个测试用的函数，当subId没有link代币时，更新用其他subId。
    // 这种写法不合规，当合约内部变量更新时，需要一个event让外界可以检测。具体问题参考：https://github.com/crytic/slither/wiki/Detector-Documentation#missing-zero-address-validation
    // function setSubId(uint64 _id) public onlyOwner {
    //     s_subId = _id;
    // }

    // function getSubId() public view returns (uint64) {
    //     return s_subId;
    // }

    receive() external payable {
        RequestNft();
    }
}
