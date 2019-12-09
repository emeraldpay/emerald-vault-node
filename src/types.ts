export type Config = {
    dir?: string | null
}

export type Uuid = string;

export type Account = {
    address: string,
    name: string,
    description: string,
    /**
     * @deprecated
     */
    hidden: boolean,
    /**
     * @deprecated
     */
    hardware: boolean,
}

export type Update = {
    name?: string | null,
    description?: string | null
}

export type UnsignedTx = {
    from: string,
    to?: string | null,
    gas: string,
    gasPrice: string,
    value: string,
    data?: string | null,
    nonce: string,
}

export type ImportMnemonic = {
    name?: string | null,
    description?: string | null,
    password: string,
    mnemonic: string,
    hdPath: string,
}

export type AddressBookItem = {
    address: string,
    description?: string,
    name?: string
}

export type ImportPrivateKey = {
    name?: string | null,
    description?: string | null,
    pk: string,
    password: string
}

export type PKRef = {
    pk_id: Uuid
}

export type SeedPKRef = {
    seed_id: Uuid,
    hdPath: string
}

export type EthereumAccount = {
    id: number,
    blockchain: number,
    address: string,
    pk: PKRef | SeedPKRef
}

export type Wallet = {
    id: Uuid,
    name: string,
    description: string,
    accounts: EthereumAccount[]
}