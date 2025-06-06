
/**
 * helper class for handling streaming http requests with ndjson responses
 * provides callbacks for different stages of the streaming process
 */
export class StreamHelper {
    /**
     * creates a new streamhelper instance
     * @param {string} baseUrl - the base url for the streaming endpoint
     * @param {object} [options={}] - configuration options
     * @param {object} [options.callbacks] - callback functions for stream events
     * @param {string} [options.csrfTokenSelector] - css selector for csrf token element
     */
    constructor(baseUrl, options = {}) {
        this.baseUrl = baseUrl;
        this.params = new URLSearchParams();
        this.callbacks = {
            onPreRequest: () => {},
            onIncomingData: () => {},
            onStreamEnd: () => {},
            onComplete: () => {},
            onError: () => {},
            ...options.callbacks,
        };
        this.csrfTokenSelector = options.csrfTokenSelector || '[name=csrfmiddlewaretoken]';
        this.abortController = null;
    }

    /**
     * sets a url parameter that will be included in requests
     * @param {string} name - the name of the parameter
     * @param {string} value - the value of the parameter
     */
    setParameter(name, value) {
        this.params.set(name, value);
    }

    /**
     * removes a default url parameter
     * @param {string} name - the name of the parameter
     */
    removeParameter(name) {
        this.params.delete(name);
    }

    /**
     * clears all default url parameters
     */
    clearParameters() {
        this.params = new URLSearchParams();
    }

    /**
     * initiates the streaming request
     * @param {object} [requestSpecificParams={}] - parameters for this specific request
     *                                            these are combined with and can override default parameters
     */
    initiateRequest(requestSpecificParams = {}) {
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        // Store request params for later use (e.g., in completion handler)
        this.lastRequestParams = requestSpecificParams;

        this.callbacks.onPreRequest();

        const finalParams = this._buildFinalParams(requestSpecificParams);
        const csrfToken = this._getCsrfToken();
        const url = `${this.baseUrl}?${finalParams.toString()}`;

        const fetchOptions = this._buildFetchOptions(csrfToken, signal);

        fetch(url, fetchOptions)
            .then(response => this._handleResponse(response))
            .catch(error => this._handleError(error));
    }

    /**
     * builds final parameters combining default and request-specific params
     * @param {object} requestSpecificParams - request-specific parameters
     * @returns {URLSearchParams} combined parameters
     * @private
     */
    _buildFinalParams(requestSpecificParams) {
        const finalParams = new URLSearchParams(this.params);
        for (const key in requestSpecificParams) {
            if (Object.hasOwnProperty.call(requestSpecificParams, key)) {
                finalParams.set(key, requestSpecificParams[key]);
            }
        }
        return finalParams;
    }

    /**
     * retrieves csrf token from the document
     * @returns {string|null} csrf token value or null if not found
     * @private
     */
    _getCsrfToken() {
        const csrfTokenInput = document.querySelector(this.csrfTokenSelector);
        const csrfToken = csrfTokenInput ? csrfTokenInput.value : null;

        if (!csrfToken) {
            console.warn('csrf token not found using selector:', this.csrfTokenSelector, '. request might fail.');
        }

        return csrfToken;
    }

    /**
     * builds fetch options for the request
     * @param {string|null} csrfToken - csrf token
     * @param {AbortSignal} signal - abort signal
     * @returns {object} fetch options
     * @private
     */
    _buildFetchOptions(csrfToken, signal) {
        return {
            method: 'GET',
            headers: {
                ...(csrfToken && { 'X-CSRFToken': csrfToken }),
                'Accept': 'application/x-ndjson',
            },
            signal,
        };
    }

    /**
     * handles the fetch response
     * @param {Response} response - fetch response
     * @returns {Promise} promise that resolves after processing the stream
     * @private
     */
    _handleResponse(response) {
        if (!response.ok) {
            return this._handleServerError(response);
        }
        if (!response.body) {
            throw { type: 'network', message: 'response body is missing.', response: response };
        }
        return this._processStream(response.body);
    }

    /**
     * handles server error responses
     * @param {Response} response - fetch response with error
     * @returns {Promise} rejected promise with error details
     * @private
     */
    _handleServerError(response) {
        return response.json()
            .then(errData => {
                throw {
                    type: 'server',
                    status: response.status,
                    message: errData.error || errData.detail || response.statusText || 'server error',
                    data: errData,
                    response: response
                };
            })
            .catch(() => {
                throw {
                    type: 'server',
                    status: response.status,
                    message: response.statusText || 'server error with non-json response',
                    response: response
                };
            });
    }

    /**
     * handles fetch errors
     * @param {Error} error - error object
     * @private
     */
    _handleError(error) {
        if (error.name === 'AbortError') {
            console.log('fetch aborted by user.');
            return;
        }
        const errorObject = {
            type: error.type || 'network',
            message: error.message || 'an unexpected network or request error occurred.',
            status: error.status,
            data: error.data,
            originalError: error
        };
        this.callbacks.onError(errorObject);
        this._handleCompletion();
    }

