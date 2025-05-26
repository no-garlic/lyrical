
/**
 * Auto-initialize when the DOM is loaded
 */
document.addEventListener('DOMContentLoaded', initNavigation);


export function initNavigation() {
    document.getElementById('btn-navigate-next');
    document.getElementById('btn-navigate-previous');
    document.getElementById('navigation-1');
    document.getElementById('navigation-2');
    document.getElementById('navigation-3');
    document.getElementById('navigation-4');
}


export function setNavigationNext(enabled) {
    if (enabled) {
        document.getElementById('btn-navigate-next').classList.remove('btn-disabled');
        document.getElementById('btn-navigate-next').classList.add('btn-primary');
    } else {
        document.getElementById('btn-navigate-next').classList.remove('btn-primary');
        document.getElementById('btn-navigate-next').classList.add('btn-disabled');
    }

    // Also update navigation index + 1..3


}


export function setNavigationPrevious(enabled) {
    if (enabled) {
        document.getElementById('btn-navigate-previous').classList.remove('btn-disabled');
        document.getElementById('btn-navigate-previous').classList.add('btn-primary');
    } else {
        document.getElementById('btn-navigate-previous').classList.remove('btn-primary');
        document.getElementById('btn-navigate-previous').classList.add('btn-disabled');
    }

    // Also update navigation index - 1..3


}


export function setNavigationIndex(index) {

}


export function setNavigationRange(rangeNext, rangePrev) {
    // sets how many pages can move in each direction if next or prev is enabled
}

// then can remove all the crap from the django template and views
// change to a class too
// hide footer in song library, or can song library be a different page 1? sounds best?







