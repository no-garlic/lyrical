
import { StreamHelper } from "./util_stream_helper.js";
import { toastSystem } from './util_toast.js';
import { DragDropSystem } from './util_dragdrop.js';
import { apiLyricsEdit } from './api_lyrics_edit.js';
import { apiSectionEdit } from './api_section_edit.js';
import { apiRenderComponent } from './api_render_component.js';
import { Markup } from './util_markup.js';
import { checkSummarizationAndGenerate } from './util_summarization_modal.js';


// Matches BadgeLyrics.html
const BADGES = {
    MARKER_BUTTON: 0,
    ERASER_BUTTON: 1,
    RHYME_BUTTON: 2,
    INTERACTIVE_BUTTON: 3,
    REGENERATE_BUTTON: 4,
    TEXTEDIT_BUTTON: 5,
    EXIT_BUTTON: 6,
    TOOLS_BUTTON: 7,
};


// Matches BadgeLyrics.html
const PANELS = {
    TEXTAREA: 0,
    INTERACTIVE: 1,
    REGENERATE: 2
};


let streamHelperSong;
let streamHelperSection;
let streamHelperRhyme;
let regenerateButton;
let dragDropSystem;
let markupSystem;
let lyricsDirty = false;
let lyricsHistory = {};
let editCard = null;
let editMode = 'none';


const songId = document.body.dataset.songId;


document.addEventListener('DOMContentLoaded', () => {
    initPageActions();
    initBadgeActions();
    initStreamHelpers();
    initDragDrop();
    initMarkupSystem();
    copyToSaveHistory();
    updateLyricsListing();
    applyFilter();
});


// =================================================================================
// Initialise the systems
// =================================================================================


function initPageActions() {
    // navigate next button
    const nextButton = document.getElementById('btn-navigate-next');
    nextButton.classList.remove('btn-disabled');
    nextButton.onclick = () => { window.location.href = `/edit/${songId}`; };

    // navigate previous button
    const prevButton = document.getElementById('btn-navigate-prev');
    prevButton.classList.remove('btn-disabled');
    prevButton.onclick = () => { window.location.href = `/structure/${songId}`; };

    // text input event handlers
    document.querySelectorAll('[id*="lyrics-text-"').forEach(item => {
        item.addEventListener('input', setLyricsDirty);
    });

    // general page actions
    document.getElementById('btn-save').onclick = saveLyrics;
    document.getElementById('btn-undo').onclick = undoLyrics;
    document.getElementById('btn-copy').onclick = copyLyrics;
    document.getElementById('btn-export').onclick = exportLyrics;
}


function initBadgeActions() {
    document.querySelectorAll('.badge-marker-button').forEach(button => {
        button.onclick = badgeMarkerButtonClick;
    });
    document.querySelectorAll('.badge-eraser-button').forEach(button => {
        button.onclick = badgeEraserButtonClick;
    });
    document.querySelectorAll('.badge-tools-button').forEach(button => {
        button.onclick = badgeToolsButtonClick;
    });
    document.querySelectorAll('.badge-exit-button').forEach(button => {
        button.onclick = badgeExitButtonClick;
    });
    document.querySelectorAll('.badge-rhyme-button').forEach(button => {
        button.onclick = badgeRhymeButtonClick;
    });
    document.querySelectorAll('.badge-interactive-button').forEach(button => {
        button.onclick = badgeInteractiveButtonClick;
    });
    document.querySelectorAll('.badge-textedit-button').forEach(button => {
        button.onclick = badgeTextEditButtonClick;
    });
    document.querySelectorAll('.badge-regenerate-button').forEach(button => {
        button.onclick = badgeRegenerateButtonClick;
    });
    document.querySelectorAll('.badge-hide-button').forEach(button => {
        button.onclick = badgeHideButtonClick;
    });

    document.getElementById('btn-generate').addEventListener('click', handleGenerateClick);

    document.querySelectorAll('.btn-regenerate').forEach(button => {
        button.addEventListener('click', function() {
            regenerateButton = this;
            console.log(`clicked button: ${regenerateButton}`);

            handleRegenerateClick.call();
        });
    });

    document.querySelectorAll('.btn-clear').forEach(button => {
        button.addEventListener('click', function() {
            if (editMode === 'interactive' || editMode === 'regenerate') {
                clearAllVisibleSections.call();
            } else if (editMode === 'rhyme') {
                clearAllVisibleWords.call();
            }            
        });
    });

}


function initStreamHelpers() {
    streamHelperSong = createStreamHelperSong();
    streamHelperSection = createStreamHelperSection();
    streamHelperRhyme = createStreamHelperRhyme();
}


function initDragDrop() {
    
    // create the drag and drop system and assign to module-level variable
    dragDropSystem = new DragDropSystem({ 
        insertElementOnDrop: false
    });

    // initialise it
    dragDropSystem.init({
        onDragStart: (item, event) => {
        },
        onDrop: handleDragDrop,
        canDrop: (item, zone, event) => {
            return true;
        },
        onDragEnterZone: (item, zone, event) => {
        },
        onDragLeaveZone: (item, zone, event) => {
        }
    });

    // register draggable items
    document.querySelectorAll('.section-text-card').forEach(card => {
        registerCardForDragDrop(card);
    });

    return dragDropSystem;
}


