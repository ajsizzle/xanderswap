// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";

contract Wallet is Ownable {
    using SafeMath for uint256;

    struct Token {
        bytes32 ticker;
        address tokenAddress;
    }
    // Point to Token struct.
    mapping(bytes32 => Token) public tokenMapping;
    // List of tokens to be traded/swapped.
    bytes32[] public tokenList;

    // Keep track of balances from multiple erc20 token addresses
    mapping(address => mapping(bytes32 => uint256)) public balances;

    // Check to make sure token exists
    modifier tokenExists(bytes32 ticker) {
        require(tokenMapping[ticker].tokenAddress != address(0), "Error: Token does not exist.");
        _;
    }

    function addToken(bytes32 ticker, address tokenAddress) onlyOwner external {
        tokenMapping[ticker] = Token(ticker, tokenAddress);
        tokenList.push(ticker);
    }

    function deposit(uint256 amount, bytes32 ticker) tokenExists(ticker) external {
        // Check balance
        require(balances[msg.sender][ticker] <= amount, "Error: Insufficient balance.");

        IERC20(tokenMapping[ticker].tokenAddress).transferFrom(msg.sender, address(this), amount);
        balances[msg.sender][ticker] = balances[msg.sender][ticker].add(amount);
    }

    function withdraw(uint256 amount, bytes32 ticker) tokenExists(ticker) external {
        // Check balance
        require(balances[msg.sender][ticker] >= amount, "Error: Insufficient balance.");

        balances[msg.sender][ticker] = balances[msg.sender][ticker].sub(amount);
        IERC20(tokenMapping[ticker].tokenAddress).transfer(msg.sender, amount);
    }
}
