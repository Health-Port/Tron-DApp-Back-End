const TronWeb = require('tronweb');
const HttpProvider = TronWeb.providers.HttpProvider; // This provider is optional, you can just use a url for the nodes instead
const fullNode = new HttpProvider(`${process.env.TRON_NETWORK_LINK}`); // Full node http endpoint
const solidityNode = new HttpProvider(`${process.env.TRON_NETWORK_LINK}`); // Solidity node http endpoint
const eventServer = `${process.env.TRON_NETWORK_LINK}/`; // Contract events http endpoint

function createAccount() {
    try {
        const tronWeb = new TronWeb(fullNode, solidityNode, eventServer);
        return tronWeb.createAccount();

    } catch (error) {
        console.log(error);
        throw error;
    }
}

async function isAddress(address) {
    try {
        let tronWeb = new TronWeb(fullNode, solidityNode, eventServer);
        return tronWeb.isAddress(address);

    } catch (error) {
        console.log(error);
        throw error;
    }
}

async function getTRC10TokenBalance(privateKey, address) {
    try {
        let tronWeb = new TronWeb(fullNode, solidityNode, eventServer, privateKey);
        let account = await tronWeb.trx.getAccount(address);
        let balance = 0;
        if (account == "") {
            console.log('account info blank');
            return getTRC10TokenBalance(privateKey, address);
        }
        else if (account.assetV2) {
            for (let i = 0; i < account.assetV2.length; i++) {
                if (account.assetV2[i].key == process.env.TRON_TOKEN_ID) {
                    balance = account.assetV2[i].value
                }
            }
        } else {
            balance = 0;
        }
        return balance / Math.pow(10, parseInt(process.env.DECIMALS));

    } catch (error) {
        console.log(error);
        throw error;
    }
}

async function getTrxBalance(privateKey, address) {
    try {
        let tronWeb = new TronWeb(fullNode, solidityNode, eventServer, privateKey);
        let balance = await tronWeb.trx.getBalance(address);
        if (balance && balance > 0)
            return balance / 1000000;
        else return 0;

    } catch (error) {
        console.log(error)
    }
}

async function sendTRC10Token(to, amount, privateKey) {
    try {
        let tronWeb = new TronWeb(fullNode, solidityNode, eventServer, privateKey);
        amount = amount * Math.pow(10, parseInt(process.env.DECIMALS));
        let transaction = await tronWeb.trx.sendToken(to, amount, process.env.TRON_TOKEN_ID);
        return transaction.transaction.txID;

    } catch (error) {
        console.log(error);
        throw error;
    }
}
async function getTransactionByHash(transactionHash) {
    try {
        const tronWeb = new TronWeb(fullNode, solidityNode, eventServer);
        let transaction = await tronWeb.trx.getTransactionInfo(transactionHash);
        return transaction;

    } catch (error) {
        console.log(error);
        throw error;
    }
}

