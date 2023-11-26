import Handlebars from "handlebars";

import { format } from "d3-format";
import { min, max, filter, median, mean, sum } from "d3-array";

import { utcFormat, timeFormat } from "d3-time-format";

import { select } from "d3-selection";

import { axisBottom, axisLeft, axisRight, axisTop, Axis } from "d3-axis";

import { scaleLinear, scaleBand, scaleLog, scaleOrdinal, ScaleLinear, ScaleBand, ScaleOrdinal, ScaleLogarithmic } from "d3-scale";

const dateFormats = new Map<string, (date: Date) => string>()
const utcFormats = new Map<string, (date: Date) => string>()
const numberFormats = new Map<string, (date: number) => string>()

export type ScaleType = 'linear' | 'band' | 'log' | 'ordinal';
export type Scale = ScaleLinear<number, number> | ScaleLogarithmic<number, number> | ScaleBand<string> | ScaleOrdinal<string, number>

const scales = new Map<string, {
    scale: Scale,
    type: ScaleType
}>()

const axes = new Map<string, Axis<unknown>>()

const variables = new Map<string, number | string | Date | boolean>()

const axisFunctions = { axisBottom, axisLeft, axisRight, axisTop }

Handlebars.registerHelper('format', function (context: unknown, formatString: unknown) {
    if (context === null) {
        return 'null';
    }
    if (typeof formatString === 'string') {
        if (typeof context === 'number') {
            let formatter: (date: number) => string = null
            if (numberFormats.has(formatString)) {
                formatter = numberFormats.get(formatString)
            } else {
                formatter = format(formatString)
                numberFormats.set(formatString, formatter)
            }
            return formatter(context)
        } else {
            return 'Value is not number'
        }
    } else {
        return 'Wrong format'
    }
})

Handlebars.registerHelper('utcFormat', function (context: unknown, formatString: unknown) {
    if (context === null) {
        return 'null';
    }
    if (typeof formatString === 'string') {
        if (typeof context === 'object' && context instanceof Date) {
            let formatter: (date: Date) => string = null
            if (utcFormats.has(formatString)) {
                formatter = utcFormats.get(formatString)
            } else {
                formatter = utcFormat(formatString)
                utcFormats.set(formatString, formatter)
            }
            return formatter(context)
        }
    } else {
        return 'Wrong format'
    }
})

Handlebars.registerHelper('timeFormat', function (context: unknown, formatString: unknown) {
    if (context === null) {
        return 'null';
    }
    if (typeof formatString === 'string') {
        if (typeof context === 'object' && context instanceof Date) {
            let formatter: (date: Date) => string = null
            if (dateFormats.has(formatString)) {
                formatter = dateFormats.get(formatString)
            } else {
                formatter = timeFormat(formatString)
                dateFormats.set(formatString, formatter)
            }
            return formatter(context)
        }
    } else {
        return 'Wrong format'
    }
})

Handlebars.registerHelper('scale', function (
    id: string,
    type: ScaleType,
    ...args: unknown[]) {
    if (typeof id === 'string' && id !== '') {
        switch (type) {
            case 'linear': {
                const [domain1, domain2, range1, range2] = args as number[]
                const scale = scaleLinear([domain1, domain2], [range1, range2]) as Scale
                scales.set(id, {
                    scale,
                    type
                })
            }
                break;
            case 'log': {
                const [domain1, domain2, range1, range2] = args as number[]
                const scale = scaleLog([domain1, domain2], [range1, range2]) as Scale
                scales.set(id, {
                    scale,
                    type
                })
            }
                break;
            case 'band': {
                const [domain, range1, range2] = args;
                const scale = scaleBand(<string[]>domain, [<number>range1, <number>range2])
                scales.set(id, {
                    scale,
                    type
                })
            }
                break;
            case 'ordinal': {
                const [domain, range1, range2] = args;
                const scale = scaleOrdinal(<string[]>domain, [<number>range1, <number>range2])
                scales.set(id, {
                    scale,
                    type
                })
            }
                break;
            default:
                break;
        }
    } else {
        return 'Wrong scale ID'
    }
    return ''
})

Handlebars.registerHelper('useScale', function (
    id: string,
    context: unknown
) {
    if (typeof id === 'string' && id !== '' && scales.has(id)) {
        const scale = scales.get(id);
        switch (scale.type) {
            case "linear":
                (scale.scale as ScaleLinear<number, number>)(context as number)
                break;
            case "log":
                (scale.scale as ScaleLogarithmic<number, number>)(context as number)
                break;
            case "band":
                (scale.scale as ScaleBand<string>)(context as string)
                break;
            case "ordinal":
                (scale.scale as ScaleOrdinal<string, number>)(context as string)
                break;
            default:
                break;
        }
        return scale.scale(context as any);
    } else {
        return 'Wrong scale ID'
    }
})

Handlebars.registerHelper('array', (...options) => {
    return options.pop();
})

Handlebars.registerHelper('map', (key, array) => {
    return array.map(o => o[key]);
})

Handlebars.registerHelper('min', (array) => {
    return min(array)
})
Handlebars.registerHelper('max', (array) => {
    return max(array)
})
Handlebars.registerHelper('mean', (array) => {
    return mean(array)
})
Handlebars.registerHelper('median', (array) => {
    return median(array)
})
Handlebars.registerHelper('sum', (array) => {
    return sum(array)
})
Handlebars.registerHelper('filter', (array, v) => {
    return filter(array, (a) => a === v)
})

for (const axisFunc in axisFunctions) {
    Handlebars.registerHelper(axisFunc, (id, scaleID) => {
        if (scales.has(scaleID)) {
            const scale = scales.get(scaleID)
            const axis = axisFunctions[axisFunc](scale.scale)
            axes.set(id, axis)
        }
    })
}

Handlebars.registerHelper('useAxis', function (
    id: string
) {
    const axis = axes.get(id);
    if (axis) {
        // eslint-disable-next-line powerbi-visuals/no-http-string
        const group: SVGGElement = document.createElementNS('http://www.w3.org/2000/svg', 'g')
        axis(select(group));
        return decodeURI(group.innerHTML)
    }
})

Handlebars.registerHelper('setupAxis', function (
    id: string,
    method: string,
    ...args: any
) {
    const axis = axes.get(id);
    if (axis) {
        args.pop();
        if (method === 'tickFormat') {
            debugger
            axis.tickFormat(format(args[0]));
        } else {
            axis[method].call(axis, args);
        }
    }
})

Handlebars.registerHelper('sum', function (
    a: number,
    b: number
) {
    return a + b
})

Handlebars.registerHelper('sub', function (
    a: number,
    b: number
) {
    return a - b
})

Handlebars.registerHelper('multiply', function (
    a: number,
    b: number
) {
    return a * b
})

Handlebars.registerHelper('divide', function (
    a: number,
    b: number
) {
    return a / b
})

Handlebars.registerHelper('var', function (
    name: string,
    value: number
) {
    variables.set(name, value)
})

Handlebars.registerHelper('val', function (
    name: string
) {
    return variables.get(name)
})

Handlebars.registerHelper('math', function (
    method: string,
    ...args: any[]
) {
    args.pop()
    if (args.length) {
        return Math[method].call(Math, args)
    } else {
        return Math[method]
    }
})
