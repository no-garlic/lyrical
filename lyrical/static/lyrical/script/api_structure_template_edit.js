/**
 * API function for editing song structure templates.
 * Handles updating template names and structure settings.
 */

/**
 * Edit a structure template via API call
 * @param {string} templateId - The ID of the template to edit
 * @param {Object} [updates={}] - Object containing fields to update
 * @param {string} [updates.template_name] - New template name
 * @param {number} [updates.intro_lines] - Number of intro lines
 * @param {number} [updates.outro_lines] - Number of outro lines
 * @param {number} [updates.verse_lines] - Number of verse lines
 * @param {number} [updates.pre_chorus_lines] - Number of pre-chorus lines
 * @param {number} [updates.chorus_lines] - Number of chorus lines
 * @param {number} [updates.bridge_lines] - Number of bridge lines
 * @param {number} [updates.average_syllables] - Average syllables per line
 * @param {number} [updates.vocalisation_level] - Vocalisation level
 * @param {number} [updates.vocalisation_lines] - Number of vocalisation lines
 * @param {string} [updates.vocalisation_terms] - Vocalisation terms
 * @param {string} [updates.custom_request] - Custom structure request
 * @param {string} [updates.structure] - Song structure as comma-separated string
 * @returns {Promise<string>} Promise that resolves to the template ID
 */
export function apiStructureTemplateEdit(templateId, updates = {}) {
    // Accept updates object with specific parameters only
    const {
        template_name: templateName,

        intro_lines: introLines,
        outro_lines: outroLines,
        verse_lines: verseLines,
        pre_chorus_lines: preChorusLines,
        chorus_lines: chorusLines,
        bridge_lines: bridgeLines,
        average_syllables: syllables,
        vocalisation_level: vocalisationLevel,
        vocalisation_lines: vocalisationLines,
        vocalisation_terms: vocalisationTerms,
        custom_request: customRequest,
        structure: songStructure,
    } = updates;

    // Get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // Build request body with only provided fields
    const requestBody = { template_id: templateId };

    // Base fields
    if (templateName) requestBody.template_name = templateName;
    
    // Song structure fields
    if (introLines != undefined) requestBody.intro_lines = introLines;
    if (outroLines != undefined) requestBody.outro_lines = outroLines;
    if (verseLines != undefined) requestBody.verse_lines = verseLines;
    if (preChorusLines != undefined) requestBody.pre_chorus_lines = preChorusLines;
    if (chorusLines != undefined) requestBody.chorus_lines = chorusLines;
    if (bridgeLines != undefined) requestBody.bridge_lines = bridgeLines;
    if (syllables != undefined) requestBody.average_syllables = syllables;
    if (vocalisationLevel != undefined) requestBody.vocalisation_level = vocalisationLevel;
    if (vocalisationLines != undefined) requestBody.vocalisation_lines = vocalisationLines;
    if (vocalisationTerms != undefined) requestBody.vocalisation_terms = vocalisationTerms;
    if (customRequest != undefined) requestBody.custom_request = customRequest;
    if (songStructure != undefined) requestBody.structure = songStructure;

    // Log the request body for debugging
    console.log('Request body for template edit:', JSON.stringify(requestBody, null, 2));

    // Send the request to the server
    return fetch('/api_structure_template_edit', {
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
            console.log('Edit operation returned success');
            return data.song_id;
        } else {
            console.log('No data.status received');
            throw new Error('Failed to edit template');
        }
    })
    .catch(error => {
        console.error('Error editing template:', error);
        throw error;
    });
}