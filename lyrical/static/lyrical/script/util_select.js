/*
 * Select System
 *
 * This system manages a list of selectable elements, and which element is selected.
 * Only one element can be selected at a time.
 * 
 * The following configuration parameters are available when creating the system:
 * - allowMultiSelect: If true, multiple elements can be selected at once. Default is false.
 * - allowSelectOnClick: If true, an element can be selected by clicking on it. Default is true.
 * - allowDeselectOnClick: If true, an element can be deselected by clicking on it again (unless it is the only selected element and allowNoSelection is false). Default is false, 
 * - allowNoSelection: If true, it is possible to have no element selected. Default is false.
 * - autoSelectFirstElement: If true, the first element in the list will be selected as soon as it is added. Default is false.
 * - canDeselectOnEscape: If true, the selected element can be deselected by pressing the Escape key. Default is true.
 * - canDeselectOnClickAway: If true, the selected element can be deselected by clicking on no element at all (somewhere else on the page). Default is false.
 * 
 */
export class SelectSystem {

    constructor() {

        this.callbacks = {
            onElementAdded: () => {},          // Callback function when an element is added to the system
            onElementRemoved: () => {},        // Callback function when an element is removed from the system
            canSelectElement: () => true,      // Callback function to check if an element can be selected (takes current and new element as parameters)
            canDeselectElement: () => true,    // Callback function to check if an element can be deselected (takes current element as a parameter)
            onBeforeElementChanged: () => {},  // Callback function before the selected element changes (takes current and new element as parameters)
            onAfterElementChanged: () => {},   // Callback function after the selected element changes (takes current and new element as parameters)
            onElementSelected: () => {},       // Callback function when an element is selected so the caller can change the style of the element
            onElementDeselected: () => {}      // Callback function when an element is deselected so the caller can change the style of the element
        };
    }


    /*
     * Initialise the system with the given callbacks
     * @param {Dictionary}
     */
    init(callbacks = {}) {
            this.callbacks = { ...this.callbacks, ...callbacks };
        }

    /*
     * Add a new selectable element to the system
     * @param {HTMLElement}
     */
    addElement(element) {
        // TODO: Check the element is not already in the list, if so then return false

        // TODO: Check the element is a valid selectable element, if not then return false

        // TODO: Add the element to the list of elements

        // TODO: Call the callback function        
    }


    /*
     * Remove a selectable element from the system
     * @param {HTMLElement}
     */
    removeElement(element) {
        // TODO: Undo what addElement does
    }


    /*
     * Get the currently selected element, or the first element in the list if multiple
     * elements are selected
     * @returns {HTMLElement} The currently selected element
     */
    getSelectedElement() {
    }

   
    /*
     * Get the list of currently selected elements
     * @returns {Array} The currently selected elements
     */
    getSelectedElements() {
    }


    /*
     * Select an element
     * @param {HTMLElement}
     */
    selectElement(element) {
        // TODO: Check the element is in the list of elements, if not then return false

        // TODO: Deselect the currently selected element
     
        // TODO: Call the callback function

        // TODO: Select the new element

        // TODO: Call the callback function
    }


    selectElements(elements) {  
    }

    /*
     * Deselect an element
     * @param {HTMLElement}
     */
    deselectElement(element) {
    }


    /*
     * Deselect elements
     */
    deselectElements(elements) {
    }


    /*
     * Deselect all elements
     */
    deselectAllElements() {
    }




}
