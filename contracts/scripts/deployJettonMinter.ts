import { toNano, Address, beginCell, Cell } from '@ton/core';
import { JettonMinter } from '../wrappers/JettonMinter';
import { NetworkProvider } from '@ton/blueprint';

function buildOnchainMetadata(metadata: {
    name: string;
    symbol: string;
    description?: string;
    decimals?: string;
    image?: string;
}): Cell {
    const nameCell = beginCell().storeStringTail(metadata.name).endCell();
    const symbolCell = beginCell().storeStringTail(metadata.symbol).endCell();
    
    let metadataDict = beginCell().storeDict(null);
    
    metadataDict.storeRef(
        beginCell()
            .storeUint(0, 8)
            .storeRef(nameCell)
            .endCell()
    );
    
    metadataDict.storeRef(
        beginCell()
            .storeUint(1, 8)
            .storeRef(symbolCell)
            .endCell()
    );

    if (metadata.description) {
        const descCell = beginCell().storeStringTail(metadata.description).endCell();
        metadataDict.storeRef(
            beginCell()
                .storeUint(2, 8)
                .storeRef(descCell)
                .endCell()
        );
    }

    if (metadata.decimals) {
        const decimalsCell = beginCell().storeStringTail(metadata.decimals).endCell();
        metadataDict.storeRef(
            beginCell()
                .storeUint(4, 8)
                .storeRef(decimalsCell)
                .endCell()
        );
    }

    if (metadata.image) {
        const imageCell = beginCell().storeStringTail(metadata.image).endCell();
        metadataDict.storeRef(
            beginCell()
                .storeUint(3, 8)
                .storeRef(imageCell)
                .endCell()
        );
    }

    return metadataDict.endCell();
}

export async function run(provider: NetworkProvider) {
    const jettonMinter = provider.open(await JettonMinter.fromInit(
        provider.sender().address!,
        buildOnchainMetadata({
            name: 'Cook Token',
            symbol: 'COOK',
            description: 'Cook Jetton 2.0 Token',
            decimals: '9',
        }),
        await JettonMinter.getWalletCode()
    ));

    await jettonMinter.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(jettonMinter.address);

    console.log('Jetton Minter deployed at:', jettonMinter.address);
}
