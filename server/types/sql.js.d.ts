// Type declarations for sql.js
declare module 'sql.js' {
    export interface SqlJsStatic {
        Database: new (data?: ArrayBuffer | Uint8Array) => Database;
        createStatement(sql: string): Statement;
    }

    export interface Database {
        run(sql: string, params?: any[]): RunResult;
        exec(sql: string): QueryExecResult[];
        prepare(sql: string): Statement;
        export(): Uint8Array;
        close(): void;
        getRowsModified(): number;
    }

    export interface RunResult {
        columns: string[];
        values: any[][];
    }

    export interface QueryExecResult {
        columns: string[];
        values: any[][];
    }

    export interface Statement {
        run(params?: any[]): RunResult;
        get(params?: any[]): any[] | null;
        all(params?: any[]): any[][];
        bind(params?: any[]): void;
        free(): void;
        getColumnNames(): string[];
        getAsObject(params?: any[]): Record<string, any>;
        step(): boolean;
    }

    export interface InitSqlJsConfig {
        locateFile?: (filename: string) => string;
    }

    export default function initSqlJs(config?: InitSqlJsConfig): Promise<SqlJsStatic>;
    export function initSqlJs(config?: InitSqlJsConfig): Promise<SqlJsStatic>;
}