function initMarkupSystem() {
    markupSystem = new Markup({
        markerMulti: 'bg-error',
        markerSingle: 'bg-success',
        replaceMarkedLinesWith: '<line>',
        replaceMarkedSequencesWith: '<words>',
        replaceMarkedWordsWith: '<word>',
        highlightHeight: '-5px',
        paddingLeft: '12px',
        paddingTop: '9px',
        lineSpacing: '0.13rem',
        lineHeight: '1.37',
        wordSpacing: '0px',
    });
    
    markupSystem.init({
        onTextChanged: () => {
            //debugShowInteractiveText();
            updateRegenerateButtonAppearance();
        },
        onToolChanged: (tool) => {
            updateMarkupButtonAppearances();
        },
        onWordReplaced: (line, index, oldWord, newWord) => {
        }        
    });
}


// =================================================================================
// Streaming Data for Song Generation
// =================================================================================


function handleGenerateClick() {
    const actualGenerate = () => {
        const requestParams = {
            prompt: 'song_lyrics',
            song_id: songId,
        };
        streamHelperSong.initiateRequest(requestParams);
    };
    
    checkSummarizationAndGenerate(songId, actualGenerate, 'lyrics');
}


function handleRegenerateClick() {
    if (editCard) {
        const actualRegenerate = () => {
            const sectionType = editCard.firstElementChild.dataset.sectionName;
            console.log(`initiate request for sectionType: ${sectionType}`)

            const customRequest = document.getElementById('input-custom-request');

            const requestParams = {
                song_id: songId,
                section_type: sectionType,
                custom_prompt: customRequest.value.trim()
            };

            if (editMode === 'interactive') {
                requestParams['prompt'] = 'song_lyrics_section';
                requestParams['markup_lyrics'] = getTextFromInteractivePanel().trim();
                requestParams['count'] = 2;
                streamHelperSection.initiateRequest(requestParams);
            } else if (editMode === 'rhyme') {

                const songSection = getTextFromInteractivePanel('raw').trim();
                const { word, line, index } = getFirstMarkedWordFromInteractivePanel();
                const wordsToExclude = getCurrentWordsFromRhymeContainer();

                requestParams['prompt'] = 'song_words';
                requestParams['rhyme_with'] = word;
                requestParams['word_line'] = line;
                requestParams['word_index'] = index;
                requestParams['count'] = 12;
                requestParams['song_section'] = songSection;
                requestParams['exclude_list'] = wordsToExclude;
                streamHelperRhyme.initiateRequest(requestParams);
            } else {
                requestParams['prompt'] = 'song_lyrics_section';
                requestParams['count'] = 2;
                streamHelperSection.initiateRequest(requestParams);
            }
        };
        
        if (editMode === 'rhyme') {
            checkSummarizationAndGenerate(songId, actualRegenerate, 'rhyme');
        } else {
            checkSummarizationAndGenerate(songId, actualRegenerate, 'section');
        }        
    } else {
        console.error('editCard is null!!')
    }
}


function createStreamHelperSong() {
    return new StreamHelper('/api_gen_song_lyrics', {
        callbacks: {
            onPreRequest: () => {
                console.log("stream prerequest");
                handleSongDataStreamStart();
            },
            onIncomingData: (data) => {
                console.log(`incoming stream data ${JSON.stringify(data, null, 2)}`);
                handleSongDataStreamData(data);
            },
            onStreamEnd: () => {
                console.log("=== Song stream end ===");
            },
            onComplete: (summaryInfo) => {
                console.log("=== Song stream complete ===");
                console.log("Received summaryInfo:", summaryInfo);
                handleSongDataStreamEnd(summaryInfo);
            },
            onError: (error) => {
                console.error("stream error:", error);
                handleSongDataStreamError(error);
            }
        }
    });
}


function createStreamHelperSection() {
    return new StreamHelper('/api_gen_song_lyrics_section', {
        callbacks: {
            onPreRequest: () => {
                console.log("stream prerequest");
                handleSectionDataStreamStart();
            },
            onIncomingData: (data) => {
                console.log(`incoming stream data ${JSON.stringify(data, null, 2)}`);
                handleSectionDataStreamData(data);
            },
            onStreamEnd: () => {
                console.log("stream end");
            },
            onComplete: (summaryInfo) => {
                console.log("stream complete");
                handleSectionDataStreamEnd(summaryInfo);
            },
            onError: (error) => {
                console.error("stream error:", error);
                handleSectionDataStreamError(error);
            }
        }
    });
}



function createStreamHelperRhyme() {
    return new StreamHelper('/api_gen_song_words', {
        callbacks: {
            onPreRequest: () => {
                console.log("stream prerequest");
                handleRhymeDataStreamStart();
            },
            onIncomingData: (data) => {
                console.log(`incoming stream data ${JSON.stringify(data, null, 2)}`);
                handleRhymeDataStreamData(data);
            },
            onStreamEnd: () => {
                console.log("stream end");
            },
            onComplete: (summaryInfo) => {
                console.log("stream complete");
                handleRhymeDataStreamEnd(summaryInfo);
            },
            onError: (error) => {
                console.error("stream error:", error);
                handleRhymeDataStreamError(error);
            }
        }
    });
}


function handleSongDataStreamStart() {
    // get the buttons
    const generateButton = document.getElementById('btn-generate');
    const generatingButton = document.getElementById('btn-generating');
    
    // hide the generate button
    if (generateButton) {
        generateButton.classList.add('hidden');
    }

    // show the generating button in disabled state
    if (generatingButton) {
        generatingButton.classList.remove('hidden');
    }
}