async function getTransectionsByAddress(privateKey, address, limit, offset) {
    try {
        let tronWeb = new TronWeb(fullNode, solidityNode, eventServer, privateKey);
        let transections = await tronWeb.trx.getTransactionsRelated(address, 'all', limit, offset);
        let data = [];
        for (let i = 0; i < transections.length; i++) {
            data[i] = {
                'trx_id': transections[i].txID,
                'direction': transections[i].direction,
                'type': transections[i].raw_data.contract[0].type,
                'date_time': transections[i].raw_data.expiration,
                'amount': transections[i].raw_data.contract[0].parameter.value.amount,
                'to_address': tronWeb.address.fromHex(transections[i].raw_data.contract[0].parameter.value.to_address),
                'from_address': tronWeb.address.fromHex(transections[i].raw_data.contract[0].parameter.value.owner_address),
                //'asset_name': tronWeb.toUtf8(transections[i].raw_data.contract[0].parameter.value.asset_name),
            }
        }
        return data;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

async function getBandwidth(address) {
    try {
        let tronWeb = new TronWeb(fullNode, solidityNode, eventServer);
        return await tronWeb.trx.getBandwidth(address);
    } catch (error) {
        console.log(error);
        throw error;
    }
}

async function createSmartContract(issuerAddress) {
    try {
        let issuerAddress = 'TJydrRBz1yxHZqxTCakz9AcHXHcnnFuXPV';
        let privateKey = '44BD8278E103365FAAD929A2376A2CC5B3674CF2358A056465E0CE6BA9949DB0';

        let options = {
            abi: [{ "constant": true, "inputs": [], "name": "getMedicationRecords", "outputs": [{ "components": [{ "name": "name", "type": "string" }, { "name": "dose", "type": "string" }, { "name": "frequency", "type": "string" }, { "name": "physician", "type": "string" }, { "name": "createdAt", "type": "uint256" }], "name": "", "type": "tuple[]" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "name": "user", "type": "address" }, { "name": "status", "type": "bool" }], "name": "updateAdmin", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [], "name": "renounceOwnership", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [{ "name": "user", "type": "address" }, { "name": "name", "type": "string" }, { "name": "dose", "type": "string" }, { "name": "frequency", "type": "string" }, { "name": "physician", "type": "string" }], "name": "insertMedicationRecord", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [], "name": "getProcedureRecords", "outputs": [{ "components": [{ "name": "procedure", "type": "string" }, { "name": "procedureDate", "type": "uint256" }, { "name": "createdAt", "type": "uint256" }], "name": "", "type": "tuple[]" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "owner", "outputs": [{ "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "isOwner", "outputs": [{ "name": "", "type": "bool" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "getAlergyRecords", "outputs": [{ "components": [{ "name": "substance", "type": "string" }, { "name": "category", "type": "string" }, { "name": "saverity", "type": "string" }, { "name": "reaction", "type": "string" }, { "name": "createdAt", "type": "uint256" }], "name": "", "type": "tuple[]" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [{ "name": "user", "type": "address" }], "name": "getAlergyRecords", "outputs": [{ "components": [{ "name": "substance", "type": "string" }, { "name": "category", "type": "string" }, { "name": "saverity", "type": "string" }, { "name": "reaction", "type": "string" }, { "name": "createdAt", "type": "uint256" }], "name": "", "type": "tuple[]" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [{ "name": "user", "type": "address" }], "name": "getMedicationRecords", "outputs": [{ "components": [{ "name": "name", "type": "string" }, { "name": "dose", "type": "string" }, { "name": "frequency", "type": "string" }, { "name": "physician", "type": "string" }, { "name": "createdAt", "type": "uint256" }], "name": "", "type": "tuple[]" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "name": "user", "type": "address" }, { "name": "_substance", "type": "string" }, { "name": "_category", "type": "string" }, { "name": "_saverity", "type": "string" }, { "name": "_reaction", "type": "string" }], "name": "insertAlergyRecord", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [{ "name": "user", "type": "address" }, { "name": "procedure", "type": "string" }, { "name": "procedureDate", "type": "uint256" }], "name": "insertProcedureRecord", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [{ "name": "newOwner", "type": "address" }], "name": "transferOwnership", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [{ "name": "user", "type": "address" }], "name": "getProcedureRecords", "outputs": [{ "components": [{ "name": "procedure", "type": "string" }, { "name": "procedureDate", "type": "uint256" }, { "name": "createdAt", "type": "uint256" }], "name": "", "type": "tuple[]" }], "payable": false, "stateMutability": "view", "type": "function" }, { "inputs": [], "payable": false, "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [{ "indexed": true, "name": "previousOwner", "type": "address" }, { "indexed": true, "name": "newOwner", "type": "address" }], "name": "OwnershipTransferred", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "name": "_user", "type": "address" }, { "indexed": false, "name": "timestamp", "type": "uint256" }], "name": "AlergyRecord", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "name": "_user", "type": "address" }, { "indexed": false, "name": "timestamp", "type": "uint256" }], "name": "MedicationRecord", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "name": "_user", "type": "address" }, { "indexed": false, "name": "timestamp", "type": "uint256" }], "name": "ProcedureRecord", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "name": "user", "type": "address" }, { "indexed": false, "name": "status", "type": "bool" }], "name": "Admin", "type": "event" }],
            bytecode: '608060405234801561001057600080fd5b5060008054600160a060020a0319163317808255604051600160a060020a039190911691907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0908290a33360008181526004602052604090819020805460ff1916600190811790915590517f132a9997e52e2c9a263663f4e0d70844d7e683776839188028d514deea1fb13e916100a6916100c2565b60405180910390a26100db565b6100bc816100d6565b82525050565b602081016100d082846100b3565b92915050565b151590565b611b7d80620000eb6000396000f3006080604052600436106100cf5763ffffffff7c01000000000000000000000000000000000000000000000000000000006000350416633de88f3381146100d4578063670a6fd9146100ff578063715018a61461012157806383423c56146101365780638b429324146101565780638da5cb5b146101785780638f32d59b1461019a57806396733989146101bc578063b5058ee5146101de578063c5003161146101fe578063d12b2f1c1461021e578063ebdf80341461023e578063f2fde38b1461025e578063fde785c51461027e575b600080fd5b3480156100e057600080fd5b506100e961029e565b6040516100f69190611a55565b60405180910390f35b34801561010b57600080fd5b5061011f61011a36600461168a565b61056a565b005b34801561012d57600080fd5b5061011f6105dd565b34801561014257600080fd5b5061011f6101513660046116c4565b610647565b34801561016257600080fd5b5061016b610777565b6040516100f69190611a66565b34801561018457600080fd5b5061018d61087b565b6040516100f69190611a30565b3480156101a657600080fd5b506101af61088a565b6040516100f69190611a77565b3480156101c857600080fd5b506101d161089b565b6040516100f69190611a44565b3480156101ea57600080fd5b506101d16101f9366004611664565b610b5d565b34801561020a57600080fd5b506100e9610219366004611664565b610e4f565b34801561022a57600080fd5b5061011f6102393660046116c4565b611136565b34801561024a57600080fd5b5061011f610259366004611799565b611256565b34801561026a57600080fd5b5061011f610279366004611664565b611336565b34801561028a57600080fd5b5061016b610299366004611664565b611355565b336000908152600260209081526040808320805482518185028101850190935280835260609492939192909184015b828210156105605760008481526020908190206040805160058602909201805460026001821615610100026000190190911604601f8101859004909402830160c090810190925260a08301848152929390928492909184918401828280156103765780601f1061034b57610100808354040283529160200191610376565b820191906000526020600020905b81548152906001019060200180831161035957829003601f168201915b50505050508152602001600182018054600181600116156101000203166002900480601f0160208091040260200160405190810160405280929190818152602001828054600181600116156101000203166002900480156104185780601f106103ed57610100808354040283529160200191610418565b820191906000526020600020905b8154815290600101906020018083116103fb57829003601f168201915b5050509183525050600282810180546040805160206001841615610100026000190190931694909404601f810183900483028501830190915280845293810193908301828280156104aa5780601f1061047f576101008083540402835291602001916104aa565b820191906000526020600020905b81548152906001019060200180831161048d57829003601f168201915b505050918352505060038201805460408051602060026001851615610100026000190190941693909304601f810184900484028201840190925281815293820193929183018282801561053e5780601f106105135761010080835404028352916020019161053e565b820191906000526020600020905b81548152906001019060200180831161052157829003601f168201915b50505050508152602001600482015481525050815260200190600101906102cd565b5050505090505b90565b61057261088a565b151561057d57600080fd5b600160a060020a03821660008181526004602052604090819020805460ff1916841515179055517f132a9997e52e2c9a263663f4e0d70844d7e683776839188028d514deea1fb13e906105d1908490611a77565b60405180910390a25050565b6105e561088a565b15156105f057600080fd5b60008054604051600160a060020a03909116907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0908390a36000805473ffffffffffffffffffffffffffffffffffffffff19169055565b61064f6114fb565b3360009081526004602052604090205460ff16151561066d57600080fd5b8481526020808201859052604080830185905260608301849052426080840152600160a060020a038816600090815260028352908120805460018101808355918352918390208451805192948694600502909201926106cf928492019061152b565b5060208281015180516106e8926001850192019061152b565b506040820151805161070491600284019160209091019061152b565b506060820151805161072091600384019160209091019061152b565b506080820151816004015550505085600160a060020a03167f57f6827b9992a7da47c90eaea7453ebbb19dbfbe3ab28175a5872b2774ad53ef426040516107679190611a85565b60405180910390a2505050505050565b336000908152600360209081526040808320805482518185028101850190935280835260609492939192909184015b828210156105605760008481526020908190206040805160038602909201805460026001821615610100026000190190911604601f810185900490940283016080908101909252606083018481529293909284929091849184018282801561084f5780601f106108245761010080835404028352916020019161084f565b820191906000526020600020905b81548152906001019060200180831161083257829003601f168201915b5050505050815260200160018201548152602001600282015481525050815260200190600101906107a6565b600054600160a060020a031690565b600054600160a060020a0316331490565b336000908152600160209081526040808320805482518185028101850190935280835260609492939192909184015b828210156105605760008481526020908190206040805160058602909201805460026001821615610100026000190190911604601f8101859004909402830160c090810190925260a08301848152929390928492909184918401828280156109735780601f1061094857610100808354040283529160200191610973565b820191906000526020600020905b81548152906001019060200180831161095657829003601f168201915b50505050508152602001600182018054600181600116156101000203166002900480601f016020809104026020016040519081016040528092919081815260200182805460018160011615610100020316600290048015610a155780601f106109ea57610100808354040283529160200191610a15565b820191906000526020600020905b8154815290600101906020018083116109f857829003601f168201915b5050509183525050600282810180546040805160206001841615610100026000190190931694909404601f81018390048302850183019091528084529381019390830182828015610aa75780601f10610a7c57610100808354040283529160200191610aa7565b820191906000526020600020905b815481529060010190602001808311610a8a57829003601f168201915b505050918352505060038201805460408051602060026001851615610100026000190190941693909304601f8101849004840282018401909252818152938201939291830182828015610b3b5780601f10610b1057610100808354040283529160200191610b3b565b820191906000526020600020905b815481529060010190602001808311610b1e57829003601f168201915b50505050508152602001600482015481525050815260200190600101906108ca565b3360009081526004602052604090205460609060ff161515610b7e57600080fd5b600160a060020a038216600090815260016020908152604080832080548251818502810185019093528083529193909284015b82821015610e445760008481526020908190206040805160058602909201805460026001821615610100026000190190911604601f8101859004909402830160c090810190925260a0830184815292939092849290918491840182828015610c5a5780601f10610c2f57610100808354040283529160200191610c5a565b820191906000526020600020905b815481529060010190602001808311610c3d57829003601f168201915b50505050508152602001600182018054600181600116156101000203166002900480601f016020809104026020016040519081016040528092919081815260200182805460018160011615610100020316600290048015610cfc5780601f10610cd157610100808354040283529160200191610cfc565b820191906000526020600020905b815481529060010190602001808311610cdf57829003601f168201915b5050509183525050600282810180546040805160206001841615610100026000190190931694909404601f81018390048302850183019091528084529381019390830182828015610d8e5780601f10610d6357610100808354040283529160200191610d8e565b820191906000526020600020905b815481529060010190602001808311610d7157829003601f168201915b505050918352505060038201805460408051602060026001851615610100026000190190941693909304601f8101849004840282018401909252818152938201939291830182828015610e225780601f10610df757610100808354040283529160200191610e22565b820191906000526020600020905b815481529060010190602001808311610e0557829003601f168201915b5050505050815260200160048201548152505081526020019060010190610bb1565b505050509050919050565b3360009081526004602052604090205460609060ff161515610e7057600080fd5b600160a060020a038216600090815260026020908152604080832080548251818502810185019093528083529193909284015b82821015610e445760008481526020908190206040805160058602909201805460026001821615610100026000190190911604601f8101859004909402830160c090810190925260a0830184815292939092849290918491840182828015610f4c5780601f10610f2157610100808354040283529160200191610f4c565b820191906000526020600020905b815481529060010190602001808311610f2f57829003601f168201915b50505050508152602001600182018054600181600116156101000203166002900480601f016020809104026020016040519081016040528092919081815260200182805460018160011615610100020316600290048015610fee5780601f10610fc357610100808354040283529160200191610fee565b820191906000526020600020905b815481529060010190602001808311610fd157829003601f168201915b5050509183525050600282810180546040805160206001841615610100026000190190931694909404601f810183900483028501830190915280845293810193908301828280156110805780601f1061105557610100808354040283529160200191611080565b820191906000526020600020905b81548152906001019060200180831161106357829003601f168201915b505050918352505060038201805460408051602060026001851615610100026000190190941693909304601f81018490048402820184019092528181529382019392918301828280156111145780601f106110e957610100808354040283529160200191611114565b820191906000526020600020905b8154815290600101906020018083116110f757829003601f168201915b5050505050815260200160048201548152505081526020019060010190610ea3565b61113e6114fb565b3360009081526004602052604090205460ff16151561115c57600080fd5b8481526020808201859052604080830185905260608301849052426080840152600160a060020a038816600090815260018084529181208054928301808255908252908390208451805192948694600502909201926111be928492019061152b565b5060208281015180516111d7926001850192019061152b565b50604082015180516111f391600284019160209091019061152b565b506060820151805161120f91600384019160209091019061152b565b506080820151816004015550505085600160a060020a03167fd11478491d9330a5ef4e9ed41d64ab47a77fb41c56014deafa9c77d9d31c444f426040516107679190611a85565b61125e6115a9565b3360009081526004602052604090205460ff16151561127c57600080fd5b828152602080820183905242604080840191909152600160a060020a0386166000908152600380845291812080546001810180835591835291849020855180519295879594909402909101926112d79284929091019061152b565b50602082015181600101556040820151816002015550505083600160a060020a03167f18a49f8099070c9961b7ad41bc3ed251112a2857e5f66e5a43d98f6b901de56d426040516113289190611a85565b60405180910390a250505050565b61133e61088a565b151561134957600080fd5b6113528161147e565b50565b3360009081526004602052604090205460609060ff16151561137657600080fd5b600160a060020a038216600090815260036020908152604080832080548251818502810185019093528083529193909284015b82821015610e445760008481526020908190206040805160038602909201805460026001821615610100026000190190911604601f81018590049094028301608090810190925260608301848152929390928492909184918401828280156114525780601f1061142757610100808354040283529160200191611452565b820191906000526020600020905b81548152906001019060200180831161143557829003601f168201915b5050505050815260200160018201548152602001600282015481525050815260200190600101906113a9565b600160a060020a038116151561149357600080fd5b60008054604051600160a060020a03808516939216917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e091a36000805473ffffffffffffffffffffffffffffffffffffffff1916600160a060020a0392909216919091179055565b60a06040519081016040528060608152602001606081526020016060815260200160608152602001600081525090565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061156c57805160ff1916838001178555611599565b82800160010185558215611599579182015b8281111561159957825182559160200191906001019061157e565b506115a59291506115cb565b5090565b6060604051908101604052806060815260200160008152602001600081525090565b61056791905b808211156115a557600081556001016115d1565b60006115f18235611aec565b9392505050565b60006115f18235611af8565b6000601f8201831361161557600080fd5b813561162861162382611aba565b611a93565b9150808252602083016020830185838301111561164457600080fd5b61164f838284611afd565b50505092915050565b60006115f18235610567565b60006020828403121561167657600080fd5b600061168284846115e5565b949350505050565b6000806040838503121561169d57600080fd5b60006116a985856115e5565b92505060206116ba858286016115f8565b9150509250929050565b600080600080600060a086880312156116dc57600080fd5b60006116e888886115e5565b955050602086013567ffffffffffffffff81111561170557600080fd5b61171188828901611604565b945050604086013567ffffffffffffffff81111561172e57600080fd5b61173a88828901611604565b935050606086013567ffffffffffffffff81111561175757600080fd5b61176388828901611604565b925050608086013567ffffffffffffffff81111561178057600080fd5b61178c88828901611604565b9150509295509295909350565b6000806000606084860312156117ae57600080fd5b60006117ba86866115e5565b935050602084013567ffffffffffffffff8111156117d757600080fd5b6117e386828701611604565b92505060406117f486828701611658565b9150509250925092565b61180781611aec565b82525050565b600061181882611ae8565b8084526020840193508360208202850161183185611ae2565b60005b8481101561186857838303885261184c838351611968565b925061185782611ae2565b602098909801979150600101611834565b50909695505050505050565b600061187f82611ae8565b8084526020840193508360208202850161189885611ae2565b60005b848110156118685783830388526118b3838351611968565b92506118be82611ae2565b60209890980197915060010161189b565b60006118da82611ae8565b808452602084019350836020820285016118f385611ae2565b60005b8481101561186857838303885261190e8383516119eb565b925061191982611ae2565b6020989098019791506001016118f6565b61180781611af8565b600061193e82611ae8565b808452611952816020860160208601611b09565b61195b81611b39565b9093016020019392505050565b805160a0808452600091908401906119808282611933565b9150506020830151848203602086015261199a8282611933565b915050604083015184820360408601526119b48282611933565b915050606083015184820360608601526119ce8282611933565b91505060808301516119e36080860182611a27565b509392505050565b8051606080845260009190840190611a038282611933565b9150506020830151611a186020860182611a27565b5060408301516119e360408601825b61180781610567565b60208101611a3e82846117fe565b92915050565b602080825281016115f1818461180d565b602080825281016115f18184611874565b602080825281016115f181846118cf565b60208101611a3e828461192a565b60208101611a3e8284611a27565b60405181810167ffffffffffffffff81118282101715611ab257600080fd5b604052919050565b600067ffffffffffffffff821115611ad157600080fd5b506020601f91909101601f19160190565b60200190565b5190565b600160a060020a031690565b151590565b82818337506000910152565b60005b83811015611b24578181015183820152602001611b0c565b83811115611b33576000848401525b50505050565b601f01601f1916905600a265627a7a72305820fcb51d0dd38cae20bacf4201689775d3c0208c4bb058d6de354152fe81f205c06c6578706572696d656e74616cf50037'
        }

        let tronWeb = new TronWeb(fullNode, solidityNode, eventServer, privateKey);
        let transaction = await tronWeb.transactionBuilder.createSmartContract(options, issuerAddress);
        let signedTransaction = await tronWeb.trx.sign(transaction);
        let sendRawTransaction = await tronWeb.trx.sendRawTransaction(signedTransaction);

        return sendRawTransaction;

    } catch (error) {
        console.log(error);
        throw error;
    }
}

