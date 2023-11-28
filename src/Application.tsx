import React from 'react';

// import powerbiApi from "powerbi-visuals-api";

import { useAppSelector } from './redux/hooks';
// import { setSettings } from './redux/slice';
// import { IVisualSettings } from './settings';
import { convertData, sanitizeHTML } from './utils';

import Handlebars from "handlebars";

import './helpers';
import { hardReset } from './helpers';

import { ErrorBoundary } from './Error';


// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ApplicationProps {
}

/* eslint-disable max-lines-per-function */
export const Application: React.FC<ApplicationProps> = () => {

    // const settings = useAppSelector((state) => state.options.settings);
    // const option = useAppSelector((state) => state.options.options);
    const host = useAppSelector((state) => state.options.host);

    const dataView = useAppSelector((state) => state.options.dataView);
    const viewport = useAppSelector((state) => state.options.viewport);
    const templateSource = useAppSelector((state) => state.options.template);

    // const dispatch = useAppDispatch();

    const template = React.useMemo(() => {
        return Handlebars.compile(templateSource);
    }, [templateSource]);

    React.useEffect(() => {
        
    }, []);

    const table = React.useMemo(() => convertData(dataView), [dataView, convertData]);

    const content = React.useMemo(() => {
        hardReset()
        Handlebars.unregisterHelper('useColor')
        Handlebars.registerHelper('useColor', function (val: string) {
            return host.colorPalette.getColor(val).value
        });
        try {
            return template({
                table,
                viewport
            })
        } catch (err) {
            return `<h4>${err.message}</h4><pre>${err.stack}</pre>`
        }
    }, [host, table, viewport, template])

    const clean = React.useMemo(() => sanitizeHTML(content), [content, sanitizeHTML])

    return (<>
        <>
            <ErrorBoundary>
                <div
                    style={{
                        width: viewport.width,
                        height: viewport.height,
                        // overflow: 'scroll'
                    }}
                    dangerouslySetInnerHTML={{
                        __html: clean
                    }}
                    >
                </div>
            </ErrorBoundary>
        </>
    </>)
    
}

