
/**
 * Edit a song via API call.
 * @param {string} songId - The ID of the song to edit.
 * @param {Object} updates - Object containing fields to update (song_name and/or song_stage).
 * @returns {Promise<string>} Promise that resolves to the song ID.
 */
export function apiSongEdit(songId, updates = {}) {
    // accept updates object with specific parameters only
    const {
        song_name: songName,
        song_stage: songStage,
        song_theme: songTheme,
        song_narrative: songNarrative,
        song_mood: songMood,
        song_hook: songHook,
        custom_prompt: customPrompt,
        rhyme_with: rhymeWith,
        vocalisation_level: vocalisationLevel,
        vocalisation_terms: vocalisationTerms,
        max_hook_lines: maxHookLines,
        max_syllables_per_line: maxSyllablesPerLine,
    } = updates;

    // get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // build request body with only provided fields
    const requestBody = { song_id: songId };
    if (songName) requestBody.song_name = songName;
    if (songStage) requestBody.song_stage = songStage;
    if (songTheme) requestBody.song_theme = songTheme;
    if (songNarrative) requestBody.song_narrative = songNarrative;
    if (songMood) requestBody.song_mood = songMood;
    if (songHook) requestBody.song_hook = songHook;
    if (customPrompt) requestBody.custom_prompt = customPrompt;
    if (rhymeWith) requestBody.rhyme_with = rhymeWith;
    if (vocalisationLevel) requestBody.vocalisation_level = vocalisationLevel;
    if (vocalisationTerms) requestBody.vocalisation_terms = vocalisationTerms;
    if (maxHookLines) requestBody.max_hook_lines = maxHookLines;
    if (maxSyllablesPerLine) requestBody.max_syllables_per_line = maxSyllablesPerLine;

    // send the request to the server
    return fetch('/api_song_edit', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify(requestBody)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            console.log('edit operation returned success');
            return data.song_id;
        } else {
            console.log('no data.status received');
            throw new Error('Failed to edit song');
        }
    })
    .catch(error => {
        console.error('Error editing song:', error);
        throw error;
    });
}