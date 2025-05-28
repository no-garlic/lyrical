

let pages;
let btnPrev;
let btnNext;



/**
 * Auto-initialize when the DOM is loaded
 */
document.addEventListener('DOMContentLoaded', initNavigation(1));


// if page.active:     add "step-primary"
// if page.selected:   add "font-bold text-md" else add "text-sm"
// if page.enabled:    add "cursor-pointer"    else add "text-neutral"


function initNavigation(pageId) {
    // console.log(`initialising the navigation system for page ${pageId}`);

    pages = {
        'song': document.getElementById('navigation-song'),
        'prepare': document.getElementById('navigation-prepare'),
        'lyrics': document.getElementById('navigation-lyrics'),
        'structure': document.getElementById('navigation-structure')
    }

    btnNext = document.getElementById('btn-navigate-next');
    btnPrev = document.getElementById('btn-navigate-previous');
    
    //if (!pages.song || !pages.prepare || !pages.lyrics || !pages.structure || !btnNext || !btnPrev)
    //    console.error('Failed to get the required elements from the page');    
   
    //pages.values.forEach(page => {
    //    console.log(page);
    //});


    

}

export function setNavigationNext() {
    
}
export function setNavigationIndex() {
    
}
export function setNavigationPrevious() {
    
}


