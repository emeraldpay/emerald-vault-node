export type Config = {
    dir?: string | null
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