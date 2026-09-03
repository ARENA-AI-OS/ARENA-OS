// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Test-only stand-in for a stablecoin like cNGN. Not part of the shipped contract.
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock cNGN", "mCNGN") {
        _mint(msg.sender, 1_000_000 ether);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
