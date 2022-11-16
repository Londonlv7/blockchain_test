const {Block, Blockchain, Transaction} = require("./blockchain.js");
const EC = require("elliptic").ec, ec = new EC('secp256k1');
const Lchain = new Blockchain();
const holderKey = Lchain.chain[0].data[0].from;

//const londonwallet = ec.genKeyPair();

//const transaction = new Transaction(holderKeyPair.getPublic("hex"))

console.log(Lchain.chain[0].data[0].from);