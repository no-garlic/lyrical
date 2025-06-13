/**
 * Markup utility class for text highlighting and manipulation.
 * Provides interactive text markup functionality with word selection, highlighting, and replacement.
 */
export class Markup {

    /**
     * Creates a new Markup instance
     * @param {Object} [initialConfig={}] - Initial configuration options
     * @param {Object} [initialCallbacks={}] - Initial callback functions
     */
    constructor(initialConfig = {}, initialCallbacks = {}) {
        this.config = {
            markerMulti: 'bg-error',
            markerSingle: 'bg-success',
            replaceMarkedLinesWith: '<<line>>',
            replaceMarkedSequencesWith: '<<words>>',
            replaceMarkedWordsWith: '<<word>>',
            highlightHeight: '2px',
            paddingLeft: '0px',
            paddingTop: '0px',
            lineSpacing: '0.125rem',
            lineHeight: '1.35',
            wordSpacing: '-1px',
            multiSelect: true,
            ...initialConfig,
        };
        this.callbacks = {
            onToolChanged: () => {},
            onModeChanged: () => {},
            onWordReplaced: () => {},
            onTextChanged: () => {},
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

    /**
     * Initialize the markup system with callbacks
     * @param {Object} [callbacks={}] - Callback functions to merge with existing callbacks
     */
    init(callbacks = {}) {
        this.callbacks = { ...this.callbacks, ...callbacks };
        this.container = null;
    }

    /**
     * Set the container element for rendering markup
     * @param {HTMLElement} container - The container element
     */
    setContainer(container) {
        this.container = container;
    }

    /**
     * Select the marker tool for highlighting text
     */
    selectMarker() {
        this.selectedTool = 'marker';
        if (this.callbacks.onToolChanged) {
            this.callbacks.onToolChanged('marker');
        }
    }

    /**
     * Select the eraser tool for removing highlights
     */
    selectEraser() {
        this.selectedTool = 'eraser';
        if (this.callbacks.onToolChanged) {
            this.callbacks.onToolChanged('eraser');
        }
    }

    /**
     * Enable single selection mode
     */
    setSingleSelectMode() {
        this.config.multiSelect = false;
        this.clearHighlighting();
        if (this.callbacks.onModeChanged) {
            this.callbacks.onModeChanged('single');
        }
    }

    /**
     * Enable multi-selection mode
     */
    setMultiSelectMode() {
        this.config.multiSelect = true;
        this.clearHighlighting();
        if (this.callbacks.onModeChanged) {
            this.callbacks.onModeChanged('multi');
        }
    }

    /**
     * Check if the marker tool is selected
     * @returns {boolean} True if marker is selected
     */
    isMarkerSelected() {
        return this.selectedTool === 'marker';
    }

    /**
     * Check if the eraser tool is selected
     * @returns {boolean} True if eraser is selected
     */
    isEraserSelected() {
        return this.selectedTool === 'eraser';
    }

    /**
     * Check if single selection mode is active
     * @returns {boolean} True if in single selection mode
     */
    isSingleSelectMode() {
        return !this.config.multiSelect;
    }

    /**
     * Clear all highlighting from the text
     */
    clearHighlighting() {
        this.markedState = {};
        this._renderTextImmediate();
        this._notifyTextChanged();
    }

    /**
     * Set the text content and reset markup state
     * @param {string} text - The text content to set
     */
    setText(text) {
        this.text = text;
        this.lines = text.split('\n').map(line => line.trim().split(/\s+/).filter(word => word.length > 0));
        this.markedState = {};
        this._renderText();
    }

    /**
     * Update the text content while preserving marked state
     * @param {string} text - The updated text content
     */
    updateText(text) {
        // Update text while preserving marked state
        this.text = text;
        this.lines = text.split('\n').map(line => line.trim().split(/\s+/).filter(word => word.length > 0));
        // Keep existing markedState
        this._renderText();
    }

    /**
     * Replace a word at a specific position
     * @param {number} line - The line number
     * @param {number} index - The word index within the line
     * @param {string} word - The new word to replace with
     */
    replaceWord(line, index, word) {
        // Replace the word on line 'line', at index 'index', with word 'word'.
        // If the word was marked before, then mark the new word
        // Call the callback function onWordReplaced(line, index, oldWord, newWord) and onTextChanged()
        
        if (!this.lines[line] || index < 0 || index >= this.lines[line].length) {
            console.error(`replaceWord: invalid line (${line}) or index (${index})`);
            return;
        }
        
        const oldWord = this.lines[line][index];
        
        // Extract any trailing punctuation from the old word
        const punctuationMatch = oldWord.match(/[.,]+$/);
        const trailingPunctuation = punctuationMatch ? punctuationMatch[0] : '';
        
        // Replace the word in the data structure, preserving trailing punctuation
        this.lines[line][index] = word + trailingPunctuation;
        
        // Update the raw text to match
        this.text = this.lines.map(line => line.join(' ')).join('\n');
        
        // If the old word was marked, mark the new word
        const wasMarked = this.isWordMarked(line, index);
        if (wasMarked) {
            if (!this.markedState[line]) {
                this.markedState[line] = {};
            }
            this.markedState[line][index] = true;
        }
        
        // Re-render the text
        this._renderText();
        
        // Call callbacks
        if (this.callbacks.onWordReplaced) {
            this.callbacks.onWordReplaced(line, index, oldWord, this.lines[line][index]);
        }
        this._notifyTextChanged();
    }

    /**
     * Get the text with markup formatting
     * @param {string} [style='markup'] - The output style ('markup', 'raw', or 'replacement')
     * @returns {string} The formatted text
     */
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

    /**
     * Get only the marked (highlighted) text
     * @returns {string} The marked text content
     */
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

    /**
     * Get the first marked word and its position
     * @returns {Object} Object containing word, line, and index properties
     */
    getFirstMarkedWord() {
        for (let lineIndex = 0; lineIndex < this.lines.length; lineIndex++) {
            const line = this.lines[lineIndex];
            const lineState = this.markedState[lineIndex] || {};
            
            for (let wordIndex = 0; wordIndex < line.length; wordIndex++) {
                if (lineState[wordIndex]) {
                    const word = line[wordIndex];
                    return {
                        word: word.trim().replace(/[.,]+$/, ''),
                        line: lineIndex,
                        index: wordIndex
                    };
                }
            }
        }
        
        return {
            word: '',
            line: -1,
            index: -1
        };
    }

    /**
     * Get only the unmarked text
     * @returns {string} The unmarked text content
     */
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

    /**
     * Get the current marked state for all words
     * @returns {Object} Object mapping line indices to arrays of boolean values
     */
    getMarkedState() {
        const result = {};
        
        for (let lineIndex = 0; lineIndex < this.lines.length; lineIndex++) {
            const line = this.lines[lineIndex];
            const lineState = this.markedState[lineIndex] || {};
            result[lineIndex.toString()] = line.map((_, wordIndex) => !!lineState[wordIndex]);
        }
        
        return result;
    }

    /**
     * Check if a specific word is marked
     * @param {number} line - The line number
     * @param {number} word - The word index
     * @returns {boolean} True if the word is marked
     */
    isWordMarked(line, word) {
        const lineState = this.markedState[line];
        return lineState ? !!lineState[word] : false;
    }

    /**
     * Get the edge type of a marked word (for styling purposes)
     * @param {number} lineIndex - The line number
     * @param {number} wordIndex - The word index
     * @returns {string} Edge type: 'none', 'isolated', 'left', 'right', or 'middle'
     * @private
     */
    _getWordEdgeType(lineIndex, wordIndex) {
        if (!this.isWordMarked(lineIndex, wordIndex)) {
            return 'none';
        }
        
        const isLeftEdge = wordIndex === 0 || !this.isWordMarked(lineIndex, wordIndex - 1);
        const isRightEdge = wordIndex === this.lines[lineIndex].length - 1 || !this.isWordMarked(lineIndex, wordIndex + 1);
        
        if (isLeftEdge && isRightEdge) {
            return 'isolated';
        } else if (isLeftEdge) {
            return 'left';
        } else if (isRightEdge) {
            return 'right';
        } else {
            return 'middle';
        }
    }

    /**
     * Get the number of lines in the text
     * @returns {number} Number of lines
     */
    getNumLines() {
        return this.lines.length;
    }

    /**
     * Get the number of words in a specific line
     * @param {number} line - The line number
     * @returns {number} Number of words in the line
     */
    getNumWords(line) {
        return this.lines[line] ? this.lines[line].length : 0;
    }
    
    /**
     * Render the text with current markup state
     * @private
     */
    _renderText() {
        // Remove debouncing - render immediately
        this._performRender();
    }
    
    /**
     * Perform the actual rendering of marked up text
     * @private
     */
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
                    const markerClass = this.config.multiSelect ? this.config.markerMulti : this.config.markerSingle;
                    wordSpan.classList.add(markerClass);
                    
                    // Add rounded corners based on edge position
                    const edgeType = this._getWordEdgeType(lineIndex, wordIndex);
                    switch (edgeType) {
                        case 'isolated':
                            wordSpan.classList.add('rounded');
                            break;
                        case 'left':
                            wordSpan.classList.add('rounded-l');
                            break;
                        case 'right':
                            wordSpan.classList.add('rounded-r');
                            break;
                        case 'middle':
                            // No rounding for middle words
                            break;
                    }
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
                        if (this.config.multiSelect) {
                            spaceSpan.classList.add(this.config.markerMulti);
                        } else {
                            spaceSpan.classList.add(this.config.markerSingle);
                        }                    
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
    
    /**
     * Handle mouse down events on words
     * @param {Event} e - The mouse event
     * @param {number} lineIndex - The line index
     * @param {number} wordIndex - The word index
     * @private
     */
    _handleMouseDown(e, lineIndex, wordIndex) {
        e.preventDefault();
        
        if (this.isSingleSelectMode()) {
            // Single-select mode: ignore shift-click and drag
            if (this.selectedTool === 'eraser') {
                // Clear all selections in single-select mode with eraser
                this.clearHighlighting();
            } else {
                // Check if clicking on already marked word
                if (this.isWordMarked(lineIndex, wordIndex)) {
                    // Unmark the clicked word (since it's already marked)
                    this._toggleWord(lineIndex, wordIndex);
                } else {
                    // Clear all selections first, then mark the clicked word
                    this.clearHighlighting();
                    this._toggleWord(lineIndex, wordIndex);
                }
            }
        } else {
            // Multi-select mode: original behavior
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
    }
    
    /**
     * Handle mouse enter events on words (for drag selection)
     * @param {Event} e - The mouse event
     * @param {number} lineIndex - The line index
     * @param {number} wordIndex - The word index
     * @private
     */
    _handleMouseEnter(e, lineIndex, wordIndex) {
        if (this.isDragging && this.dragStartWord) {
            // Check if we've moved to a different word to avoid unnecessary re-renders
            if (this.dragStartWord.line !== lineIndex || this.dragStartWord.word !== wordIndex) {
                // During drag: mark range from start to current
                this._markRange(this.dragStartWord.line, this.dragStartWord.word, lineIndex, wordIndex);
            }
        }
    }
    
    /**
     * Handle mouse up events on words
     * @param {Event} e - The mouse event
     * @param {number} lineIndex - The line index
     * @param {number} wordIndex - The word index
     * @private
     */
    _handleMouseUp(e, lineIndex, wordIndex) {
        // Just clean up drag state - word was already toggled on mousedown
        this.isDragging = false;
        this.dragStartWord = null;
        this.dragTargetState = null;
    }
    
    /**
     * Handle document mouse up events (cleanup)
     * @private
     */
    _handleDocumentMouseUp() {
        this.isDragging = false;
        this.dragStartWord = null;
        this.dragTargetState = null;
    }
    
    /**
     * Toggle the marked state of a word
     * @param {number} lineIndex - The line index
     * @param {number} wordIndex - The word index
     * @private
     */
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
    
    /**
     * Toggle the marked state of an entire line
     * @param {number} lineIndex - The line index
     * @private
     */
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
    
    /**
     * Mark a range of words (for drag selection)
     * @param {number} startLine - The starting line index
     * @param {number} startWord - The starting word index
     * @param {number} endLine - The ending line index
     * @param {number} endWord - The ending word index
     * @private
     */
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
    
    /**
     * Render text immediately without debouncing
     * @private
     */
    _renderTextImmediate() {
        this._performRender();
    }
    
    /**
     * Notify callbacks that text has changed
     * @private
     */
    _notifyTextChanged() {
        if (this.callbacks.onTextChanged) {
            this.callbacks.onTextChanged();
        }
    }
}