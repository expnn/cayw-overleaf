const LOG_PREFIX = "[background:cayw-overleaf]:"; 
const MESSAGE_TYPE = "cayw-overleaf"


chrome.commands.onCommand.addListener(async (command) => {
    console.debug(LOG_PREFIX, `sending ${command} message`);
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        // Send a message to the content script in the active tab
        chrome.tabs.sendMessage(tabs[0].id, { 
            type: MESSAGE_TYPE, 
            job: command, 
            operation: 'fetch-and-insert', 
        });
    });
});


chrome.runtime.onMessage.addListener(function (message, sender, senderResponse) {
    if (message === null || message === undefined) {
        return false; 
    }
    if (message.type != MESSAGE_TYPE) {
        return false;
    }

    if (message.type === MESSAGE_TYPE && message.operation == 'fetch') {
        console.debug(LOG_PREFIX, message); 
        if (message.payload === null || message.payload === undefined) {
            return false; 
        }
        fetch(message.payload.url, {
            method: 'GET',
            headers: { 'Zotero-Allowed-Request': true },
        }).then(res => {
            return res.text();
        }).then(res => {
            console.log(LOG_PREFIX, res.length > 200 ? res.substring(0, 200) : res, res.length > 200 ? '...' : ''); 
            senderResponse({
                type: MESSAGE_TYPE, 
                job: message.job, 
                payload: {text: res, extra_line: message.payload.extra_line}, 
                operation: "insert", 
            });
        })
    }
    return true
});
