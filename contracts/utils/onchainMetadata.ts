import { beginCell, Cell } from '@ton/core';

export type JettonMetadata = {
    name: string;
    symbol: string;
    description?: string;
    image?: string;
    decimals?: string;
    social?: string[];
    websites?: string[];
    catalogs?: string[];
};

export function buildOnchainMetadata(metadata: JettonMetadata): Cell {
    const dict = beginCell().storeDict(null);

    const nameCell = beginCell().storeStringTail(metadata.name).endCell();
    const symbolCell = beginCell().storeStringTail(metadata.symbol).endCell();

    let metadataDict = beginCell().storeDict(null);
    metadataDict.storeRef(
        beginCell()
            .storeUint(0, 8) // key: "name"
            .storeRef(nameCell)
            .endCell()
    );
    metadataDict.storeRef(
        beginCell()
            .storeUint(1, 8) // key: "symbol"
            .storeRef(symbolCell)
            .endCell()
    );

    if (metadata.description) {
        const descCell = beginCell().storeStringTail(metadata.description).endCell();
        metadataDict.storeRef(
            beginCell()
                .storeUint(2, 8) // key: "description"
                .storeRef(descCell)
                .endCell()
        );
    }

    if (metadata.image) {
        const imageCell = beginCell().storeStringTail(metadata.image).endCell();
        metadataDict.storeRef(
            beginCell()
                .storeUint(3, 8) // key: "image"
                .storeRef(imageCell)
                .endCell()
        );
    }

    if (metadata.decimals) {
        const decimalsCell = beginCell().storeStringTail(metadata.decimals).endCell();
        metadataDict.storeRef(
            beginCell()
                .storeUint(4, 8) // key: "decimals"
                .storeRef(decimalsCell)
                .endCell()
        );
    }

    return metadataDict.endCell();
}

export function parseOnchainMetadata(cell: Cell): JettonMetadata {
    // Implementation for parsing onchain metadata
    // This would read the dictionary structure and extract values
    const metadata: JettonMetadata = {
        name: '',
        symbol: '',
    };

    // Parse logic here
    return metadata;
}




