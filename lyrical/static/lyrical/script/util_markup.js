
export class Markup {

    constructor(initialConfig = {}, initialCallbacks = {}) {
        this.config = {
            ...initialConfig,
        };
        this.callbacks = {
            ...initialCallbacks,
        };
    }

    init(callbacks = {}) {
        this.callbacks = { ...this.callbacks, ...callbacks };
        
    }

    /*
     * Select which marker to use
     */
    selectMarker() {
    }

    /*
     * Select the eraser to use
     */
    selectEraser() {
    }

    isMarkerSelected() {
    }

    isEraserSelected() {
    }

    /*
     * Clear all highlighting
     */
    clearHighlighting() {        
    }

    /*
     * Sets the text that is rendered on the panel
     * 
     * text - the text that will be rendered (will be multi-line with \n linebreaks).
     *        can be changed anytime, and clears all highlighting when new text is set.
     */
    setText(text) {
    }

    getText(style) {
        // if style === 'raw':
        //      get the full text

        // if style === 'replacement':
        //      gets the full text, but replaces marked words, sequences of words, and lines of words with special tokens.
        //      Follow these rules, in order - each word will only apply to a single rule based on the adjacent words and line's markup state.
        //      this.config.replaceMarkedLinesWith: '<line>',      // replaces each complete marked line with this token
        //      this.configreplaceMarkedSequencesWith: '<words>',  // when calling getText(), replaces each sequence of words with this token
        //      this.configreplaceMarkedWordsWith: '<word>',       // when calling getText(), replaces each single isolated marked word with this token

        // if style === 'markup': (this is the default style if no argument is passed to the method)
        //      get the full text, but inserts symbols around words, sequences of words, and lines that are markedup.
        //      Follow these rules, in order - each word will only apply to a single rule based on the adjacent words and line's markup state.
        //      - for a full line of markup, replace the line of text with <<line>>
        //      - for a sequence of words, put the symbol << at the start of the sequence, and the symbol >> at the end of the sequence and keep the words
        //      - for an individual marked word, keep the word and surround it with << and >>

        // If there are marked words that span multiple lines, stick to precedence rules above, replacing lines first, then sequences, then individual words.
        // Therefore, there will never be a sequence that spans multiple lines.
    }

    getMarkedText() {
        // gets the marked text only
    }

    getUnmarkedText() {
        // gets the unmarked text only
    }

    getMarkedState() {
        // returns a dict containing a list for each line of the text, with a boolean set to true if the word
        // was marked, and false if the word was not marked.
        return {
            '0': [false, false, false, false, true, true, true],
            '1': [false, false, true, false, true, false, false],
            '2': [true, true, true, false, true, true, true],
            '3': [true, false, true, true, false, true, true],
        }
    }

    isWordMarked(line, word) {
        // checks if a word was marked
        // line - the index of the line (0 based indexing)
        // word - the index of the word within that line (0 based indexing)
    }

    getNumLines() {
        // gets the number of lines of text
    }

    getNumWords(line) {
        // gets the number of words for the given line index (0 based indexing)
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