function handleSectionDataStreamStart() {
    console.log(`handleSectionDataStreamStart: ${regenerateButton}`);

    // get the regenerating button
    const regeneratingButton = regenerateButton.nextElementSibling;
    
    // hide the regenerate button
    if (regenerateButton) {
        regenerateButton.classList.add('hidden');
    }

    // show the regenerating button in disabled state
    if (regeneratingButton) {
        regeneratingButton.classList.remove('hidden');
    }
}


function handleRhymeDataStreamStart() {
    console.log(`handleRhymeDataStreamStart: ${regenerateButton}`);

    // get the regenerating button
    const regeneratingButton = regenerateButton.nextElementSibling;
    
    // hide the regenerate button
    if (regenerateButton) {
        regenerateButton.classList.add('hidden');
    }

    // show the regenerating button in disabled state
    if (regeneratingButton) {
        regeneratingButton.classList.remove('hidden');
    }
}


function handleSongDataStreamEnd(summaryInfo) {
    // get the buttons
    const generateButton = document.getElementById('btn-generate');
    const generatingButton = document.getElementById('btn-generating');
    
    // hide the generate button
    if (generateButton) {
        generateButton.classList.remove('hidden');
    }

    // show the generating button in disabled state
    if (generatingButton) {
        generatingButton.classList.add('hidden');
    }

    // Handle summarization notification
    if (summaryInfo && summaryInfo.needsSummarisation) {
        import('./util_toast.js').then(({ showError }) => {
            showError('Your lyrics conversation is getting long. Consider summarizing to improve performance.');
        });
    }
}


function handleSectionDataStreamEnd(summaryInfo) {
    console.log(`handleSectionDataStreamEnd: ${regenerateButton}`);

    // get the regenerating button
    const regeneratingButton = regenerateButton.nextElementSibling;
    
    // hide the regenerate button
    if (regenerateButton) {
        regenerateButton.classList.remove('hidden');
    }

    // show the regenerating button in disabled state
    if (regeneratingButton) {
        regeneratingButton.classList.add('hidden');
    }

    // Handle summarization notification
    if (summaryInfo && summaryInfo.needsSummarisation) {
        import('./util_toast.js').then(({ showError }) => {
            showError('Your lyrics conversation is getting long. Consider summarizing to improve performance.');
        });
    }

    regenerateButton = null;
}


function handleRhymeDataStreamEnd(summaryInfo) {
    console.log(`handleRhymeDataStreamEnd: ${regenerateButton}`);

    // get the regenerating button
    const regeneratingButton = regenerateButton.nextElementSibling;
    
    // hide the regenerate button
    if (regenerateButton) {
        regenerateButton.classList.remove('hidden');
    }

    // show the regenerating button in disabled state
    if (regeneratingButton) {
        regeneratingButton.classList.add('hidden');
    }

    // Handle summarization notification
    if (summaryInfo && summaryInfo.needsSummarisation) {
        import('./util_toast.js').then(({ showError }) => {
            showError('Your lyrics conversation is getting long. Consider summarizing to improve performance.');
        });
    }

    regenerateButton = null;
}


function handleSongDataStreamData(data) {
    if (data) {
        // Check if this is an error response
        if (data.error) {
            console.warn('LLM generation error:', data.error, 'Details:', data.details);
            toastSystem.showError(`Generation error: ${data.error}`);
            return;
        }
        
        for (const [section, words] of Object.entries(data)) {
            // Ensure words is an array before joining
            if (Array.isArray(words)) {
                const lyrics = words.join('\n');
                displayLyrics(section, lyrics);
            } else {
                console.warn(`Unexpected data format for section ${section}:`, words);
            }
        }
    } else {
        handleSongDataStreamError(data);
    }
}


function handleSectionDataStreamData(data) {
    if (data) {
        // Check if this is an error response
        if (data.error) {
            console.warn('LLM generation error:', data.error, 'Details:', data.details);
            toastSystem.showError(`Generation error: ${data.error}`);
            return;
        }
        
        let section = '';
        let lyrics = '';
        let id = 0;

        for (const [key, value] of Object.entries(data)) {
            console.log(`handleSectionDataStreamData: key:${key} value:${value}`);

            if (key == 'id') {
                id = parseInt(value);
            } else if (Array.isArray(value)) {
                section = key;
                lyrics = value.join('\n');
            } else {
                console.warn(`Unexpected data format for key ${key}:`, value);
            }
        }
        
        if (section && lyrics && id) {
            addNewLyricsSection(id, section, lyrics);
        }
    } else {
        handleSectionDataStreamError(data);
    }
}


function handleRhymeDataStreamData(data) {
    if (data) {
        // Check if this is an error response
        if (data.error) {
            console.warn('LLM generation error:', data.error, 'Details:', data.details);
            toastSystem.showError(`Generation error: ${data.error}`);
            return;
        }
        
        let word = '';
        let line = -1;
        let index = -1;

        for (const [key, value] of Object.entries(data)) {
            if (key == 'word') {
                word = value;
            } else if (key == 'line') {
                line = parseInt(value);
            } else if (key == 'index') {
                index = parseInt(value);
            }
        }

        if (word && line >= 0 && index >= 0) {
            addNewRhymeWord(word, line, index)
        }

    } else {
        handleRhymeDataStreamError(data);
    }
}


function handleSongDataStreamError(error) {
    const errorStr = JSON.stringify(error, null, 2);
    toastSystem.showError(errorStr);
}


function handleSectionDataStreamError(error) {
    const errorStr = JSON.stringify(error, null, 2);
    toastSystem.showError(errorStr);
}


