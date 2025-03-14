const LOG_PREFIX = "[content:cayw-overleaf]";
const MESSAGE_TYPE = "cayw-overleaf"
console.debug(LOG_PREFIX, "Initializing...");

const COLLECTION_RE = /-\*-\s*zotero-sharelatex-cayw-collection:\s*(.*?)\s*-\*-/;
const DROP_FIELDS = (() => {
    const conf = ["abstract", "file", "keywords", "eprint", "eprinttype"];
    const ans = new Set();
    for (const elem of conf) {
        ans.add(elem);
    }
    return ans;
})();

const DROP_FIELDS_FOR_TYPE = (() => {
    const conf = [
        ["article", ["url", "urldate"]],
        ["incollection", ["url", "urldate"]],
        ["book", ["edition", "volume", "series"]]
    ];
    const ans = new Map();
    for (const pair of conf) {
        const type = pair[0];
        const fields = pair[1];
        const field_set = new Set();
        for (const field of fields) {
            field_set.add(field);
        }
        ans.set(type, field_set);
    }
    return ans;
})();

const EMPTY_SET = new Set();

function cleanBib(string) {
    const lines = string.match(/[^\r\n]+/g);
    const clean = [];
    let groups, type, key, field;
    let skip = false;
    for (let line of lines) {
        if (line.match(/^%/)) {
            continue;
        } else if (groups = line.match(/^@(.*?)\{(.*),/)) {
            type = groups[1];
            key = groups[2];
            skip = false;
        } else if (groups = line.match(/^  (.*?) = \{/)) {
            field = groups[1];
            const drop_fields_for_type = DROP_FIELDS_FOR_TYPE.get(type) || EMPTY_SET;
            skip = DROP_FIELDS.has(field) || drop_fields_for_type.has(field);
        } else if (line.match(/^\}/)) {
            skip = false
        }

        if (!skip) {
            // make sure trailing commas are present
            line = line.replace(/(?!^)\}$/, "},");
            clean.push(line)
        } else {
            console.debug(LOG_PREFIX, "Removing field", field, "in entry type", type, "with key", key);
        }
    }
    return clean.join("\n");
}


function create_new_bibliography(head, text) {
    return {
        data: [head, cleanBib(text)],
        clear_node: "cm-lineWrapping",
    }
}

function create_citation(text) {
    return {
        data: text,
        clear_node: false,
    }
}

function zotError() {
    const msg = "Can't reach the bibliography database! Make sure that Zotero is " +
        "running and the Better BibTeX extension for Zotero is installed.";
    console.error(LOG_PREFIX, msg);
    alert(msg);
}

function zotWarnAndAsk() {
    const msg = "No collection declaration found in file. Specify one in the following " +
        "format:\n\n" +
        "  % -*- zotero-sharelatex-cayw-collection: <library-number>/<collection-name>.<format> -*-\n\n" +
        "E.g. the following will generate a biblatex bibliography for a collection named " +
        "NLP within your private Zotero library (0):\n\n" +
        "  % -*- zotero-sharelatex-cayw-collection: 0/NLP.biblatex -*-\n\n" +
        "To figure out the identifier for a collection, right-click on the collection " +
        "in Zotero, select Download Better BibTeX export, and inspect the generated " +
        "URLs.\n\n" +
        "As a default, I can also just try to insert a bibliography based on your " +
        "entire private library, but that may take a while, depending on its size. " +
        "Proceed?";
    console.warn(LOG_PREFIX, msg);
    return confirm(msg);
}


