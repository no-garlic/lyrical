
export class Markup {

    constructor(initialConfig = {}, initialCallbacks = {}) {
        this.config = {
            marker: 'bg-error',
            replaceMarkedLinesWith: '<line>',
            replaceMarkedSequencesWith: '<words>',
            replaceMarkedWordsWith: '<word>',
            highlightHeight: '2px',
            paddingLeft: '0px',
            paddingTop: '0px',
            lineSpacing: '0.125rem',
            lineHeight: '1.35',
            wordSpacing: '-1px',
            ...initialConfig,
        };
        this.callbacks = {
            ...initialCallbacks,
        };
        
        this.text = '';
        this.lines = [];
        this.markedState = {};
        this.selectedTool = 'marker';
        this.container = null;
        this.isDragging = false;
        this.dragStartWord = null;
        this.dragTargetState = null;
        this.renderDebounceTimer = null;
    }

    init(callbacks = {}) {
        this.callbacks = { ...this.callbacks, ...callbacks };
        this.container = null;
    }

    setContainer(container) {
        this.container = container;
    }

    selectMarker() {
        this.selectedTool = 'marker';
        if (this.callbacks.onToolChanged) {
            this.callbacks.onToolChanged('marker');
        }
    }

    selectEraser() {
        this.selectedTool = 'eraser';
        if (this.callbacks.onToolChanged) {
            this.callbacks.onToolChanged('eraser');
        }
    }

    isMarkerSelected() {
        return this.selectedTool === 'marker';
    }

    isEraserSelected() {
        return this.selectedTool === 'eraser';
    }

    clearHighlighting() {
        this.markedState = {};
        this._renderTextImmediate();
        this._notifyTextChanged();
    }

    setText(text) {
        this.text = text;
        this.lines = text.split('\n').map(line => line.trim().split(/\s+/).filter(word => word.length > 0));
        this.markedState = {};
        this._renderText();
    }

    getText(style = 'markup') {
        if (style === 'raw') {
            return this.text;
        }
        
        const result = [];
        
        for (let lineIndex = 0; lineIndex < this.lines.length; lineIndex++) {
            const line = this.lines[lineIndex];
            const lineState = this.markedState[lineIndex] || {};
            
            // Check if entire line is marked
            const isFullLineMarked = line.every((_, wordIndex) => lineState[wordIndex]);
            
            if (isFullLineMarked && line.length > 0) {
                if (style === 'replacement') {
                    result.push(this.config.replaceMarkedLinesWith);
                } else {
                    result.push('<<line>>');
                }
            } else {
                const lineResult = [];
                let i = 0;
                
                while (i < line.length) {
                    if (lineState[i]) {
                        // Find sequence of marked words
                        let sequenceEnd = i;
                        while (sequenceEnd < line.length && lineState[sequenceEnd]) {
                            sequenceEnd++;
                        }
                        
                        const sequenceLength = sequenceEnd - i;
                        if (sequenceLength === 1) {
                            // Single word
                            if (style === 'replacement') {
                                lineResult.push(this.config.replaceMarkedWordsWith);
                            } else {
                                lineResult.push(`<<${line[i]}>>`);
                            }
                        } else {
                            // Sequence of words
                            if (style === 'replacement') {
                                lineResult.push(this.config.replaceMarkedSequencesWith);
                            } else {
                                const words = line.slice(i, sequenceEnd).join(' ');
                                lineResult.push(`<<${words}>>`);
                            }
                        }
                        i = sequenceEnd;
                    } else {
                        lineResult.push(line[i]);
                        i++;
                    }
                }
                
                result.push(lineResult.join(' '));
            }
        }
        
        return result.join('\n');
    }

    getMarkedText() {
        const result = [];
        
        for (let lineIndex = 0; lineIndex < this.lines.length; lineIndex++) {
            const line = this.lines[lineIndex];
            const lineState = this.markedState[lineIndex] || {};
            const markedWords = line.filter((_, wordIndex) => lineState[wordIndex]);
            
            if (markedWords.length > 0) {
                result.push(markedWords.join(' '));
            }
        }
        
        return result.join('\n');
    }

    getUnmarkedText() {
        const result = [];
        
        for (let lineIndex = 0; lineIndex < this.lines.length; lineIndex++) {
            const line = this.lines[lineIndex];
            const lineState = this.markedState[lineIndex] || {};
            const unmarkedWords = line.filter((_, wordIndex) => !lineState[wordIndex]);
            
            if (unmarkedWords.length > 0) {
                result.push(unmarkedWords.join(' '));
            }
        }
        
        return result.join('\n');
    }

    getMarkedState() {
        const result = {};
        
        for (let lineIndex = 0; lineIndex < this.lines.length; lineIndex++) {
            const line = this.lines[lineIndex];
            const lineState = this.markedState[lineIndex] || {};
            result[lineIndex.toString()] = line.map((_, wordIndex) => !!lineState[wordIndex]);
        }
        
        return result;
    }

