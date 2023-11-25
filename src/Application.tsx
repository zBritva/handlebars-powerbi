import React from 'react';

// import powerbiApi from "powerbi-visuals-api";

import { useAppSelector } from './redux/hooks';
// import { setSettings } from './redux/slice';
// import { IVisualSettings } from './settings';
import { convertData, sanitizeHTML } from './utils';

import Handlebars from "handlebars";

import './helpers';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ApplicationProps {
}

/* eslint-disable max-lines-per-function */
export const Application: React.FC<ApplicationProps> = () => {

    // const settings = useAppSelector((state) => state.options.settings);
    // const option = useAppSelector((state) => state.options.options);
    // const host = useAppSelector((state) => state.options.host);

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

    console.log('context', table)

    const content = React.useMemo(() => template({
        table,
        viewport
    }), [table, template])

    console.log('content', content)

    const clean = React.useMemo(() => sanitizeHTML(content), [content, sanitizeHTML])

    return (<>
        <>
            <div
                style={{
                    width: viewport.width,
                    height: viewport.height,
                    overflow: 'scroll'
                }}
                dangerouslySetInnerHTML={{
                    __html: clean
                }}
                >
            </div>
        </>
    </>)
    
}