function makeInsert(insert_info) {
    const clear_node = insert_info.clear_node;
    const payload = insert_info.data;
    const editor = document.getElementById("panel-source-editor");

    if (clear_node) {
        var elem = editor.getElementsByClassName(clear_node);
        if (elem.length == 0) {
            console.error(`Could not find '${clear_node}' node. `);
        } else {
            if (elem.length > 1) {
                console.warn(`Find multiple ${clear_node} nodes. Only the first will be empty. `);
            }
            elem[0].innerText = "";
        }
    }

    const selection = window.getSelection();
    selection.collapseToEnd();

    if (typeof payload === 'string') {
        selection.getRangeAt(0).insertNode(document.createTextNode(payload));
        selection.collapseToEnd();
    } else if (Array.isArray(payload)) {
        for (var line of payload) {
            selection.getRangeAt(0).insertNode(document.createTextNode(line));
            selection.collapseToEnd();
            selection.getRangeAt(0).insertNode(document.createTextNode("\n"));
            selection.collapseToEnd();
        }
    } else {
        console.error(`Got unsupported data: ${payload}`);
    }
    // editor.addEventListener("insertZoteroInfo", (event) => {
    //     const clear_node = event.detail.clear_node;
    //     const payload = event.detail.data;

    //     if (clear_node) {
    //         var elem = editor.getElementsByClassName(clear_node);
    //         if (elem.length == 0) {
    //             console.error(`Could not find '${clear_node}' node. `);
    //         } else {
    //             if (elem.length > 1) {
    //                 console.warn(`Find multiple ${clear_node} nodes. Only the first will be empty. `);
    //             }
    //             elem[0].innerText = "";
    //         }
    //     }

    //     const selection = window.getSelection();
    //     selection.collapseToEnd();

    //     if (typeof payload === 'string') {
    //         selection.getRangeAt(0).insertNode(document.createTextNode(payload));
    //         selection.collapseToEnd();
    //     } else if (Array.isArray(payload)) {
    //         for (var line of payload) {
    //             selection.getRangeAt(0).insertNode(document.createTextNode(line));
    //             selection.collapseToEnd();
    //             selection.getRangeAt(0).insertNode(document.createTextNode("\n"));
    //             selection.collapseToEnd();
    //         }
    //     } else {
    //         console.error(`Got unsupported data: ${payload}`);
    //     }
    // });


    // editor.dispatchEvent(new CustomEvent("insertZoteroInfo", { detail: insert_info }));
}


// async function zoteroFetchAndInsert(url, postProcessFunc) {
//     console.debug(LOG_PREFIX, "Sending request to Better BibTeX URL", url);
//     fetch(url, {
//         method: 'GET',
//         headers: {
//             'Zotero-Allowed-Request': true,
//         }
//     }).then(response => {
//         if (!response.ok) {
//             throw new Error(`HTTP error! Status: ${response.status}`);
//         } else {
//             return response.text();
//         }
//     }).then(text => {
//         const content = postProcessFunc(text);
//         makeInsert(content);
//     }).catch(error => {
//         console.debug(LOG_PREFIX, "fetch failed");
//         zotError();
//     });
// }

// async function zoteroInsertBibliography() {
//     let req_suffix;

//     for (var line of editor.getElementsByClassName("cm-line")) {
//         line = line.innerText;
//         console.debug("[insert bib]: ", line);
//         const match = COLLECTION_RE.exec(line);
//         if (match) {
//             req_suffix = "collection?/" + match[1];
//             await zoteroFetchAndInsert(
//                 "http://localhost:23119/better-bibtex/" + req_suffix,
//                 text => create_new_bibliography(line, text),
//             );
//             return;
//         }
//     }
//     if (!zotWarnAndAsk()) {
//         return;
//     }

//     await zoteroFetchAndInsert(
//         "http://localhost:23119/better-bibtex/library?/0/library.biblatex",
//         text => create_new_bibliography("% -*- zotero-sharelatex-cayw-collection: 0/library.biblatex -*-", text),
//     );
// }

// async function zoteroCite() {
//     await zoteroFetchAndInsert(
//         // TODO: customize citation format by modifying the URL
//         "http://localhost:23119/better-bibtex/cayw?format=latex",
//         // TODO: you can manipulate the string before it's inserted
//         create_citation,
//     );
// }