    isWordMarked(line, word) {
        const lineState = this.markedState[line];
        return lineState ? !!lineState[word] : false;
    }

    getNumLines() {
        return this.lines.length;
    }

    getNumWords(line) {
        return this.lines[line] ? this.lines[line].length : 0;
    }
    
    _renderText() {
        // Remove debouncing - render immediately
        this._performRender();
    }
    
    _performRender() {
        if (!this.container) {
            throw new Error(`Container has not been set (container is null)`);
        }
        
        this.container.innerHTML = '';
        
        // Apply container padding
        this.container.style.paddingLeft = this.config.paddingLeft;
        this.container.style.paddingTop = this.config.paddingTop;
        
        for (let lineIndex = 0; lineIndex < this.lines.length; lineIndex++) {
            const line = this.lines[lineIndex];
            const lineDiv = document.createElement('div');
            lineDiv.className = 'markup-line';
            lineDiv.style.cssText = `line-height: ${this.config.lineHeight}; margin-bottom: ${this.config.lineSpacing}; white-space: nowrap;`;
            
            for (let wordIndex = 0; wordIndex < line.length; wordIndex++) {
                const word = line[wordIndex];
                const wordSpan = document.createElement('span');
                wordSpan.textContent = word;
                wordSpan.className = 'markup-word cursor-pointer';
                wordSpan.dataset.line = lineIndex;
                wordSpan.dataset.word = wordIndex;
                wordSpan.style.cssText = `padding: ${this.config.highlightHeight} 1px; margin-right: ${this.config.wordSpacing}; user-select: none;`;
                
                // Apply marking if word is marked
                if (this.isWordMarked(lineIndex, wordIndex)) {
                    wordSpan.classList.add(this.config.marker);
                }
                
                // Add event listeners
                wordSpan.addEventListener('mousedown', (e) => this._handleMouseDown(e, lineIndex, wordIndex));
                wordSpan.addEventListener('mouseenter', (e) => this._handleMouseEnter(e, lineIndex, wordIndex));
                wordSpan.addEventListener('mouseup', (e) => this._handleMouseUp(e, lineIndex, wordIndex));
                
                lineDiv.appendChild(wordSpan);
                
                // Add space between words (except for last word)
                if (wordIndex < line.length - 1) {
                    const spaceSpan = document.createElement('span');
                    spaceSpan.textContent = ' ';
                    spaceSpan.style.cssText = `user-select: none; padding: ${this.config.highlightHeight} 0px;`;
                    
                    // Apply highlighting to space if both adjacent words are marked
                    if (this.isWordMarked(lineIndex, wordIndex) && 
                        wordIndex + 1 < line.length && 
                        this.isWordMarked(lineIndex, wordIndex + 1)) {
                        spaceSpan.classList.add(this.config.marker);
                    }
                    
                    lineDiv.appendChild(spaceSpan);
                }
            }
            
            this.container.appendChild(lineDiv);
        }
        
        // Prevent text selection and context menu
        this.container.addEventListener('selectstart', (e) => e.preventDefault());
        this.container.addEventListener('contextmenu', (e) => e.preventDefault());
        document.addEventListener('mouseup', () => this._handleDocumentMouseUp());
    }
    
    _handleMouseDown(e, lineIndex, wordIndex) {
        e.preventDefault();
        
        if (e.shiftKey) {
            // Shift-click: mark/unmark entire line
            this._toggleLine(lineIndex);
        } else {
            // Regular mousedown: toggle immediately and prepare for potential drag
            this._toggleWord(lineIndex, wordIndex);
            
            this.isDragging = true;
            this.dragStartWord = { line: lineIndex, word: wordIndex };
            
            // Capture the state we just set for consistent drag behavior
            this.dragTargetState = this.isWordMarked(lineIndex, wordIndex);
        }
    }
    
    _handleMouseEnter(e, lineIndex, wordIndex) {
        if (this.isDragging && this.dragStartWord) {
            // Check if we've moved to a different word to avoid unnecessary re-renders
            if (this.dragStartWord.line !== lineIndex || this.dragStartWord.word !== wordIndex) {
                // During drag: mark range from start to current
                this._markRange(this.dragStartWord.line, this.dragStartWord.word, lineIndex, wordIndex);
            }
        }
    }
    
    _handleMouseUp(e, lineIndex, wordIndex) {
        // Just clean up drag state - word was already toggled on mousedown
        this.isDragging = false;
        this.dragStartWord = null;
        this.dragTargetState = null;
    }
    
    _handleDocumentMouseUp() {
        this.isDragging = false;
        this.dragStartWord = null;
        this.dragTargetState = null;
    }
    