function handleRhymeDataStreamError(error) {
    const errorStr = JSON.stringify(error, null, 2);
    toastSystem.showError(errorStr);
}


// =================================================================================
// Drag Drop System
// =================================================================================


function handleDragDrop(item, zone, event) {
    const itemId = item.element.id;
    if (itemId.toLowerCase().includes('section')) {
        handleSectionDragDrop(item, zone, event);
    } else {
        handleWordDragDrop(item, zone, event);
    }
}


function handleSectionDragDrop(item, zone, event) {
    const sectionId = item.element.dataset.sectionId;
    const sourceTextElement = document.getElementById(`section-text-${sectionId}`);
    let sourceText = sourceTextElement.innerHTML.trim();
    const destination = zone.element.children[1].children[PANELS.TEXTAREA];

    const shiftDrop = false;

    if (shiftDrop) {
        sourceText = destination.value + '\n' + sourceText;
    }

    if (destination.value.trim() != sourceText) {
        destination.value = sourceText;
        setLyricsDirty();

        if (editMode === 'interactive') {
            const interactivePanel = editCard.children[1].children[1];
            copyTextToInteractivePanel(sourceText, interactivePanel);
        }
    }    
}


function handleWordDragDrop(item, zone, event) {
    const word = item.element.dataset.word;
    const line = parseInt(item.element.dataset.line);
    const index = parseInt(item.element.dataset.index);

    // only proceed if we have valid data and are in rhyme mode
    if (editMode !== 'rhyme' || !markupSystem || isNaN(line) || isNaN(index)) {
        console.error('handleWordDragDrop: invalid state or data', { editMode, line, index, word });
        return;
    }

    // update the text in the markup system
    markupSystem.replaceWord(line, index, word);
    const sourceText = markupSystem.getText('raw');

    // copy the text to the textarea so it gets saved
    const destination = zone.element.children[1].children[PANELS.TEXTAREA];
    if (destination.value.trim() != sourceText) {
        destination.value = sourceText;
        setLyricsDirty();
    }    
}


function registerCardForDragDrop(card) {
    const sectionId = card.dataset.sectionId;
    console.log(`registering card for drag-drop: ${sectionId}`)
    dragDropSystem.registerDraggable(card, { sectionId: sectionId });
}


function registerWordForDragDrop(card) {
    const word = card.dataset.word;
    console.log(`registering word for drag-drop: ${word}`)
    dragDropSystem.registerDraggable(card, { word: word });
}


// =================================================================================
// Lyrics Management & Actions
// =================================================================================


function saveLyrics() {
    let lyrics = {}

    if (editCard) {
        const textareaId = editCard.dataset.textareaId;
        const textarea = document.getElementById(textareaId);
        console.log(`saving lyrics for id='${textarea.dataset.lyricsId}' with words='${textarea.value}'`);
        lyrics[textarea.dataset.lyricsId] = textarea.value;
        updateAllDuplicateSections(textarea);
    } else {
        document.querySelectorAll('[id*="lyrics-text-"').forEach(item => {
            console.log(`saving lyrics for id='${item.dataset.lyricsId}' with words='${item.value}'`);
            lyrics[item.dataset.lyricsId] = item.value;
        });
    }

    console.log(`the lyrics are: ${lyrics}`);

    apiLyricsEdit(songId, lyrics)
        .then(songId => {
            console.log(`sucessfully saved song lyrics for song id=${songId}`)
            copyToSaveHistory();
            setLyricsDirty(false);
        })
        .catch(error => {
            // handle the error if the API call fails
            console.error('Failed to edit the song lyrics:', error);
            toastSystem.showError('Failed to update the song lyrics. Please try again.');
        });
}


function undoLyrics() {
    copyFromSaveHistory();
    updateLyricsListing();
    updateInteractivePanel();
    setLyricsDirty(false);
}


function updateAllDuplicateSections(textarea) {
    const lyricsId = textarea.dataset.lyricsId;

    document.querySelectorAll('[id*="lyrics-text-"').forEach(destination => {
        if (destination != textarea && destination.dataset.lyricsId === lyricsId) {
            console.log(`copying contents of ${textarea.id} to ${destination.id}`);
            destination.value = textarea.value;
        }
    });
}


function copyToSaveHistory() {
    document.querySelectorAll('[id*="lyrics-text-"').forEach(item => {
        lyricsHistory[item.dataset.lyricsId] = item.value;
    });
}


function copyFromSaveHistory() {
    document.querySelectorAll('[id*="lyrics-text-"').forEach(item => {
        item.value = lyricsHistory[item.dataset.lyricsId];
    });
}


function displayLyrics(section, words) {
    const container = document.getElementById('song-lyrics-text')
    container.dataset.songGenerated = 'true';

    document.querySelectorAll(`.section-${section}`).forEach(element => {
        element.value = words;
        setLyricsDirty(true);
    });
}


function updateLyricsListing() {
    const container = document.getElementById('song-lyrics-text')
    container.innerHTML = '';

    if (container.dataset.songGenerated === 'true') {
        document.querySelectorAll('.badge-lyrics').forEach(element => {
            const sectionType = element.dataset.sectionType;
            const sectionIndex = element.dataset.sectionIndex;
            const sectionWordsId = element.dataset.sectionWordsId;

            if (sectionType === 'INTRO') {
                container.innerHTML += '[INSTRUMENTAL INTRO]<br>';
            } else if (sectionType === 'INTERLUDE') {
                container.innerHTML += '[MELODIC INTERLUDE]<br>';
            } else if (sectionIndex > 0) {
                container.innerHTML += '[' + sectionType + ' ' + sectionIndex + ']<br>';
            } else {
                container.innerHTML += '[' + sectionType + ']<br>';
            }

            if (sectionWordsId.length > 0) {
                const textArea = document.getElementById(sectionWordsId);
                const textValue = textArea.value;
                const htmlValue = textValue.replace(/\n/g, '<br>');

                container.innerHTML += htmlValue + '<br>';
            }
            container.innerHTML += '<br>';
        });

        container.innerHTML += '[END]';

        if (container.innerHTML.length > 0) {
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
        }
    }    
}


