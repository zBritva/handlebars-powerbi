import powerbiVisualsApi from "powerbi-visuals-api";
import PrimitiveValue = powerbiVisualsApi.PrimitiveValue;
import DataView = powerbiVisualsApi.DataView;
import DataViewMetadataColumn = powerbiVisualsApi.DataViewMetadataColumn;

import { utcParse } from "d3-time-format";

import { Config as DompurifyConfig, sanitize } from "dompurify";

export const defaultDompurifyConfig = <DompurifyConfig>{
    RETURN_DOM: false,
    SANITIZE_DOM: true,
    ALLOW_ARIA_ATTR: true,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    // ALLOWED_TAGS: [],
    FORBID_ATTR: ['href', 'url'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'param', 'source', 'video'], 
};

export type Column = Pick<DataViewMetadataColumn, "displayName" | "index">;


export interface Table {
    rows: Record<string, PrimitiveValue>[];
    columns: Column[];
}

export function sanitizeHTML(dirty: string) {
    return sanitize(dirty, defaultDompurifyConfig) as string;
}

export function safeParse(echartJson: string): any {
    let chart: any = {};

    try {
        chart = echartJson ? JSON.parse(echartJson) : {};
    } catch(e) {
        console.log(e.message);
    }

    return chart;
}

export function getChartColumns(echartJson: string): string[] {
    if (!echartJson) {
        return [];
    }
    const chart = safeParse(echartJson);

    if (chart.dataset) {
        if (chart.dataset.dimensions && chart.dataset.dimensions instanceof Array) {
            const columns = [];
            chart.dataset.dimensions.forEach((dimension: string | Record<string, string>) => {
                if (typeof dimension === 'string') {
                    columns.push(dimension);
                } else {
                    columns.push(dimension.name);
                }
            });

            return columns;
        }
        if (chart.dataset.source[0]) {
            return chart.dataset.source[0];
        }
    }

    return [];
}

export function walk(key: string, tree: Record<string, unknown | unknown[]> | unknown, apply: (key: string, value: any) => void) {
    if (typeof tree !== 'object') {
        apply(key, tree);
        return;
    }
    for (const key in tree) {
        if (tree[key] instanceof Array) {
            const array = tree[key] as Array<unknown>;
            array.forEach((el, index) => {
                apply(index.toString(), el);
                walk(index.toString(), el, apply);
            });
        } else {
            apply(key, tree[key]);
            if (tree[key] instanceof Object) {
                walk(key, tree[key], apply);
            }
        }
        
    }
}


export function convertData(dataView: DataView): Table {
    const table: Table = {
        rows: [],
        columns: []
    };

    if (!dataView || !dataView.table) {
        return table
    }

    const dateParse = utcParse('%Y-%m-%dT%H:%M:%S.%LZ');
    dataView.table.rows.forEach(data => {
        const row = {};

        dataView.table.columns.forEach((col, index) => {
            if (col.type.dateTime || col.type.temporal) {
                row[col.displayName] = dateParse(data[index] as string);
            } else {
                row[col.displayName] = data[index];
            }
        })

        table.rows.push(row)
    })

    table.columns = dataView.table.columns.map(c => ({
        displayName: c.displayName,
        index: c.index
    }))

    return table;
}