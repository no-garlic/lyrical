# LYRICAL

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
 - Refactor llm generation code in python mostly
 - Make sure llm generation errors flow to the page with a useful error shown
 - Simplify all views
 - Refactor names.js - its too long
 - Add the include and exclude song theme's to the song model, so they can be used when generating the style.  
 - If they dont exist, use the user's defaults.  Update the yaml prompt.
 - Add a filter to show only theme, mood, narrative.
 - Generate for just the selected tab
 - Add custom styles for badges, instead of badge-correct, use badge-mood for example.
 - Use message history for song styles
 - Convert all prints to logger, use claude to do it, and enable logger categories
 - Login Required for all pages
 - Fixed: Gemini Flash 1.5: LLM_SERVICE_NDJSON_PARSE_ERROR: Malformed JSON line: ```ndjson, Error: Expecting value: line 1 column 1 (char 0)
 - Previous button should work on song style page as long as saved.
 - Swap side of lists on style and hook pages
 - Change order: Song -> Style -> Structure -> Hook -> Lyrics
 - Move hook page generation params into the database
 - Fix Previous button's for new flow
 - Update layout so Save and Cancel appear to apply to the whole page
 - Implement Save and Cancel of Song Sections
 - Structure page can set song tags, and all song generation parameters
 - Structure page can save, save as, delete, and select (assign to song) structure templates - assigning it to a song copies it
 - Show grab hands when can drag drop an item
 - Implement Save and Cancel of Settings
 - Implement Settings Controls and Default Values
 - Implement Clear
 - Implement Templates
 - bug: API's dont send blank values to the database, so if I delete all text in a textbox and save, it wont delete it.
 - Structure: drag and drop not working to the last slot
 - Add a cancel button for Structure page
 - Implement updateNavigationButtonStates
 - Remove verse_count
 - Can Skip Hook Page if empty
 - Single Save Button for Song Hook Page
 - Fix jitter upon closing a modal
 - Link to home on login and register pages
 - Bug: Unable to save an empty Song Hook, Theme, Mood, Narrative, etc...
 - Redo the song names page, remove disliked list
 - Song Names should have a thumbs up and thumbs down on them
 - Get rid of archived status from songs
 - Song Names Page: TypeError: Can't instantiate abstract class SongNamesGenerator without an implementation for abstract methods 'get_message_type', 'get_song_id'
 - Song Name Cards should show name in uppercase
 - Implement Previous and Next buttons
 - Update pages: max-w[100%], 550px / 550px
 - Song Structure dialog needs to be a few px wider to match style page width
 - Update navigation system hyperlinks
 - Song page same height as style page
 - Change font color on login and register pages
 - Implement Custom Request in database & yaml for Song Names
 - Replace the Next and Prev icons with bootstrap instead of svg
 - Admin classes
 - Delete the implementation of util_navigation.js
 - Delete horizontal and vertical resize code

 - Move API Keys out of the database
 - Hot-Reload yaml files


## Todo

2025-06-08 06:39:58 [DEBUG] services: Prompt 'lyrics_summary' found in internal prompts
2025-06-08 06:39:58 [INFO] services: Calling summarisation model gemini/gemini-2.0-flash for lyrics conversation
2025-06-08 06:40:04 [INFO] httpx: HTTP Request: POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyBmEXSBfLyy7m_iq5XnvuDot0unSF3nqeA "HTTP/1.1 200 OK"
2025-06-08 06:40:04 [INFO] services: Generated summary of 2934 characters for lyrics conversation
2025-06-08 06:40:04 [ERROR] services: Error summarising conversation for song 84, type 'lyrics': database is locked
2025-06-08 06:40:04 [ERROR] apis: Summarisation failed for user mpetrou, song 84, type 'lyrics'
2025-06-08 06:40:04 [ERROR] django.request: Internal Server Error: /api_summarise_chat_history
2025-06-08 06:40:04 [INFO] apis: User mpetrou updated section 19 hidden status to True
2025-06-08 06:40:04 [INFO] apis: User mpetrou updated section 20 hidden status to True

bug - textedit + save does not update right song lyrics

 - Need to be able to create an instrumental Intro
 - Sort order of new generations
 - Make new generations light grey until clicked on
 - Review all code from LLM on Friday
 - Update code documentation (use co-pilot)
 - Profile Page
 - Library Page
 - Regenerate -> send custom request (check), and send current section lyrics to llm.
 - Disable Regenerate button if not saved.
 - Add a Rhyme feature somehow to the edit page (different selection mode?)
 - Make regenerate button wider, and change lable to something like GENERATE CHOICES or GENERATE MORE or GENERATE OPTIONS.
 - Flash 1.5 gave me a VERSE_ALTERNATIVE not a VERSE, should be able to fix it in code, plus improve the prompt
 - Move Next and Prev Buttons - try just under the page
 - Follow Up Prompt
 - Improve the summarisation, and the follow up prompts need to be very specific about the format and details because they can be summarised away.
 - Update default page upon login
 - Update modals to look consistent
 - Remove all the exception handling and do it better


### Bugs & Polish:
 - Set browser title to song name
 - Create 8 records for structure templates when creating a user
 - Create at least 1 proper structure template in the migration 
 - Update prompts about combining vocalisations, eg, ah, aah or ah-ah-ah, ooh-ah-ahh
 - Update prompt about other rules, like ... and rrrrrrun, and trailing ``````
 - When a new card is added, make sure it is visible (scroll to it), depends on sorting, etc
 - Use: badge.scrollIntoView({ behavior: 'smooth', block: 'center' });
 - Refactor using btn-generate for songId - get it from document.body instead
 - Double click on song page to go to Next
 - Make all modals looks the same
 - Add href# to Navigation Timeline
 - Make all panels use scrollbars the same
 - Create follow up prompts, eg, song_hooks.follow_up.
 - Add bootstrap icons to buttons
 - Update register and login pages
 - Create Lyrics button on names.html goes to page 2 of edit (or dblclick?)
 - Use tabs on song page instead of booleans
 - Update LLM Costs and maybe add other models for testing
 - Update range for Max Tokens, set better default, update range based on selected model maybe?
 - Change Toast system to be a singleton
 - Drag and drop not showing custom cursors
 - Drag and drop not animating back upon drop out of bounds for lyrics page
 - Media query to hide the girl image, and reduce the padding when the page height is reduced
 - Click close button on a card, shows another X and Tick as a confirmation
 - Review scrollbars use on all pages
 - Put instructional text on every page to tell the user what to do
 - Add filter to ignore specific words for song names (Victorious for example)
 - Bug: Handle duplicate song name from LLM quietly
 