function copyLyrics() {
    const container = document.getElementById('song-lyrics-text')
    const lyrics = container.innerText.replace(/\n\s*\n\s*\n+/g, '\n\n');

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(lyrics).then(() => {
            console.log('Lyrics copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy lyrics:', err);
            toastSystem.showError('Failed to copy lyrics to clipboard');
        });
    } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = lyrics;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            console.log('Lyrics copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy lyrics:', err);
            toastSystem.showError('Failed to copy lyrics to clipboard');
        }
        
        document.body.removeChild(textArea);
    }
}


function exportLyrics() {
    const container = document.getElementById('song-lyrics-text')
    const lyrics = container.innerText.replace(/\n\s*\n\s*\n+/g, '\n\n');

    const exportButton = document.getElementById('btn-export');
    const songName = exportButton.dataset.songName;

    // Clean up the filename by replacing spaces and removing special characters
    // Fallback to 'song_lyrics' if songName is empty or undefined
    const cleanName = (songName || 'song_lyrics')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .trim() || 'song_lyrics';
    const fileName = cleanName + '.txt';

    // Create a blob with the lyrics content
    const blob = new Blob([lyrics], { type: 'text/plain' });
    
    // Create a download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    
    // Append to body, click, and remove
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    console.log(`Lyrics exported as ${fileName}`);
}


function setLyricsDirty(dirty = true) {
    console.log(`************** ${dirty}`)

    if (dirty) 
        updateLyricsListing();

    if (dirty && !lyricsDirty) {
        lyricsDirty = true;

        const saveButton = document.getElementById('btn-save');
        saveButton.classList.remove('btn-disabled');
        const undoButton = document.getElementById('btn-undo');
        undoButton.classList.remove('btn-disabled');
    } else if (!dirty && lyricsDirty) {
        lyricsDirty = false;

        const saveButton = document.getElementById('btn-save');
        saveButton.classList.add('btn-disabled');
        const undoButton = document.getElementById('btn-undo');
        undoButton.classList.add('btn-disabled');
    }

    updateRegenerateButtonAppearance();
}


// =================================================================================
// Badge Actions
// =================================================================================


function badgeMarkerButtonClick() {
    if (markupSystem) {
        markupSystem.selectMarker();
    }
}


function badgeEraserButtonClick() {
    if (markupSystem) {
        markupSystem.selectEraser();
    }
}


function badgeToolsButtonClick() {
    const allButtons = this.parentNode.querySelectorAll('.badge-button');
    enterEditMode('textedit', allButtons);
    applyFilter();
}


function badgeExitButtonClick() {
    const allButtons = this.parentNode.querySelectorAll('.badge-button');
    if (lyricsDirty) {
        undoLyrics();
    }    
    enterEditMode('none', allButtons);
}


function badgeRhymeButtonClick() {
    const allButtons = this.parentNode.querySelectorAll('.badge-button');
    enterEditMode('rhyme', allButtons);  
}


function badgeInteractiveButtonClick() {
    const allButtons = this.parentNode.querySelectorAll('.badge-button');
    enterEditMode('interactive', allButtons);  
}


function badgeTextEditButtonClick() {
    const allButtons = this.parentNode.querySelectorAll('.badge-button');
    enterEditMode('textedit', allButtons);    
}


function badgeRegenerateButtonClick() {
    const allButtons = this.parentNode.querySelectorAll('.badge-button');
    enterEditMode('regenerate', allButtons);
}


function badgeHideButtonClick() {
    const sectionId = this.dataset.lyricsId;
    console.log(`hiding section with Id=${sectionId}`);

    const sectionCard = this.parentNode.parentNode;
    const container = document.getElementById('generated-sections');

    apiSectionEdit(sectionId, true)
        .then(sectionId => {
            // update the text on the song card
            console.log(`Successfully updated sectionId: ${sectionId}`);

            // hide the card from the list
            container.removeChild(sectionCard);

            // remove the card from the drag drop system
            dragDropSystem.unregisterDraggable(sectionCard);
        })
        .catch(error => {
            // handle the error if the API call fails
            console.error('Failed to edit the section:', error);
            toastSystem.showError('Failed to update the section. Please try again.');
        });
}


