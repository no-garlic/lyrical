import logging
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseServerError
from django.db.models.functions import Lower
from .. import models


logger = logging.getLogger('views')



def make_song_lyrics(song):
    """
    Extracts lyrics sections from the song object.
    """
    # if the song has no lyrics, then create the lyrics sections from the
    # song structure and return them
    song_structure_list = song.structure.split(",") if song.structure else []

    # clean up the song structure list by removing empty items and stripping whitespace
    if len(song_structure_list) == 0:
        logger.warning("make_lyrics_sections: song structure is empty, returning None")
        return None

    # if the song has lyrics, then return the existing lyrics sections
    current_lyrics = models.Lyrics.objects.filter(song=song)

    index = {}
    song_lyrics = []

    # go through the song structure and create sections
    for item_name in song_structure_list:

        # get the item type
        item_name = item_name.strip().lower()

        if item_name not in ['verse']:
            index[item_name] = 0
        elif item_name not in index:
            index[item_name] = 1
        else:
            index[item_name] += 1
        item_index = index[item_name]

        # check if the section already exists
        song_section = current_lyrics.filter(
            type=item_name,
            index=item_index
        ).first()

        # if the section already exists, skip it
        if song_section:
            logger.debug(f"make_lyrics_sections: section '{item_name}' with index {item_index} already exists for song '{song.name}'")
        else:        
            logger.debug(f"make_lyrics_sections: creating section '{item_name}' with index {item_index} for song '{song.name}'")

            # if the section does not exist, create it
            song_section = models.Lyrics.objects.create(
                song=song,
                type=item_name,
                words="",
                index=item_index
            )

        # add the section to the song structure
        song_lyrics.append({
            "id": song_section.id,
            "type": song_section.type,
            "name": song_section.type.upper() if song_section.type != 'verse' else f"{song_section.type.upper()} {song_section.index}",
            "item_name": f"section-{item_name}" if item_name != 'verse' else f"section-verse{item_index}",
            "index": song_section.index,
            "words": song_section.words,
            "allow_words": True if song_section.type in ['verse', 'pre-chorus', 'chorus', 'bridge', 'outro', 'interlude', 'vocalisation'] else False,
        })
    
    return song_lyrics


@login_required
def page_lyrics(request, song_id: int):

    navigation = [
        {"name": "SONG", "url": "song", "active": True, "selected": False, "enabled": True},
        {"name": "STYLE", "url": "style", "active": True, "selected": False, "enabled": True},
        {"name": "STRUCTURE", "url": "structure", "active": True, "selected": False, "enabled": True},
        {"name": "LYRICS", "url": "lyrics", "active": True, "selected": True, "enabled": True},
    ]

    if not song_id:
        logger.error("page_lyrics: song_id is None or invalid")
        return HttpResponseServerError("Invalid song ID")

    try:
        song = models.Song.objects.get(id=song_id, user=request.user)
    except models.Song.DoesNotExist:
        logger.error(f"page_lyrics: song with id {song_id} does not exist for user '{request.user.username}'")
        return HttpResponseServerError("Song not found")
    except Exception as e:
        logger.error(f"page_lyrics: error fetching song with id {song_id} for user '{request.user.username}': {str(e)}")
        return HttpResponseServerError("An error occurred while fetching the song")

    # make sure the lyrics sections are created for the song
    song_lyrics = make_song_lyrics(song)

    context = {
        "active_page": "lyrics",
        "navigation": navigation,
        "btn_next": None,
        "btn_previous": None,
        "selectedSongId": song_id,
        "song": song,
        "song_lyrics": song_lyrics,
    }

    try:
        context.update({
            "llm_models": models.LLM.objects.all(),
        })

    except Exception as db_error:
        logger.error(f"database error fetching data for user '{request.user.username}': {str(db_error)}")
        
        context.update({
            "error_message": "unable to load data at this time, please try again later"
        })

    return render(request, "lyrical/lyrics.html", context)
