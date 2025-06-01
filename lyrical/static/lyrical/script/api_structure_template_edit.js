

export function apiStructureTemplateEdit(templateId, updates = {}) {
    // accept updates object with specific parameters only
    const {
        template_name: templateName,

        intro_lines: introLines,
        outro_lines: outroLines,
        verse_count: verseCount,
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

    // get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // build request body with only provided fields
    const requestBody = { template_id: templateId };

    // base fields
    if (templateName) requestBody.template_name = templateName;
    
    // song structure fields
    if (introLines != undefined) requestBody.intro_lines = introLines;
    if (outroLines != undefined) requestBody.outro_lines = outroLines;
    if (verseCount != undefined) requestBody.verse_count = verseCount;
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

    // send the request to the server
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
            console.log('edit operation returned success');
            return data.song_id;
        } else {
            console.log('no data.status received');
            throw new Error('Failed to edit template');
        }
    })
    .catch(error => {
        console.error('Error editing template:', error);
        throw error;
    });
}