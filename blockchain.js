const crypto = require("crypto");
const { json } = require("stream/consumers");
const sha256 = message => crypto.createHash("sha256").update(message).digest("hex")
const EC = require("elliptic").ec, ec = new EC('secp256k1');
const keyPair = ec.genKeyPair();
const MINT_KEY_PAIR = ec.genKeyPair();
const MINT_PUBLIC_ADDRESS = MINT_KEY_PAIR.getPublic("hex")
const holderKeyPair = ec.genKeyPair();

class Block{
    constructor(timestamp = "", data = []){
        this.timestamp = timestamp;
        this.data = data; 
        this.hash = this.getHash();
        this.prevHash = "";    
        this.nonce = 0;
    }

    getHash() {
        return sha256(this.prevHash + this.timestamp + JSON.stringify(this.data) + this.nonce);
    }

    mine(diff) {
        while (!this.hash.startsWith(Array(diff + 1).join("0"))) {
            
            console.log(`value: ${Array(diff + 1).join("0")}`);
            console.log(`Hash: ${this.hash}`);
        
            this.nonce++;
            this.hash = this.getHash();
        }
    }

    hasValidTransactions(chain) {
        let gas = 0, reward = 0;

        this.data.forEach(transaction =>  {
            if (transaction.from !== MINT_PUBLIC_ADDRESS) {
                gas += transaction.gas
            } else {
                reward = transaction.amount;
            }
        });

        return (
            reward - gas === chain.reward &&
            this.data.every(transaction => transaction.isValid(transaction, chain)) &&
            this.data.filter(transaction => transaction.from === MINT_PUBLIC_ADDRESS).length === 1
        );    
    }
}

class Blockchain{
    constructor() {
        const initialCoinRelease = new Transaction(MINT_PUBLIC_ADDRESS,"04719af634ece3e9bf00bfd7c58163b2caf2b8acd1a437a3e99a093c8dd7b1485c20d8a4c9f6621557f1d583e0fcff99f3234dd1bb365596d1d67909c270c16d64", 100000);
        this.chain = [new Block(Date.now().toString(), [initialCoinRelease])];
        this.diff = 1;
        this.blocktime = 30000;
        this.transaction = [];
        this.reward = 297;
    }

    getLastBlock() {
        return this.chain[this.chain.length - 1];
    }

    addBlock(block) {
        block.prevHash = this.getLastBlock().hash;
        block.hash = block.getHash();
        block.mine(this.diff)
        this.chain.push(Object.freeze(block));
        this.diff += Date.now() - parseInt(this.getLastBlock().timestamp) < this.blocktime ? 1: -1;
    }

    addTransaction(transaction) {
        if(transaction.isValid(transaction, this)) {
        this.transaction.push(transaction); 
        }
    }

    mineTransactions(rewardAddress) {
        let gas = 0;

        this.transaction.forEach(transaction => {
            gas += transaction.gas;
        });
        
        const rewardTransaction = new Transaction(MINT_PUBLIC_ADDRESS, rewardAddress, this.reward + gas);
        rewardTransaction.sign(MINT_KEY_PAIR);
        
        this.addBlock(new Block(Date.now().toString(), [new Transaction(CREATE_REWARD_ADDRESS, rewardAddress, this.reward), ...this.transaction]));
        
        this.transaction = [];
    }

    isValid(blockchain = this) {
        for (let i = 1; i < blockchain.length; i++) {
            const currentBlock = blockchain[i];
            const prevBlock = blockchain[i - 1];
            if (currentBlock.hash !== currentBlock.getHash() ||
             prevBlock.hash !== currentBlock.prevHash || 
             !currentBlock.hasValidTransactions(blockchain)
             ) {
                return false;
            }
        }
        return true;
    }

    getBalance(address) {
        let balance = 0;

        this.chain.forEach(block => {
            block.data.forEach(transaction => {
                if (transaction.from === address) {
                    balance -= transaction.amount;
                    balance -= transaction.gas;
                }

                if (transaction.to === address) {
                    balance += transaction.amount;
                }
            })
        });

        return balance;
    }


}

class Transaction {
    constructor(from, to, amount, gas = 0) {
        this.from = from;
        this.to = to;
        this.amount = amount;
        this.gas = gas;
    }

    sign(keyPair) {
        if (keyPair.getPublic('hex') === this.from) {
            this.signature = keyPair.sign(SHA256(this.from + this.to + this.amount + this.gas), "base64").toDER('hex');
        }
    }

    isValid(tx, chain) {
        return (
            tx.from &&
            tx.to &&
            tx.amount &&
            (chain.getBalance(tx.from) >= tx.amount + tx.gas || tx.from === MINT_PUBLIC_ADDRESS) &&
            ec.keyFromPublic(tx.from, "hex").verify(SHA256(tx.from + tx.to + tx.amount + tx.gas), tx.signature)
        );
    }
}

module.exports = {Block, Blockchain, Transaction};