function prepare_fetch_inputs(message) {
    const editor = document.getElementById("panel-source-editor");

    function extract_collection(doc) {
        // console.debug(LOG_PREFIX, "[match bib collection]: ", doc);
        const match = COLLECTION_RE.exec(doc);
        if (match) {
            req_suffix = "collection?/" + match[1];
            return {
                url: "http://localhost:23119/better-bibtex/" + req_suffix,
                extra_line: `% -*- zotero-sharelatex-cayw-collection: ${match[1]} -*-`,
            };
        }
        return null;
    }
    switch (message.job) {
        case 'insert-citation':
            console.debug(LOG_PREFIX, "prepare URL for insert_citation");
            return {
                url: "http://localhost:23119/better-bibtex/cayw?format=latex",
            };
        case 'insert-bibliography':
            console.debug(LOG_PREFIX, "prepare URL for insert_bibliography");
            let req_suffix;

            for (var line of editor.getElementsByClassName("cm-line")) {
                let r = extract_collection(line.innerText);
                if (r) {
                    return r;
                }
            }

            console.debug(LOG_PREFIX, "Did not find collection from cm-lines. ");
            const cm_editor = editor.getElementsByClassName("cm-editor")[0];
            if (cm_editor) {
                const extra_text = cm_editor.getAttribute('data-grammarly-text');
                console.debug(LOG_PREFIX, "Find 'data-grammarly-text' attribute in cm-editor. Try to find collection name from this attribute. ");
                let r = extract_collection(extra_text);
                if (r) {
                    return r;
                }
            }
            if (!zotWarnAndAsk()) {
                break;
            }
            return {
                url: "http://localhost:23119/better-bibtex/library?/0/library.bibtex",
                extra_line: "% -*- zotero-sharelatex-cayw-collection: 0/library.biblatex -*-",
            }
            break;
        default:
            console.warn(LOG_PREFIX, `prepare_url - Command ${command} not found`);
    }
    return null;
}

function postprocess(message) {
    if (message === undefined || message === null) {
        return null;
    }
    switch (message.job) {
        case 'insert-citation':
            return create_citation(message.payload.text);
        case 'insert-bibliography':
            return create_new_bibliography(message.payload.extra_line, message.payload.text);
        default:
            console.warn(LOG_PREFIX, `postprocess - Command ${command} not found`);
            return null;
    }
}


function mapObjectValues(obj, mappingFunction) {
    // Base case: If the current object is not an object or is null, return it as is
    if (typeof obj !== 'object' || obj === null || obj === undefined) {
        return mappingFunction(obj);
    }

    // If the object is an array, map its elements
    if (Array.isArray(obj)) {
        return obj.map(element => mapObjectValues(element, mappingFunction));
    }

    // If the object is a regular object, map its values
    const mappedObject = {};
    for (const key in obj) {
        mappedObject[key] = mapObjectValues(obj[key], mappingFunction);
    }

    return mappedObject;
}


chrome.runtime.onMessage.addListener(async function (message, sender, sendResponse) {
    if (message === null || message === undefined) {
        return; 
    }
    if (message.type != MESSAGE_TYPE) {
        return;
    }

    console.debug(LOG_PREFIX, `recieved message ${message}`);

    if (message.operation == "fetch-and-insert") {
        const payload = prepare_fetch_inputs(message);
        // 在 content script 里面无法调用 fetch 获取本地 zotero 的数据，因为 CORS policy. 
        // 因此不得不将 url 等信息发送回 background scrit，并在 background scrit 进行 fetch 操作获取要插入的数据，
        // 再将获取到的数据发送回 content script 进行真正的插入工作。实现流程参考了：
        // https://javascript.plainenglish.io/fetch-data-in-chrome-extension-v3-2b73719ffc0e
        chrome.runtime.sendMessage(
            {
                type: MESSAGE_TYPE,
                job: message.job,
                operation: 'fetch',
                payload: payload,
            },
        ).then(
            (resp) => {
                console.debug(LOG_PREFIX, mapObjectValues(resp, (x) => {
                    if (typeof x === 'string') {
                        if (x.length > 200) {
                            return x.substring(0, 200) + '...';
                        }
                    }
                    return x;
                }));
                const content = postprocess(resp);
                if (content) {
                    makeInsert(content);
                } else {
                    console.warn(LOG_PREFIX, "Failed to get content to insert. ");
                }
            },
            (error) => {
                console.warn(LOG_PREFIX, "Failed to fetch content from the url: ", payload.url, error);
            }
        )
    }
});

console.debug(LOG_PREFIX, "Initialized");