    /**
     * aborts the current streaming request, if any
     */
    abortRequest() {
        if (this.abortController) {
            this.abortController.abort();
        }
    }

    /**
     * processes the streaming response body
     * @param {ReadableStream} readableStream - the response stream
     * @returns {Promise} promise that resolves when stream processing is complete
     * @private
     */
    async _processStream(readableStream) {
        const reader = readableStream.getReader();
        const decoder = new TextDecoder();
        let accumulatedData = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    this._processRemainingData(accumulatedData);
                    this.callbacks.onStreamEnd();
                    break;
                }

                accumulatedData += decoder.decode(value, { stream: true });
                accumulatedData = this._processLines(accumulatedData);
            }
        } catch (error) {
            this._handleStreamError(error);
        } finally {
            reader.releaseLock();
            if (!this.abortController || !this.abortController.signal.aborted) {
                this._handleCompletion();
            }
            this.abortController = null;
        }
    }

    /**
     * processes any remaining data in the buffer when stream ends
     * @param {string} accumulatedData - remaining data
     * @private
     */
    _processRemainingData(accumulatedData) {
        if (accumulatedData.trim() !== '') {
            console.warn('stream ended with unprocessed data in buffer:', accumulatedData);
            try {
                const jsonData = JSON.parse(accumulatedData);
                this.callbacks.onIncomingData(jsonData);
            } catch (e) {
                this.callbacks.onError({
                    type: 'parsing',
                    message: 'failed to parse final json object from stream buffer.',
                    raw_content: accumulatedData,
                    details: e.toString(),
                });
            }
        }
    }

    /**
     * processes complete lines from accumulated data
     * @param {string} accumulatedData - accumulated stream data
     * @returns {string} remaining unprocessed data
     * @private
     */
    _processLines(accumulatedData) {
        let newlineIndex;
        while ((newlineIndex = accumulatedData.indexOf('\n')) >= 0) {
            const line = accumulatedData.substring(0, newlineIndex);
            accumulatedData = accumulatedData.substring(newlineIndex + 1);

            if (line.trim() !== '') {
                this._parseLine(line);
            }
        }
        return accumulatedData;
    }

    /**
     * parses a single line as json
     * @param {string} line - line to parse
     * @private
     */
    _parseLine(line) {
        try {
            const jsonData = JSON.parse(line);
            this.callbacks.onIncomingData(jsonData);
        } catch (e) {
            this.callbacks.onError({
                type: 'parsing',
                message: 'failed to parse ndjson line from stream.',
                raw_content: line,
                details: e.toString(),
            });
        }
    }

    /**
     * handles errors during stream processing
     * @param {Error} error - error object
     * @private
     */
    _handleStreamError(error) {
        if (error.name === 'AbortError') {
            console.log('stream reading aborted by user.');
            return;
        }
        this.callbacks.onError({
            type: 'stream_processing',
            message: 'error while processing the data stream.',
            details: error.toString(),
            originalError: error,
        });
    }

    /**
     * handles completion by checking summarization status and calling onComplete callback
     * @private
     */
    async _handleCompletion() {
        try {
            // Check if this is a generation endpoint that should check summarization
            // Try to get song_id from either the default params or the last request params
            let songId = this.params.get('song_id');
            if (!songId && this.lastRequestParams) {
                songId = this.lastRequestParams['song_id'];
            }
            
            const shouldCheck = this._shouldCheckSummarization();
            
            if (songId && shouldCheck) {
                // Import the summarization API
                const { apiCheckSummarisationStatus } = await import('./api_summarise_chat_history.js');
                
                // Check summarization status
                const statusData = await apiCheckSummarisationStatus(songId);
                
                const callbackData = {
                    needsSummarisation: statusData.any_needs_summarisation,
                    summarisationDetails: statusData
                };
                
                // Call onComplete with summarization information
                this.callbacks.onComplete(callbackData);
            } else {
                // Call onComplete without summarization data for backwards compatibility
                this.callbacks.onComplete();
            }
        } catch (error) {
            console.warn('Failed to check summarization status after stream completion:', error);
            // Fall back to standard completion call
            this.callbacks.onComplete();
        }
    }

    /**
     * determines if summarization status should be checked for this endpoint
     * @returns {boolean} true if summarization check should be performed
     * @private
     */
    _shouldCheckSummarization() {
        // Check if this is a generation endpoint that creates messages
        const generationEndpoints = [
            'api_gen_song_lyrics',
            'api_gen_song_lyrics_section', 
            'api_gen_song_styles'
        ];
        
        return generationEndpoints.some(endpoint => this.baseUrl.includes(endpoint));
    }
}
