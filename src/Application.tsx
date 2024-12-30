import React from 'react';

// import powerbiApi from "powerbi-visuals-api";

import { useAppSelector } from './redux/hooks';
// import { setSettings } from './redux/slice';
// import { IVisualSettings } from './settings';
import { convertData, sanitizeHTML } from './utils';

import Handlebars from "handlebars";
import AceEditor from "react-ace";

import "ace-builds/src-noconflict/mode-handlebars";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/ext-language_tools";

import './helpers';
import { hardReset } from './helpers';

import { ErrorBoundary } from './Error';
import { Splitter, Button } from 'antd';

import JSON5 from 'json5'

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

    const [isSaved, setIsSaved] = React.useState<boolean>(true);
    const [isRaw, setRawView] = React.useState<boolean>(true);

    const [value, setValue] = React.useState<string>(templateSource);
    console.log('value', value);

    React.useEffect(() => {
        if (value.trim() == "" && templateSource.trim() != "") {
            setValue(templateSource);
        }
    }, [value, templateSource]);

    const configPart = React.useMemo(() => {
        const configParser = /( )*<!--((.*)|[^<]*|[^!]*|[^-]*|[^>]*)-->\n*/g;
        const config = configParser.exec(value);
        if (config && config.length && config[2]) {
            return config[2];
        } else {
            return "{}";
        }
    }, [value]);

    const config = React.useMemo(() => {
        try {
            return JSON5.parse(configPart.replace(/\n/g, ''));
        }
        catch (ex) {
            return {
                error: ex.Message
            }
        }
    }, [configPart]);

    const onChangeValue = React.useCallback((value: string) => {
        draft.current = value;
        setValue(value)
        setIsSaved(false);
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

    const table = React.useMemo(() => convertData(dataView, config, host), [dataView, convertData, host])

    React.useEffect(() => {
        const clickableElements = document.querySelectorAll<HTMLElement | SVGElement>('[data-selection=true],[data-selection=false]')
        const selectionClear = document.querySelectorAll<HTMLElement | SVGElement>('[data-selection-clear=true]')
        const launchUrlElements = document.querySelectorAll<HTMLElement | SVGElement>('[data-launch-url=true]')

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
        const contextMenuHandlers = []
        const launchUrlHandlers = []

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

            const contextMenuHandler = element.addEventListener('contextmenu', function (e: MouseEvent) {
                const dataIndex = element.getAttribute('data-index')
                if (table.rows[dataIndex]) {
                    const selection = table.rows[dataIndex].selection
                    selectionManager
                        .showContextMenu(selection, {
                            x: e.clientX,
                            y: e.clientY
                        });
                    e.preventDefault()
                    e.stopPropagation()
                }
            });
            contextMenuHandlers.push(contextMenuHandler)
        })

        launchUrlElements.forEach(element => {
            const handler = element.addEventListener('click', function (e) {
                const url = element.getAttribute('data-url')
                e.preventDefault()
                e.stopPropagation()
                host.launchUrl(decodeURIComponent(url))
            })
            launchUrlHandlers.push(handler)
        });

        return () => {
            clickableElements.forEach((element, index) => {
                element.removeEventListener('click', selectionHandlers[index])
            })
            clickableElements.forEach((element, index) => {
                element.removeEventListener('contextmenu', contextMenuHandlers[index])
            })
            selectionClear.forEach((element, index) => {
                element.removeEventListener('click', clearHandlers[index])
            })
            launchUrlElements.forEach((element, index) => {
                element.removeEventListener('click', launchUrlHandlers[index])
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
        e.preventDefault()
        e.stopPropagation()
    }, [selectionManager]);

    const onBackgroundClick = React.useCallback((e: React.MouseEvent) => {
        selectionManager.clear()
        e.preventDefault()
        e.stopPropagation()
    }, [selectionManager]);

    const draft = React.useRef<string>(templateSource);

    const onSaveClick = React.useCallback((e: React.MouseEvent) => {
        const template = draft.current

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
        setIsSaved(true);
    }, [host, draft]);

    const onRawClick = React.useCallback(() => {
        setRawView(true);
    }, [setRawView]);

    const onPreviewClick = React.useCallback(() => {
        setRawView(false);
    }, [setRawView]);

    const onHelp = React.useCallback(() => {
        host.launchUrl("https://ilfat-galiev.im/docs/category/htmlsvghandlebars-visual");
    }, [host]);

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
                            <div className='save-bar'>
                                <Button className='save' onClick={onSaveClick} type='primary'>
                                    Save
                                </Button>
                                <Button className='raw' onClick={onRawClick}>
                                    Raw output
                                </Button>
                                <Button className='preview' onClick={onPreviewClick}>
                                    Preview
                                </Button>
                                <Button className='help' onClick={onHelp}>
                                    Help
                                </Button>
                                <p className={`saved-notification ${isSaved ? "off" : ""}`}>Changes aren't saved...</p>
                            </div>
                            <Splitter style={{ boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)' }}>
                                <Splitter.Panel defaultSize="40%" min="20%" max="70%">
                                    <AceEditor
                                        onChange={onChangeValue}
                                        className="editor"
                                        width="100%"
                                        height="100%"
                                        mode="handlebars"
                                        theme="github"
                                        setOptions={{
                                            useWorker: false,
                                            readOnly: false
                                        }}
                                        value={value}
                                        name="OUTPUT_ID"
                                        editorProps={{ $blockScrolling: true }}
                                    />
                                </Splitter.Panel>
                                <Splitter.Panel>
                                    {
                                        isRaw ? (
                                            <pre>
                                                {content?.trim()}
                                            </pre>
                                        ) : (
                                            <div
                                                style={{
                                                    width: "100%",
                                                    height: "100%"
                                                }}
                                                dangerouslySetInnerHTML={{
                                                    __html: clean
                                                }}
                                            >
                                            </div>
                                        )
                                    }
                                </Splitter.Panel>
                            </Splitter>
                        </div> :
                        <div
                            onClick={onBackgroundClick}
                            onContextMenu={onBackgroundContextMenu}
                            style={{
                                width: viewport.width,
                                height: viewport.height,
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

