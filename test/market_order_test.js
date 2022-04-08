const Dex = artifacts.require('Dex');
const testLink = artifacts.require('testLink');
const truffleAssert = require('truffle-assertions');

contract('Dex', (accounts) => {
  it('Should throw an error when creating a sell market order without enough tokens for trade', async () => {
    let dex = await Dex.deployed();

    let balance = await dex.balances(accounts[0], web3.utils.fromUtf8('tLINK'));
    truffleAssert.equal(
      balance.toNumber(),
      0,
      'Initial tLINK balance is not 0'
    );

    await truffleAssert.reverts(
      dex.createMarketOrder(1, web3.utils.fromUtf8('tLINK'), 10)
    );
  });

  it('Should throw an error when creating a buy market order without enough ETH token balance', async () => {
    let dex = await Dex.deployed();

    let balance = await dex.balances(accounts[0], web3.utils.fromUtf8('ETH'));
    assert.equal(balance.toNumber(), 0, 'Initial ETH balance is not 0');

    await truffleAssert.reverts(
      dex.createMarketOrder(0, web3.utils.fromUtf8('tLINK'), 10)
    );
  });

  it('Market orders can be submitted even if the order book is empty', async () => {
    let dex = await Dex.deployed();

    await dex.depositEth({ value: 10000 });

    let orderBook = await dex.getOrderBook(web3.utils.fromUtf8('tLINK'), 0); // get buy side orderbook
    assert(orderBook.length == 0, 'Buy side Orderbook length is not 0');

    await truffleAssert.passes(
      dex.createMarketOrder(0, web3.utils.fromUtf8('tLINK'), 10)
    );
  });
  // Market orders should be filled until the order book is empty OR the market order is 100% filled
  it('Market orders should not fill more limit orders than the market order amount', async () => {
    let dex = await Dex.deployed();
    let testlink = await testLink.deployed();

    let orderbook = await dex.getOrderBook(web3.utils.fromUtf8('tLINK'), 1); // get sell side orderbook
    assert(
      orderbook.length == 0,
      'sell side orderbook should be empty at start of test'
    );

    await dex.addToken(web3.utils.fromUtf8('tLINK'), testlink.address);

    // Send tLINK tokens to accounts 1, 2, 3 from account 0
    await testlink.transfer(accounts[1], 50);
    await testlink.transfer(accounts[2], 50);
    await testlink.transfer(accounts[3], 50);

    // let balance = await testlink.balanceOf(accounts[1]);
    // console.log(balance.toNumber());

    // Approve DEX for accounts 1, 2, 3
    await testlink.approve(dex.address, 50, { from: accounts[1] });
    await testlink.approve(dex.address, 50, { from: accounts[2] });
    await testlink.approve(dex.address, 50, { from: accounts[3] });

    // Deposit tLINK into DEX for accounts 1, 2, 3
    await dex.deposit(50, web3.utils.fromUtf8('tLINK'), { from: accounts[1] });
    await dex.deposit(50, web3.utils.fromUtf8('tLINK'), { from: accounts[2] });
    await dex.deposit(50, web3.utils.fromUtf8('tLINK'), { from: accounts[3] });

    // Fill up sell order book
    await dex.createLimitOrder(1, web3.utils.fromUtf8('tLINK'), 5, 300, {
      from: accounts[1],
    });
    await dex.createLimitOrder(1, web3.utils.fromUtf8('tLINK'), 5, 400, {
      from: accounts[2],
    });
    await dex.createLimitOrder(1, web3.utils.fromUtf8('tLINK'), 5, 500, {
      from: accounts[3],
    });

    // Create market order that should fill 2/3 orders in the book
    await dex.createMarketOrder(0, web3.utils.fromUtf8('tLINK'), 10);

    orderbook = await dex.getOrderBook(web3.utils.fromUtf8('tLINK'), 1); // Get sell side orderbook
    assert(
      orderbook.length == 1,
      'Sell side orderbook should only have 1 order left'
    );
    assert(orderbook[0].filled == 0, 'Sell side order should have 0 filled');
  });

  // Market orders should be filled until the order book is empty OR the market order is 100% filled
  it('Market orders should be filled until the order book is empty', async () => {
    let dex = await Dex.deployed();

    let orderbook = await dex.getOrderBook(web3.utils.fromUtf8('tLINK'), 1); // Get sell side orderbook
    assert(
      orderbook.length == 1,
      'Sell side Orderbook should have 1 order left'
    );

    // Fill up the sell order book again
    await dex.createLimitOrder(1, web3.utils.fromUtf8('tLINK'), 5, 400, {
      from: accounts[1],
    });
    await dex.createLimitOrder(1, web3.utils.fromUtf8('tLINK'), 5, 500, {
      from: accounts[2],
    });

    // check buyer tLINK balance before tLINK purchase
    let balanceBefore = await dex.balances(
      accounts[0],
      web3.utils.fromUtf8('tLINK')
    );

    // Create market order that could fill more than the entire order book (15 tLINK)
    await dex.createMarketOrder(0, web3.utils.fromUtf8('tLINK'), 50);

    // create buyer tLINK balance after tLINK purchase
    let balanceAfter = await dex.balances(
      accounts[0],
      web3.utils.fromUtf8('tLINK')
    );

    // Buyer should have 15 more link after, even though order was for 50.
    assert.equal(balanceBefore + 15, balanceAfter);
  });

  // The ETH balance of the buyer should decrease with the filled amount
  it('The ETH balance of the buyer should decrease with the filled amount', async () => {
    let dex = await Dex.deployed();
    let testlink = await testLink.deployed();

    // Seller deposits tLINK and creates a sell limit order for 1 tLINK for 300 wei
    await testlink.approve(dex.address, 500, { from: accounts[1] });
    await createLimitOrder(1, web3, utils.fromUtf8('tLINK'), 1, 300, {
      from: accounts[1],
    });

    // Check buyer ETH balance before trade
    let balanceBefore = await dex.balances(
      accounts[0],
      web3.utils.fromUtf8('ETH')
    );
    await dex.createMarketOrder(0, web3.utils.fromUtf8('tLINK'), 1);
    let balanceAfter = await dex.balances(
      accounts[0],
      web3.utils.fromUtf8('ETH')
    );

    assert.equal(balanceBefore - 300, balanceAfter);
  });

  // The token balances of the limit order sellers should decrease with the filled amounts.
  it('The token balances of the limit order sellers should decrease with the filled amounts.', async () => {
    let dex = await Dex.deployed();
    let testlink = await testLink.deployed();

    let orderbook = await dex.getOrderBook(web3.utils.fromUtf8('tLINK'), 1); // Get sell side order
    assert(
      orderbook.length == 0,
      'Sell side Orderbook should be empty at the start of the test'
    );

    // Seller account[1] already approved and deposited tLINK

    // Seller account[2] deposits tLINK
    await testlink.approve(dex.address, 500, { from: accounts[2] });
    await dex.deposit(100, web3.utils.fromUtf8('tLINK'), { from: accounts[2] });

    await dex.createLimitOrder(1, web3.utils.fromUtf8('tLINK'), 1, 300, {
      from: accounts[1],
    });
    await dex.createLimitOrder(1, web3.utils.fromUtf8('tLINK'), 1, 400, {
      from: accounts[2],
    });

    // Check sellers tLINK balances before trade
    let account1balanceBefore = await dex.balances(
      accounts[1],
      web3.utils.fromUtf8('tLINK')
    );
    let account2balanceBefore = await dex.balances(
      accounts[2],
      web3.utils.fromUtf8('tLINK')
    );

    // Account[0] created market order to buy up both sell orders
    await dex.createMarketOrder(0, web3.utils.fromUtf8('tLINK'), 2);

    // Check sellers tLINK balances after trade
    let account1balanceAfter = await dex.balances(
      accounts[1],
      web3.utils.fromUtf8('tLINK')
    );
    let account2balanceAfter = await dex.balances(
      accounts[2],
      web3.utils.fromUtf8('tLINK')
    );

    assert.equal(account1balanceBefore - 1, account1balanceAfter);
    assert.equal(account2balanceBefore - 1, account2balanceAfter);
  });

  // Filled limit orders should be removed from the orderbook
  it('Filled limit orders should be removed from the orderbook', async () => {
    let dex = await Dex.deployed();

    let orderbook = await dex.getOrderBook(web3.utils.fromUtf8('tLINK'), 1); // Get sell side order
    assert(
      orderbook.length == 0,
      'Sell side Orderbook should be empty at start of test'
    );

    await dex.createLimitOrder(1, web3.utils.fromUtf8('tLINK'), 1, 300, {
      from: accounts[1],
    });
    await dex.createMarketOrder(0, web3.utils.fromUtf8('tLINK'), 1);

    orderbook = await dex.getOrderBook(web3.utils.fromUtf8('tLINK'), 1); // Get sell side orderbook
    assert(
      orderbook.length == 0,
      'Sell side Orderbook should be empty after trade'
    );
  });

  //Partly filled limit orders should be modified to represent the filled/remaining amount
  it('Limit orders filled property should be set correctly after a trade', async () => {
    let dex = await Dex.deployed();

    let orderbook = await dex.getOrderBook(web3.utils.fromUtf8('tLINK'), 1); //Get sell side orderbook
    assert(
      orderbook.length == 0,
      'Sell side Orderbook should be empty at start of test'
    );

    await dex.createLimitOrder(1, web3.utils.fromUtf8('tLINK'), 5, 300, {
      from: accounts[1],
    });
    await dex.createMarketOrder(0, web3.utils.fromUtf8('tLINK'), 2);

    orderbook = await dex.getOrderBook(web3.utils.fromUtf8('tLINK'), 1); //Get sell side orderbook
    assert.equal(orderbook[0].filled, 2);
    assert.equal(orderbook[0].amount, 5);
  });

  //When creating a BUY market order, the buyer needs to have enough ETH for the trade
  it('Should throw an error when creating a buy market order without adequate ETH balance', async () => {
    let dex = await Dex.deployed();

    let balance = await dex.balances(accounts[4], web3.utils.fromUtf8('ETH'));
    assert.equal(balance.toNumber(), 0, 'Initial ETH balance is not 0');
    await dex.createLimitOrder(1, web3.utils.fromUtf8('tLINK'), 5, 300, {
      from: accounts[1],
    });

    await truffleAssert.reverts(
      dex.createMarketOrder(0, web3.utils.fromUtf8('tLINK'), 5, {
        from: accounts[4],
      })
    );
  });
});
