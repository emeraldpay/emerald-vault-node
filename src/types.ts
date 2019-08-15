export type Config = {
    dir: string | null
}

export type Account = {
    address: string,
    name: string,
    description: string,
    hidden: boolean,
    hardware: boolean,
}