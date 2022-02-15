const testLink = artifacts.require('testLink');
const Wallet = artifacts.require('Wallet');

module.exports = async function (deployer) {
    await deployer.deploy(testLink);
    let wallet = await Wallet.deployed();
    let tlink = await testLink.deployed();
    await tlink.approve(wallet.address, 500);
    await wallet.addToken(web3.utils.fromUtf8('tLINK'), tlink.address);
    await wallet.deposit(100, web3.utils.fromUtf8('tLINK'));
    let balance_of_tlink = await wallet.balances(
        accounts[0],
        web3.utils.fromUtf8('tLINK')
    );
    console.log(balance_of_tlink);
};
