document.addEventListener('DOMContentLoaded', () => {
    makeVerticallyResizable(
        document.getElementById('panel-top-content'),
        document.getElementById('panel-vertical-splitter'),
        document.getElementById('panel-bottom-content')
    );

    document.getElementById('btn-generate-song-names').onclick = (event) => {
        alert("clicked!")
    }

});