async function saveAllergyForm(address, substance, category, severity, reactions) {
    try {
        let privateKey = process.env.MAIN_ACCOUNT_PRIVATE_KEY;
        let tronWeb = new TronWeb(fullNode, solidityNode, eventServer, privateKey);
        let tronExecutor = await tronWeb.contract().at(`${process.env.SMART_CONTRACT_ADDRESS}`);
        let saveAllergy = await tronExecutor.insertAlergyRecord(address, substance, category, severity, reactions).send();
        return saveAllergy;

    } catch (error) {
        console.log(error)
    }
}

async function getAllergyForm(address) {
    try {
        let privateKey = 'C6A9E6585271BB9180C82933F9DBA5D2124B0AC0CA1B4D48A1381B18A0A5F345'
        let tronWeb = new TronWeb(fullNode, solidityNode, eventServer, privateKey);
        let tronExecutor = await tronWeb.contract().at(`${process.env.SMART_CONTRACT_ADDRESS}`);
        let getAllergy = await tronExecutor.getAlergyRecords().call();

        return getAllergy;

    } catch (error) {
        console.log(error)
    }
}

//#region old methods used smart contract

// function getBalanceTrx(address) {
//     try {
//         const tronWeb = new TronWeb(fullNode, solidityNode, eventServer);
//         return tronWeb.trx.getBalance(address);
//     } catch (error) {
//         console.log(error)
//     }
// }