function enterEditMode(mode, allButtons) {
    editMode = mode;

    const buttonMarker = allButtons[BADGES.MARKER_BUTTON];
    const buttonEraser = allButtons[BADGES.ERASER_BUTTON];
    const buttonRhyme = allButtons[BADGES.RHYME_BUTTON];
    const buttonInteractive = allButtons[BADGES.INTERACTIVE_BUTTON];
    const buttonRegenerate = allButtons[BADGES.REGENERATE_BUTTON];
    const buttonTextEdit = allButtons[BADGES.TEXTEDIT_BUTTON];
    const buttonExit = allButtons[BADGES.EXIT_BUTTON];
    const buttonTools = allButtons[BADGES.TOOLS_BUTTON];
    const songSectionCard = buttonTools.parentNode.parentNode;
    
    if (mode === 'none') {
        editCard = null;
        console.log(`setting editCard=null`);
        document.getElementById('btn-generate').classList.remove('btn-disabled');
        document.getElementById('btn-generating').classList.remove('btn-disabled');
    } else {
        console.log(`setting editCard=${songSectionCard}`);
        editCard = songSectionCard;
        document.getElementById('btn-generate').classList.add('btn-disabled');
        document.getElementById('btn-generating').classList.add('btn-disabled');
    }

    if (mode === 'none') {
        showEditTextArea(false, buttonTextEdit);
        showEditRhyme(false, buttonRhyme);
        showEditInteractive(false, buttonInteractive);
        showEditRegenerate(false, buttonRegenerate);
        updateButtonAppearance(buttonTools, 'shown');
        updateButtonAppearance(buttonExit, 'hidden');
        updateButtonAppearance(buttonRhyme, 'hidden');
        updateButtonAppearance(buttonInteractive, 'hidden');
        updateButtonAppearance(buttonTextEdit, 'hidden');
        updateButtonAppearance(buttonRegenerate, 'hidden');
        updateButtonAppearance(buttonMarker, 'hidden');
        updateButtonAppearance(buttonEraser, 'hidden');
        hideOrShowAllSections('show');
    } else if (mode === 'textedit') {
        showEditRhyme(false, buttonRhyme);
        showEditInteractive(false, buttonInteractive);
        showEditRegenerate(false, buttonRegenerate);
        showEditTextArea(true, buttonTextEdit);
        updateButtonAppearance(buttonTools, 'hidden');
        updateButtonAppearance(buttonExit, 'shown');
        updateButtonAppearance(buttonRhyme, 'shown');
        updateButtonAppearance(buttonInteractive, 'shown');
        updateButtonAppearance(buttonTextEdit, 'active');
        updateButtonAppearance(buttonRegenerate, 'shown');
        updateButtonAppearance(buttonMarker, 'hidden');
        updateButtonAppearance(buttonEraser, 'hidden');
        hideOrShowAllSections('hide', songSectionCard);
    } else if (mode === 'interactive') {
        showEditRhyme(false, buttonRhyme);
        showEditTextArea(false, buttonTextEdit);
        showEditRegenerate(false, buttonRegenerate);
        showEditInteractive(true, buttonInteractive);
        updateButtonAppearance(buttonTools, 'hidden');
        updateButtonAppearance(buttonExit, 'shown');
        updateButtonAppearance(buttonRhyme, 'shown');
        updateButtonAppearance(buttonInteractive, 'active');
        updateButtonAppearance(buttonTextEdit, 'shown');
        updateButtonAppearance(buttonRegenerate, 'shown');
        updateMarkupButtonAppearances();
        hideOrShowAllSections('hide', songSectionCard);
        markupSystem.setMultiSelectMode();
    } else if (mode === 'rhyme') {
        showEditTextArea(false, buttonTextEdit);
        showEditRegenerate(false, buttonRegenerate);
        showEditInteractive(false, buttonInteractive);
        showEditRhyme(true, buttonRhyme);
        updateButtonAppearance(buttonTools, 'hidden');
        updateButtonAppearance(buttonExit, 'shown');
        updateButtonAppearance(buttonRhyme, 'active');
        updateButtonAppearance(buttonInteractive, 'shown');
        updateButtonAppearance(buttonTextEdit, 'shown');
        updateButtonAppearance(buttonRegenerate, 'shown');
        updateMarkupButtonAppearances();
        hideOrShowAllSections('hide', songSectionCard);
        markupSystem.setSingleSelectMode();
    } else if (mode === 'regenerate') {
        showEditRhyme(false, buttonRhyme);
        showEditTextArea(false, buttonTextEdit);
        showEditInteractive(false, buttonInteractive);
        showEditRegenerate(true, buttonRegenerate);
        updateButtonAppearance(buttonTools, 'hidden');
        updateButtonAppearance(buttonExit, 'shown');
        updateButtonAppearance(buttonRhyme, 'shown');
        updateButtonAppearance(buttonInteractive, 'shown');
        updateButtonAppearance(buttonTextEdit, 'shown');
        updateButtonAppearance(buttonRegenerate, 'active');
        updateButtonAppearance(buttonMarker, 'hidden');
        updateButtonAppearance(buttonEraser, 'hidden');
        hideOrShowAllSections('hide', songSectionCard);
    } else {
        console.error(`enterEditMode: invalid mode argument (${mode}), must be 'none', 'rhyme', 'textedit', 'interactive', or 'regenerate' `);
    }

    updateHeaderTitle(mode);
}


function updateHeaderTitle(mode) {
    setTimeout(() => {
        const regenerateHeaderTitle = document.getElementById('regenerate-header-title');
        
        if (regenerateHeaderTitle) {
            if (mode === 'rhyme') {
                regenerateHeaderTitle.textContent = 'ALTERNATIVE WORDS';
            } else {
                regenerateHeaderTitle.textContent = 'ALTERNATIVE LYRICS';
            }
        }
    }, 10);
}


function showEditTextArea(show, buttonTextEdit) {
    const panels = buttonTextEdit.parentNode.nextElementSibling.children;
    const textArea = panels[PANELS.TEXTAREA];

    if (show) {
        textArea.readOnly = false;
    } else {
        textArea.readOnly = true;
    }
}