    _toggleWord(lineIndex, wordIndex) {
        if (!this.markedState[lineIndex]) {
            this.markedState[lineIndex] = {};
        }
        
        if (this.selectedTool === 'eraser') {
            this.markedState[lineIndex][wordIndex] = false;
        } else {
            this.markedState[lineIndex][wordIndex] = !this.markedState[lineIndex][wordIndex];
        }
        
        this._renderTextImmediate();
        this._notifyTextChanged();
    }
    
    _toggleLine(lineIndex) {
        if (!this.lines[lineIndex]) return;
        
        if (!this.markedState[lineIndex]) {
            this.markedState[lineIndex] = {};
        }
        
        const lineState = this.markedState[lineIndex];
        const isLineMarked = this.lines[lineIndex].some((_, wordIndex) => lineState[wordIndex]);
        
        for (let wordIndex = 0; wordIndex < this.lines[lineIndex].length; wordIndex++) {
            if (this.selectedTool === 'eraser') {
                lineState[wordIndex] = false;
            } else {
                lineState[wordIndex] = !isLineMarked;
            }
        }
        
        this._renderTextImmediate();
        this._notifyTextChanged();
    }
    
    _markRange(startLine, startWord, endLine, endWord) {
        // For simplicity, only handle ranges within the same line
        if (startLine !== endLine) return;
        
        const lineIndex = startLine;
        const startIndex = Math.min(startWord, endWord);
        const endIndex = Math.max(startWord, endWord);
        
        if (!this.markedState[lineIndex]) {
            this.markedState[lineIndex] = {};
        }
        
        // Use the target state captured at drag start
        const targetState = this.dragTargetState;
        
        for (let wordIndex = startIndex; wordIndex <= endIndex; wordIndex++) {
            this.markedState[lineIndex][wordIndex] = targetState;
        }
        
        this._renderText();
        this._notifyTextChanged();
    }
    
    _renderTextImmediate() {
        this._performRender();
    }
    
    _notifyTextChanged() {
        if (this.callbacks.onTextChanged) {
            this.callbacks.onTextChanged();
        }
    }
}


/*

Create a Markup utility for my web application. It should be written in javascript and built to work with tailwindcss (and daisyui if applicable).

The utility is to render some song lyrics text to a web page, in a way where I can use the mouse to highlight certain words and lines of the lyrics in 
effect changing their background color.

The purpose is for me to take an AI generated section of a song (eg, a chorus), and mark any words or lines of the chorus that I want to regenerate.

So the basic requirements are:

1. Take a passage of text (typically 4 to 8 lines of text, with each line having 3 to 8 words)
2. Render that text onto a HTML element

3. Select the marker tool, or the eraser tool.

4. Clicking on a word will toggle the marker state of the word.
 - If the word is not marked, it will become marked.
 - If the word was already marked, it will become unmarked.

5. Clicking on a word and then dragging the mouse will mark all sequential words between the word where the mouse was pressed, and the word where the mouse was released (inclusive).
 - Consider the marked state of the first word that was clicked on, and apply the rules of step 4 to that word.
 - Now also apply the marking state you applied to the first word, to all sequential words between the word where the mouse was pressed, and the word where the mouse was released (inclusive).

6. If the eraser is selected, then all mouse actions will result in words becoming unmarked.
 - If the mouse is clicked on a single word, then that word will become unmarked.
 - Clicking on a word and then dragging the mouse will unmark all sequential words between the word where the mouse was pressed, and the word where the mouse was released (inclusive).

7. If I shift-click on a word, it will apply the same marking or erasing rules, but however it will apply them to the entire line of text.

The visual requirements are:

1. The passage of words (the song lyrics) must be rendered in a way that exactly resembles how they would be rendered if they were passed as the value to a textEdit, or rendered in <p> tags.
 - specifically the line spacing, and the spacing between words must match exactly.
 - take special consideration of this requirement when deciding on the architecture of the utility.

2. The highlighting of adjacent words must appear connected, I do not want to see individual words highlighted, if a full line is highlighted then I want to see a continous coloured bar behind the words.
 - take special consideration of this requirement when deciding on the architecture of the utility.

The configuration has these keys:

config = {
        containerId: 'some-html-element-id',    // the id of the parent HTML Element to use to render the text onto 
        marker: bg-red-300,                     // the tailwindcss style for the background color

        replaceMarkedLinesWith: '<line>',       // when calling getText(), replaces each complete marked line with this token
        replaceMarkedSequencesWith: '<words>',  // when calling getText(), replaces each sequence of words with this token
        replaceMarkedWordsWith: '<word>',       // when calling getText(), replaces each single isolated marked word with this token

    }

Always use zero-based indexing when exposing functions and data through the API.

I have created a new file (util_markup.js) for you to use and I have added some stubs to get started.

*/

