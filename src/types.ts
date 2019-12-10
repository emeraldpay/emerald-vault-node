export type Config = {
    dir?: string | null
}

export type Uuid = string;

/**
 * @deprecated
 */
export type Account = {
    address: string,
    name: string,
    description: string,
    hidden: boolean,
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

export type AccountType = "pk" | "seed-hd";
export type ImportPkType = "ethereum-json" | "raw-pk-hex";

export type PKRef = {
    type: AccountType,
    keyId: Uuid
}

export type SeedPKRef = {
    type: AccountType,
    seedId: Uuid,
    hdPath: string
}

export type EthereumAccount = {
    id: number,
    blockchain: number,
    address: string,
    key: PKRef | SeedPKRef | undefined
}

export type BitcoinAccount = {
    id: number,
    blockchain: number,
    key: PKRef | SeedPKRef
}

export type WalletAccount = EthereumAccount | BitcoinAccount;

export type Wallet = {
    id: Uuid,
    name: string | undefined,
    description: string | undefined,
    accounts: WalletAccount[],
}

export function isEthereumAccount(acc: WalletAccount): acc is EthereumAccount {
    return acc.blockchain === 100 || acc.blockchain === 101
}

export function isBitcoinAccount(acc: WalletAccount): acc is BitcoinAccount {
    return false
}

export type AddAccount = {
    blockchain: number,
    type: ImportPkType,
    key: string,
    password?: string | undefined
}

export enum StatusCode {
    UNKNOWN = 0,
    NOT_IMPLEMENTED = 1
}

export type Status<T> = {
    succeeded: boolean,
    result: T | undefined,
    error: {
        code: StatusCode,
        message: string
    } | undefined
}