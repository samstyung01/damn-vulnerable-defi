// Get compiled Uniswap v2 data
const pairJson = require("@uniswap/v2-core/build/UniswapV2Pair.json");
const factoryJson = require("@uniswap/v2-core/build/UniswapV2Factory.json");
const routerJson = require("@uniswap/v2-periphery/build/UniswapV2Router02.json");

const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('[Challenge] Free Rider', function () {
    let deployer, attacker, buyer;

    // The NFT marketplace will have 6 tokens, at 15 ETH each
    const NFT_PRICE = ethers.utils.parseEther('15')
    const AMOUNT_OF_NFTS = 6;
    const MARKETPLACE_INITIAL_ETH_BALANCE = ethers.utils.parseEther('90');

    // The buyer will offer 45 ETH as payout for the job
    const BUYER_PAYOUT = ethers.utils.parseEther('45');

    // Initial reserves for the Uniswap v2 pool
    const UNISWAP_INITIAL_TOKEN_RESERVE = ethers.utils.parseEther('15000');
    const UNISWAP_INITIAL_WETH_RESERVE = ethers.utils.parseEther('9000');

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, attacker, buyer] = await ethers.getSigners();

        // Attacker starts with little ETH balance
        await ethers.provider.send("hardhat_setBalance", [
            attacker.address,
            "0x6f05b59d3b20000", // 0.5 ETH
        ]);

        // Deploy WETH contract
        this.weth = await (await ethers.getContractFactory('WETH9', deployer)).deploy();

        // Deploy token to be traded against WETH in Uniswap v2
        this.token = await (await ethers.getContractFactory('DamnValuableToken', deployer)).deploy();

        // Deploy Uniswap Factory and Router
        this.uniswapFactory = await (new ethers.ContractFactory(factoryJson.abi, factoryJson.bytecode, deployer)).deploy(
            ethers.constants.AddressZero // _feeToSetter
        );
        this.uniswapRouter = await (new ethers.ContractFactory(routerJson.abi, routerJson.bytecode, deployer)).deploy(
            this.uniswapFactory.address,
            this.weth.address
        );
        
        // Approve tokens, and then create Uniswap v2 pair against WETH and add liquidity
        // Note that the function takes care of deploying the pair automatically
        await this.token.approve(
            this.uniswapRouter.address,
            UNISWAP_INITIAL_TOKEN_RESERVE
        );
        await this.uniswapRouter.addLiquidityETH(
            this.token.address,                                         // token to be traded against WETH
            UNISWAP_INITIAL_TOKEN_RESERVE,                              // amountTokenDesired
            0,                                                          // amountTokenMin
            0,                                                          // amountETHMin
            deployer.address,                                           // to
            (await ethers.provider.getBlock('latest')).timestamp * 2,   // deadline
            { value: UNISWAP_INITIAL_WETH_RESERVE }
        );
        
        // Get a reference to the created Uniswap pair
        const UniswapPairFactory = new ethers.ContractFactory(pairJson.abi, pairJson.bytecode, deployer);
        this.uniswapPair = await UniswapPairFactory.attach(
            await this.uniswapFactory.getPair(this.token.address, this.weth.address)
        );
        expect(await this.uniswapPair.token0()).to.eq(this.weth.address);
        expect(await this.uniswapPair.token1()).to.eq(this.token.address);
        expect(await this.uniswapPair.balanceOf(deployer.address)).to.be.gt('0');

        // Deploy the marketplace and get the associated ERC721 token
        // The marketplace will automatically mint AMOUNT_OF_NFTS to the deployer (see `FreeRiderNFTMarketplace::constructor`)
        this.marketplace = await (await ethers.getContractFactory('FreeRiderNFTMarketplace', deployer)).deploy(
            AMOUNT_OF_NFTS,
            { value: MARKETPLACE_INITIAL_ETH_BALANCE }
        );

        // Deploy NFT contract
        const DamnValuableNFTFactory = await ethers.getContractFactory('DamnValuableNFT', deployer);
        this.nft = await DamnValuableNFTFactory.attach(await this.marketplace.token());

        // Ensure deployer owns all minted NFTs and approve the marketplace to trade them
        for (let id = 0; id < AMOUNT_OF_NFTS; id++) {
            expect(await this.nft.ownerOf(id)).to.be.eq(deployer.address);
        }
        await this.nft.setApprovalForAll(this.marketplace.address, true);

        // Open offers in the marketplace
        await this.marketplace.offerMany(
            [0, 1, 2, 3, 4, 5],
            [NFT_PRICE, NFT_PRICE, NFT_PRICE, NFT_PRICE, NFT_PRICE, NFT_PRICE]
        );
        expect(await this.marketplace.amountOfOffers()).to.be.eq('6');

        // Deploy buyer's contract, adding the attacker as the partner
        this.buyerContract = await (await ethers.getContractFactory('FreeRiderBuyer', buyer)).deploy(
            attacker.address, // partner
            this.nft.address, 
            { value: BUYER_PAYOUT }
        );
    });

    it('Exploit', async function () {
        /** CODE YOUR EXPLOIT HERE */

        console.log('<<<<<<<< Deploy Attack Contract >>>>>>>>');

        console.log('= deploying attack contract =');
        const attackContract = await (await ethers.getContractFactory('AttackFreeRider', attacker)).deploy(this.uniswapPair.address, this.marketplace.address, this.weth.address, this.nft.address, this.buyerContract.address);
        console.log('= done deploying attack contract =');

        console.log('- BALANCES -');  
        attackerEthBal = await ethers.provider.getBalance(attacker.address);
        attackerWethBal = await this.weth.balanceOf(attacker.address);
        console.log('- attacker -');
        console.log('eth');
        console.log(attackerEthBal.toString());
        console.log('weth');
        console.log(attackerWethBal.toString());

        attackContractEthBal = await ethers.provider.getBalance(attackContract.address);
        attackContractWethBal = await this.weth.balanceOf(attackContract.address);
        console.log('- attack contract -');
        console.log('eth');
        console.log(attackContractEthBal.toString());
        console.log('weth');
        console.log(attackContractWethBal.toString());

        marketplaceEthBal = await ethers.provider.getBalance(this.marketplace.address);
        marketplaceWethBal = await this.weth.balanceOf(this.marketplace.address);
        console.log('- marketplace -');
        console.log('eth');
        console.log(marketplaceEthBal.toString());
        console.log('weth');
        console.log(marketplaceWethBal.toString());

        console.log('<<<<<<<< Approve Attack Contract To Move WETH >>>>>>>>');

        console.log('= approve attack contract to move WETH =');
        await this.weth.approve(
            attackContract.address,
            ethers.utils.parseEther('1000')
        );

        console.log('<<<<<<<< Transfer 0.1 Eth for uniswap fee >>>>>>>>');
        await attacker.sendTransaction({to: attackContract.address, value: ethers.utils.parseEther('0.1')});

        console.log('- BALANCES -');  
        attackerEthBal = await ethers.provider.getBalance(attacker.address);
        attackerWethBal = await this.weth.balanceOf(attacker.address);
        console.log('- attacker -');
        console.log('eth');
        console.log(attackerEthBal.toString());
        console.log('weth');
        console.log(attackerWethBal.toString());

        attackContractEthBal = await ethers.provider.getBalance(attackContract.address);
        attackContractWethBal = await this.weth.balanceOf(attackContract.address);
        console.log('- attack contract -');
        console.log('eth');
        console.log(attackContractEthBal.toString());
        console.log('weth');
        console.log(attackContractWethBal.toString());

        marketplaceEthBal = await ethers.provider.getBalance(this.marketplace.address);
        marketplaceWethBal = await this.weth.balanceOf(this.marketplace.address);
        console.log('- marketplace -');
        console.log('eth');
        console.log(marketplaceEthBal.toString());
        console.log('weth');
        console.log(marketplaceWethBal.toString());

        console.log('<<<<<<<< Attack >>>>>>>>');
        await attackContract.connect(attacker).attack();
        
        console.log('- BALANCES -');  
        attackerEthBal = await ethers.provider.getBalance(attacker.address);
        attackerWethBal = await this.weth.balanceOf(attacker.address);
        console.log('- attacker -');
        console.log('eth');
        console.log(attackerEthBal.toString());
        console.log('weth');
        console.log(attackerWethBal.toString());

        attackContractEthBal = await ethers.provider.getBalance(attackContract.address);
        attackContractWethBal = await this.weth.balanceOf(attackContract.address);
        console.log('- attack contract -');
        console.log('eth');
        console.log(attackContractEthBal.toString());
        console.log('weth');
        console.log(attackContractWethBal.toString());

        marketplaceEthBal = await ethers.provider.getBalance(this.marketplace.address);
        marketplaceWethBal = await this.weth.balanceOf(this.marketplace.address);
        console.log('- marketplace -');
        console.log('eth');
        console.log(marketplaceEthBal.toString());
        console.log('weth');
        console.log(marketplaceWethBal.toString());

        console.log('- OWNERS -');  
        console.log('attacker', attacker.address);  
        console.log('buyer contract', this.buyerContract.address);
        console.log('owner 0', await this.nft.ownerOf(0));
        console.log('owner 1', await this.nft.ownerOf(1));
        console.log('owner 2', await this.nft.ownerOf(2));
        console.log('owner 3', await this.nft.ownerOf(3));
        console.log('owner 4', await this.nft.ownerOf(4));
        console.log('owner 5', await this.nft.ownerOf(5));
    });

    after(async function () {
        /** SUCCESS CONDITIONS */

        // Attacker must have earned all ETH from the payout
        expect(await ethers.provider.getBalance(attacker.address)).to.be.gt(BUYER_PAYOUT);
        expect(await ethers.provider.getBalance(this.buyerContract.address)).to.be.eq('0');

        // The buyer extracts all NFTs from its associated contract
        for (let tokenId = 0; tokenId < AMOUNT_OF_NFTS; tokenId++) {
            await this.nft.connect(buyer).transferFrom(this.buyerContract.address, buyer.address, tokenId);
            expect(await this.nft.ownerOf(tokenId)).to.be.eq(buyer.address);
        }

        // Exchange must have lost NFTs and ETH
        expect(await this.marketplace.amountOfOffers()).to.be.eq('0');
        expect(
            await ethers.provider.getBalance(this.marketplace.address)
        ).to.be.lt(MARKETPLACE_INITIAL_ETH_BALANCE);
    });
});
