const Dex = artifacts.require('Dex');
const testLink = artifacts.require('testLink');
const truffleAssert = require('truffle-assertions');

contract('Dex', (accounts) => {
    it('should only be possible for owner to add tokens', async () => {
        let dex = await Dex.deployed();
        let tlink = await testLink.deployed();
        await truffleAssert.passes(
            dex.addToken(web3.utils.fromUtf8('tLINK'), tlink.address, {
                from: accounts[0],
            })
        );
        await truffleAssert.reverts(
            dex.addToken(web3.utils.fromUtf8('tLINK'), tlink.address, {
                from: accounts[1],
            })
        );
    });
    it('should handle deposits correctly', async () => {
        let dex = await Dex.deployed();
        let tlink = await testLink.deployed();
        await tlink.approve(dex.address, 500);
        await dex.deposit(100, web3.utils.fromUtf8('tLINK'));
        let balance = await dex.balances(
            accounts[0],
            web3.utils.fromUtf8('tLINK')
        );
        assert.equal(balance.toNumber(), 100);
    });
    it('should handle faulty withdrawals correctly', async () => {
        let dex = await Dex.deployed();
        let tlink = await testLink.deployed();
        await truffleAssert.reverts(
            dex.withdraw(500, web3.utils.fromUtf8('tLINK'))
        );
    });
    it('should handle truthy withdrawals correctly', async () => {
        let dex = await Dex.deployed();
        let tlink = await testLink.deployed();
        await truffleAssert.passes(
            dex.withdraw(100, web3.utils.fromUtf8('tLINK'))
        );
    });
});
