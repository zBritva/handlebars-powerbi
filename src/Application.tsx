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
    const editMode = useAppSelector((state) => state.options.mode || powerbi.EditMode.Default);

    const [value, setValue] = React.useState<string>(templateSource);
    const onChangeValue = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setValue(e.target.value)
    }, [setValue]);

    const onOpenUrl = React.useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {  
        host.launchUrl((e.target as HTMLElement).getAttribute('href'));
        e.preventDefault();
        e.stopPropagation();
    }, [host]);

    // const dispatch = useAppDispatch();

    const selectionManager = React.useMemo(() => {
        return host.createSelectionManager();
    }, [host]);

    const template = React.useMemo(() => {
        return Handlebars.compile(templateSource);
    }, [templateSource]);

    const table = React.useMemo(() => convertData(dataView, host), [dataView, convertData, host])

    React.useEffect(() => {
        const clickableElements = document.querySelectorAll<HTMLElement | SVGElement>('[data-selection=true],[data-selection=false]')
        const selectionClear = document.querySelectorAll<HTMLElement | SVGElement>('[data-selection-clear=true]')
        
        const clearHandlers = []
        selectionClear.forEach(clear => {
            const handler = clear.addEventListener('click', (e) => {
                selectionManager.clear().then(() => {
                    clickableElements.forEach(e => e.setAttribute('data-selection', 'true'))
                })
                e.preventDefault()
                e.stopPropagation()
            })

            clearHandlers.push(handler)
        })

        const selectionHandlers = []
        clickableElements.forEach(element => {

            const handler = element.addEventListener('click', function (e) {
                const dataIndex = element.getAttribute('data-index')
                if (table.rows[dataIndex]) {
                    const selection = table.rows[dataIndex].selection
                    selectionManager
                        .select(selection)
                        .then(selections => {
                            if (selections.length === 0) {
                                clickableElements.forEach(e => e.setAttribute('data-selection', 'true'))
                            } else {
                                // reset all
                                clickableElements.forEach(e => e.setAttribute('data-selection', 'false'))
                                // set selected
                                element.setAttribute('data-selection', 'true')
                            }
                        })
                    e.preventDefault()
                    e.stopPropagation()
                }
            })

            selectionHandlers.push(handler)
        })

        return () => {
            clickableElements.forEach((element, index) => {
                element.removeEventListener('click', selectionHandlers[index])
            })
            selectionClear.forEach((element, index) => {
                element.removeEventListener('click', clearHandlers[index])
            })
        }
    }, [host, table, selectionManager])

    const content = React.useMemo(() => {
        hardReset()
        Handlebars.unregisterHelper('useColor')
        Handlebars.registerHelper('useColor', function (val: string) {
            return host.colorPalette.getColor(val).value
        })
        Handlebars.unregisterHelper('useSelection')
        Handlebars.registerHelper('useSelection', function (index: number) {
            if (table.rows[index] && typeof index === 'number') {
                return `data-selection=true data-index="${index}"`
            }
        })
        Handlebars.unregisterHelper('useSelectionClear')
        Handlebars.registerHelper('useSelectionClear', function () {
            return `data-selection-clear="true"`
        })
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

    const onBackgroundContextMenu = React.useCallback((e: React.MouseEvent) => {
        selectionManager.showContextMenu(null, {
            x: e.clientX,
            y: e.clientY
        })
    }, [selectionManager]);

    const onBackgroundClick = React.useCallback((e: React.MouseEvent) => {
        selectionManager.clear()
        e.preventDefault()
    }, [selectionManager]);

    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const onSaveClick = React.useCallback((e: React.MouseEvent) => {
        const template = textareaRef.current.value

        host.persistProperties({
            replace: [
                {
                    objectName: 'template',
                    selector: undefined,
                    properties: {
                        chunk0: template
                    }
                }
            ]
        })

        e.preventDefault()
        e.stopPropagation()
    }, [host, textareaRef]);

    return (<>
        <>
            <ErrorBoundary>
                {templateSource.trim() === '' && editMode === powerbi.EditMode.Default ? (
                    <div className='tutorial'>
                        <h4>Template is empty</h4>
                        <p>Read more about the visual in official documentation:</p>
                        <a onClick={onOpenUrl} href='https://ilfat-galiev.im/docs/handelbars-visual/'>https://ilfat-galiev.im/docs/handelbars-visual/</a>
                    </div>
                ) : 
                editMode === powerbi.EditMode.Advanced ?
                    <div className='import'>
                        <h4>Paste template schema and click on Save for loading</h4>
                        <p>or use alternative editor (<a onClick={onOpenUrl} href='https://ilfat-galiev.im/docs/handelbars-visual/step-by-step'>Power BI Visual Editor</a>) with syntax highlight</p>
                        <button className='save' onClick={onSaveClick}>
                            Save
                        </button>
                        <textarea ref={textareaRef} onChange={onChangeValue} value={value}>

                        </textarea>
                    </div>:
                    <div
                        onClick={onBackgroundClick}
                        onContextMenu={onBackgroundContextMenu}
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
                }
            </ErrorBoundary>
        </>
    </>)

}