function showEditRegenerate(show, buttonRegenerate) {
    const panels = buttonRegenerate.parentNode.nextElementSibling.children;
    const editRegeneratePanel = panels[PANELS.REGENERATE];
    const regenerateContainer = document.getElementById('generated-sections');

    if (show) {
        editRegeneratePanel.classList.remove('hidden');
        regenerateContainer.classList.remove('hidden');
    } else {
        editRegeneratePanel.classList.add('hidden');
        regenerateContainer.classList.add('hidden');
    }
}


function showEditRhyme(show, buttonRhyme) {
    const panels = buttonRhyme.parentNode.nextElementSibling.children;
    const editInteractivePanel = panels[PANELS.INTERACTIVE];
    const editRegeneratePanel = panels[PANELS.REGENERATE];
    const textArea = panels[PANELS.TEXTAREA];
    const regenerateContainer = document.getElementById('generated-rhymes');

    if (show) {
        // show the ui elements
        textArea.classList.add('hidden');  
        editInteractivePanel.classList.remove('hidden');
        editRegeneratePanel.classList.remove('hidden');
        regenerateContainer.classList.remove('hidden');

        // copy the lyrics into the panel for selection
        const lyrics = textArea.value;
        copyTextToInteractivePanel(lyrics, editInteractivePanel);
    } else {
        // show the ui elements
        editInteractivePanel.classList.add('hidden');
        editRegeneratePanel.classList.add('hidden');
        regenerateContainer.classList.add('hidden');
        textArea.classList.remove('hidden');  
    }
}


function showEditInteractive(show, buttonInteractive) {
    const panels = buttonInteractive.parentNode.nextElementSibling.children;
    const editInteractivePanel = panels[PANELS.INTERACTIVE];
    const editRegeneratePanel = panels[PANELS.REGENERATE];
    const textArea = panels[PANELS.TEXTAREA];
    const regenerateContainer = document.getElementById('generated-sections');

    if (show) {
        // show the ui elements
        textArea.classList.add('hidden');  
        editInteractivePanel.classList.remove('hidden');
        editRegeneratePanel.classList.remove('hidden');
        regenerateContainer.classList.remove('hidden');

        // copy the lyrics into the panel for selection
        const lyrics = textArea.value;
        copyTextToInteractivePanel(lyrics, editInteractivePanel);
    } else {
        // show the ui elements
        editInteractivePanel.classList.add('hidden');
        editRegeneratePanel.classList.add('hidden');
        regenerateContainer.classList.add('hidden');
        textArea.classList.remove('hidden');  
    }
}


function copyTextToInteractivePanel(lyrics, panel) {
    console.log(`panel: ${panel.id}`)
    if (markupSystem) {
        markupSystem.setContainer(panel);
        markupSystem.setText(lyrics);
    }
}


function getTextFromInteractivePanel(style = 'markup') {
    return markupSystem.getText(style);
}


function getFirstMarkedWordFromInteractivePanel() {
    return markupSystem.getFirstMarkedWord();
}


function updateInteractivePanel() {
    if (editCard && editMode == 'interactive') {
        const textArea = editCard.children[1].children[PANELS.TEXTAREA];
        const interactivePanel = editCard.children[1].children[PANELS.INTERACTIVE];
        copyTextToInteractivePanel(textArea.value, interactivePanel);
    }
}


function debugShowInteractiveText() {
    const textRaw = getTextFromInteractivePanel('raw');
    const textMarkup = getTextFromInteractivePanel('markup');
    const textReplacement = getTextFromInteractivePanel('replacement');

    console.log(`textRaw:\n${textRaw}`)
    console.log(`textMarkup:\n${textMarkup}`)
    console.log(`textReplacement:\n${textReplacement}`)
}


function updateButtonAppearance(button, appearance) {
    if (appearance === 'shown') {
        button.classList.remove('hidden', 'bg-primary', 'hover:border-primary');
        button.classList.add('text-neutral');

    } else if (appearance === 'active') {
        button.classList.remove('hidden', 'text-neutral');
        button.classList.add('bg-primary', 'hover:border-primary');

    } else if (appearance === 'hidden') {
        button.classList.add('hidden', 'text-neutral');
        button.classList.remove('bg-primary', 'hover:border-primary');
    } else {
        console.error(`updateButtonAppearance: invalid apperance argument (${appearance}), must be 'shown', 'active', or 'hidden' `);
    }
}


function hideOrShowAllSections(showOrHide, except=null) {
    document.querySelectorAll('.song-section-card').forEach(card => {
        if (card != except) {
            if (showOrHide === 'show') {
                showSectionCard(card);
            } else if (showOrHide === 'hide') {
                hideSectionCard(card);
            } else {
                console.error(`hideOrShowAllSections: invalid showOrHide argument (${showOrHide}), must be 'show' or 'hide' `);
            }
        }
    });
}


function addNewLyricsSection(sectionId, section, lyrics) {
    console.log(`create card for section (${section}) with lyrics:\n${lyrics}.`)

    apiRenderComponent('card_lyrics_section', 'generated-sections', { section: { id: sectionId, type: section, text: lyrics }})
        .then(html => {
            // initialize the new section card for interactions
            document.getElementById(`badge-hide-button-${sectionId}`).onclick = badgeHideButtonClick;

            // register with the drag-drop system
            const sectionCard = document.getElementById(`section-card-${sectionId}`);
            registerCardForDragDrop(sectionCard);

        })
        .catch(error => {
            // handle the error if the component rendering fails
            console.error('Failed to render or initialize new song section card:', error);
            toastSystem.showError('Failed to display the new song section. Please refresh the page.');
        });
}