// const tronWeb = new TronWeb(fullNode, solidityNode, eventServer, privateKey);
// let tronExecutor = await tronWeb.contract().at(`${process.env.SMART_CONTRACT_ADDRESS}`);
// let decimals = await tronExecutor.decimals().call();
// let decimalNumber = parseInt(decimals._hex, 16);
// let balance = await tronExecutor.balanceOf(address).call();
// let balanceNumber = parseInt(balance.balance._hex, 16)
// console.log(balanceNumber / Math.pow(10, decimalNumber));
// return balanceNumber / Math.pow(10, decimalNumber);

// async function getBalanceToken(privateKey, address) {
//     try {
//         const tronWeb = new TronWeb(fullNode, solidityNode, eventServer, privateKey);
//         let tronExecutor = await tronWeb.contract().at(`${process.env.SMART_CONTRACT_ADDRESS}`);
//         let decimals = await tronExecutor.decimals().call();
//         let balance = await tronExecutor.balanceOf(address).call();
//         return balance / Math.pow(10, decimals);

//     } catch (error) {
//         console.log(error)
//     }
// }

// async function getTotalSupply(privateKey) {
//     try {
//         const tronWeb = new TronWeb(fullNode, solidityNode, eventServer, privateKey);
//         let tronExecutor = await tronWeb.contract().at(`${process.env.SMART_CONTRACT_ADDRESS}`);
//         let decimals = await tronExecutor.decimals().call();
//         let supply = await tronExecutor.totalSupply().call();
//         return supply / Math.pow(10, decimals);

