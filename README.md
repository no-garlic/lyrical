# lyrical

## Done
 - Create README with TODO list
 - Only show edit & delete buttons when hovering the card
 - Bug with floating circle from top left corner, likely in my drag-drop code
 - Rename MANAGE to NEW
 - Look at fonts and font sizes for the panel titles
 - Set cursor to the end of the field when setting focus, or select all
 - Look at changing Temperature and Max Tokens to orange or blue
 - Look at changing the timeline to orange
 - Show the selected LLM cost per 1M tokens on the sidebar
 - Remove SONG TITLE on names page, put MANAGE SONG NAMES in middle of the page or something
 - Rename util_streamhelper to util_stream_helper
 - Save song status when drag-dropping
 - Refactor song-card javascript out of names.js into util_card_song, so it can be reused
 - Able to create a new song name
 - Refactor other apiXxx javascript files to return a promise
 - Work out how to show errors and implement that for all current api calls (eg, duplicate song name)
 - Try moving edit and delete buttons to the header, edit can then show a modal.
 - Validation for song name editing
 - Stop drag and drop when editing
 - When editing, hide all other edit and delete buttons when hovering
 - Refactor js code, tidy up, rename apis, etc
 - API call and update UI for showing the current LLM details, and changing to a different LLM
 - API call and update UI for showing LLM parameters (temperature and max tokens)
 - Generate Song Names (basic functionality) and add them to the NEW section
 - Dislike All button
 - Archive All button and archive song stage
 - Highlight new cards until clicked on
 - Refactor initDragDropSystem
 - Sort lists and sort cards when added to lists
 - Hook up max_tokens and temperature
 - Use Generate values when doing llm call
 - Improve layout of generate values dialog
 - Save default values for all form fields (in browser? or in database?)
 - Fix scrollbars
 - Then scroll to card on drag-drop and add-new
 - Move GENERATE NAMES to top, NEW to bottom
 - Remove hard coded reference to id's like panel-top-content so I can name them as I wish
 - At init time, vertical slider position should be such that the panel below it consumes the full space and no gap
 - Names page should have 4 columns, with the left most column being the generate dialog.
 - Remove the timeline and footer, add a title (maybe a new base template - base_navigation)
 - Add a sidebar entry for names.html, and clean up the view
 - Show Generation Progress on Generate button
 - Press Enter on selected should edit
 - Trim whitespace when editing
 - Published song stage and add all my songs in the migration 


## Todo
 - Refactor llm generation code in python mostly
 - Simplify all views
 - Make sure llm generation errors flow to the page with a useful error shown

 - Refactor names.js - its too long


## Backlog
 - Make the library page page 1 of the timeline
 - Create Lyrics button on names.html goes to page 2 of edit
 - Complete the implementation of util_navigation.js
 - Update LLM Costs and maybe add other models for testing
 - Change Toast system to be a singleton
 - Filtering song names (library page)
 - Login Required for all pages
 - Drag and drop not showing custom cursors
 - Media query to hide the girl image, and reduce the padding when the page height is reduced
 - Change font color on login and register pages
 - Link to home on login and register pages
 - Implement logging module for all code (get claude code to implement it)


## Maybe
 - Able to set default panel widths and panel slider position
 - Save Column Widths & panel slider position
 - When a new card is added, make sure it is visible (scroll to it), depends on sorting, etc
 - Icons on buttons?



## Bugs:
 - Bug: when generating with ollama I got duplicate song names, and it caused an exception on the server and didnt notify the client, just a broken stream and messed up UI.
 - Bug: Gemini Flash 1.5: LLM_SERVICE_NDJSON_PARSE_ERROR: Malformed JSON line: ```ndjson, Error: Expecting value: line 1 column 1 (char 0)
 - If duplicate song name is returned or corrupt NDJSON, then ignore it and send a token to the client which it can ignore and not raise an error.