function addNewRhymeWord(word, line, index) {
    // ensure the word is unique
    const currentWords = getCurrentWordsFromRhymeContainer();

    if (currentWords.includes(word)) {
        console.log(`skipping word: '${word}' as it is a duplicate.`)
    } else {
        // create a new card for the word
        apiRenderComponent('card_word', 'generated-rhymes', { word: { text: word, line: line, index: index } })
            .then(html => {
                // register with the drag-drop system
                const wordCard = document.getElementById(`word-card-${word}`);
                registerWordForDragDrop(wordCard);
            })
            .catch(error => {
                // handle the error if the component rendering fails
                console.error('Failed to render or initialize new song section card:', error);
                toastSystem.showError('Failed to display the new song section. Please refresh the page.');
            });
    }
}


function getCurrentWordsFromRhymeContainer() {
    let currentWords = [];

    const container = document.getElementById('generated-rhymes');

    Array.from(container.children).forEach(child => { 
        currentWords.push(child.dataset.word);
    });

    console.log(`currentWords:\n${currentWords}`)
    return currentWords;
}


function applyFilter() {
    if (editCard) {
        const filter = editCard.firstElementChild.dataset.sectionName;
        document.querySelectorAll('.section-text-card').forEach(card => {
            if (card.firstElementChild.dataset.sectionName === filter) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });
    }
}


function hideSectionCard(card) {
    // If already hidden or in process of hiding, do nothing
    if (card.classList.contains('collapsed') || card.classList.contains('collapsing-hide')) {
        return;
    }
    
    // Get the current height and set it explicitly
    const height = card.offsetHeight;
    card.style.height = height + 'px';
    
    // Use requestAnimationFrame to avoid forced reflow
    requestAnimationFrame(() => {
        // Add collapsing-hide class to start opacity/margin animation
        card.classList.add('collapsing-hide');
        
        // Start the height animation in the next frame
        requestAnimationFrame(() => {
            card.style.height = '0px';
        });
    });
    
    // After animation completes, add collapsed class and clean up
    setTimeout(() => {
        card.classList.remove('collapsing-hide');
        card.classList.add('collapsed');
        card.style.height = '';
    }, 500);
}


function showSectionCard(card) {
    // If already visible or in process of showing, do nothing
    if (!card.classList.contains('collapsed') && !card.classList.contains('collapsing-show')) {
        return;
    }
    
    // Remove collapsed state
    card.classList.remove('collapsed');
    
    // Get the natural height by temporarily removing height restriction
    card.style.height = 'auto';
    const height = card.offsetHeight;
    
    // Use requestAnimationFrame to avoid forced reflow
    requestAnimationFrame(() => {
        // Set height to 0 and prepare for animation
        card.style.height = '0px';
        card.classList.add('collapsing-show');
        
        // Start the height animation in the next frame
        requestAnimationFrame(() => {
            card.style.height = height + 'px';
        });
    });
    
    // After animation completes, clean up
    setTimeout(() => {
        card.classList.remove('collapsing-show');
        card.style.height = '';
    }, 500);
}


function clearAllVisibleSections() {
    const sectionContainer = document.getElementById('generated-sections');

    if (!sectionContainer.classList.contains('hidden')) {
        Array.from(sectionContainer.children).forEach(child => {
            if (!child.classList.contains('hidden')) {
                const sectionId = child.dataset.sectionId;
                apiSectionEdit(sectionId, true)
                .then(sectionId => {
                    // update the text on the song card
                    console.log(`Successfully updated sectionId: ${sectionId}`);

                    // hide the card from the list
                    sectionContainer.removeChild(child);

                    // remove the card from the drag drop system
                    dragDropSystem.unregisterDraggable(child);
                })
                .catch(error => {
                    // handle the error if the API call fails
                    console.error('Failed to edit the section:', error);
                    toastSystem.showError('Failed to update the section. Please try again.');
                });
            }
        });            
    }
}


function clearAllVisibleWords() {
    const container = document.getElementById('generated-rhymes');

    Array.from(container.children).forEach(child => { 
        dragDropSystem.unregisterDraggable(child);
        container.removeChild(child);
    });

}


function updateMarkupButtonAppearances() {
    if (!editCard || !markupSystem) return;
    
    const allButtons = editCard.querySelectorAll('.badge-button');
    const buttonMarker = allButtons[BADGES.MARKER_BUTTON];
    const buttonEraser = allButtons[BADGES.ERASER_BUTTON];
    
    if (markupSystem.isMarkerSelected()) {
        updateButtonAppearance(buttonMarker, 'active');
        updateButtonAppearance(buttonEraser, 'shown');
    } else if (markupSystem.isEraserSelected()) {
        updateButtonAppearance(buttonMarker, 'shown');
        updateButtonAppearance(buttonEraser, 'active');
    }
}


function updateRegenerateButtonAppearance() {
    if (editMode === 'interactive' || editMode === 'rhyme') {
        const { word, line, index } = markupSystem.getFirstMarkedWord();
        document.querySelectorAll('.btn-regenerate').forEach(button => {
            if (word.length > 0 && lyricsDirty === false) {
                button.classList.remove('btn-disabled');
            } else {
                button.classList.add('btn-disabled');
            }
        });
    } else {
        document.querySelectorAll('.btn-regenerate').forEach(button => {
            if (lyricsDirty === false) {
                button.classList.remove('btn-disabled');
            } else {
                button.classList.add('btn-disabled');
            }
        });
    }
}