//     } catch (error) {
//         console.log(error)
//     }
// }

// async function sendTrx(to, amount, privateKey) {
//     try {
//         let tronWeb = new TronWeb(fullNode, solidityNode, eventServer, privateKey);
//         let sendTransaction = await tronWeb.transactionBuilder.sendTrx(to, amount, "TJydrRBz1yxHZqxTCakz9AcHXHcnnFuXPV");
//         let signedTransaction = await tronWeb.trx.sign(sendTransaction);
//         let sendRawTransaction = await tronWeb.trx.sendRawTransaction(signedTransaction);
//         return sendRawTransaction;

//     } catch (error) {
//         console.log(error)
//     }
// }

// async function sendToken(to, amount, privateKey) {
//     try {
//         let tronWeb = new TronWeb(fullNode, solidityNode, eventServer, privateKey);
//         let tronExecutor = await tronWeb.contract().at(`${process.env.SMART_CONTRACT_ADDRESS}`);
//         let decimals = await tronExecutor.decimals().call();
//         amount = amount * Math.pow(10, decimals);
//         return await tronExecutor.transfer(to, amount).send();

//     } catch (error) {
//         console.log(error)
//     }
// }
//#endregion

async function getHealthportOldTokenBalance(address) {
    try {
        let tronWeb = new TronWeb(fullNode, solidityNode, eventServer);
        let account = await tronWeb.trx.getAccount(address);
        let balance = 0;
        if (account == "") {
            console.log('account info blank');
            return getTRC10TokenBalance(privateKey, address);
        }
        else if (account.assetV2) {
            for (let i = 0; i < account.assetV2.length; i++) {
                //Old token id
                if (account.assetV2[i].key == '1001581') {
                    balance = account.assetV2[i].value
                }
            }
        } else {
            balance = 0;
        }
        return balance;

    } catch (error) {
        console.log(error);
        throw error;
    }
}

module.exports = {
    createAccount,
    isAddress,
    getTRC10TokenBalance,
    sendTRC10Token,
    getTransectionsByAddress,
    getBandwidth,
    createSmartContract,
    saveAllergyForm,
    getAllergyForm,
    getTrxBalance,
    getHealthportOldTokenBalance,
    getTransactionByHash
};