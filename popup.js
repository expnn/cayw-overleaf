const ENABLED_URL_PAT = /https:\/\/.*\.overleaf.com/; 

document.addEventListener('DOMContentLoaded', () => {

    const dialogBox = document.getElementById('dialog-box');
    const dialogStatus = document.getElementById('dialog-status'); 
    const query = { active: true, currentWindow: true };

    chrome.tabs.query(query, (tabs) => {
        console.log("URL: ", tabs);
        let tab = tabs[0]; 
        if (tab) {
            dialogBox.innerHTML = getBarkedTitle(tab.title);
            console.log("URL: ", tab); 
            const match = ENABLED_URL_PAT.exec(tab.url);
            if (match) {
                dialogStatus.setAttribute("src", "images/linked.png"); 
            } else {
                dialogStatus.setAttribute("src", "images/unlinked.png"); 
            }
        }
    });
});

/**
 * Concatenates the tab title with Acho's barks.
 * @param {String} tabTitle Current tab title
 */
const getBarkedTitle = (tabTitle) => {
    const barkTitle = `${getRandomBark()} Ahem.. I mean, we are at: ${tabTitle}`
    return barkTitle;
}

/**
 * List of possible barks.
 */
const barks = [
    'Barf barf!',
    'Birf birf!',
    'Woof woof!',
    'Arf arf!',
    'Yip yip!',
    'Biiiirf!'
]

/**
 * Returns a random bark from the list of possible barks.
 */
const getRandomBark = () => {
    const bark = barks[Math.floor(Math.random() * barks.length)];
    return bark;
}
