jQuery(document).ready(function($) {
    
    var socket = io('//darktext.org:1999');

    if (window.location.hash) {
        window.location.pathname = window.location.hash.replace('#','')+'/';
    }

    $('#folders').resizable({
        autoHide: true,
        handles: "e",
        minWidth: 70,
        maxWidth: 200,
        resize: function( event, ui ) {
            
            var bodysize = $('body').width();
            var editorwidth = Math.round( bodysize - ui.size.width );
            $('#folders').width(ui.size.width);
            $('#editor').css('width', editorwidth).css('left', ui.size.width);
        }

    });

    $('#folders ul li').click( function(e) {
        var directory = $(this).attr('id');
        socket.emit('directory', { directory: directory });
    });
    
    if (folders.length > 0) {
        $('#editor').addClass('leftOpen').width('86%');
        $('.subfolders').slideUp('fast');
    }

    if ($('.folder .subfolders').length > 0) {
        $('[data-folder="'+directory+'"]').addClass('selected');
    } else {
        $('[data-folder="'+file+'"]').addClass('selected');
    }

    $('.folder div').on('click', function(e) {
        var folder = $(this).parent().attr('data-folder');

        if ($('.folder .subfolders').length > 0) {
            if ($(this).parent().find('.subfolders').hasClass('open')) {
                $(this).parent().find('.subfolders').slideUp('fast').removeClass('open');
            } else {
                socket.emit('command', {
                    command: 'o',
                    directory: folder,
                    file: 'index'
                });
                $(this).parent().find('.subfolders').slideDown('fast').addClass('open');
            }
        } else {
            socket.emit('command', {
                command: 'o',
                directory: directory,
                file: folder
            });
        }

       

    });

    $('#tilda').tilda(function(input, terminal) { 

        var lastdata, lastresponce;
    	socket.on('response', function (data) { 
            if (data != lastdata) {
                var response = 'Unknown command. Type [h] for a help file.';
                switch (data.command) {
                    case 'saved':
                        response = 'Data saved.';
                    break;
                }    
                lastdata = data;
            }
            if (responce != lastresponce) {
                terminal.echo(responce);
                lastresponce = response;
            }
        });

        var body = editor.getValue(),
            tilda = terminal;

    	var cmd = {
    		command: input,
            file: file,
            directory: directory,
            path: path,
    		body: body
    	}

    	socket.emit('command', cmd); 

        socket.on('disconnect', function (data) { terminal.echo('Disconnected from server'); });
        socket.on('reconnect', function (data) { terminal.echo('Server connection re-stablished.'); });


    });

    $('.subfolders .file div').on('click', function(e) {
        var file = $(this).parent().attr('data-file');
        var folder = $(this).parent().attr('data-folder');
        socket.emit('command', {
            command: 'o',
            directory: folder,
            file: file
        });
    });

    var updegrees = 0;
    $('.controls .fa-plus').on('click', function(e) {
        updegrees =+ 90;
        $(this).css( 'transform', 'rotate('+updegrees+'deg)' );
        $('.folder').removeClass('selected');
        $('#folders ul').append('<li data-folder="index" class="folder selected"><div><input type="text" class="newfile" id="newfile" name="newfile" onKeyUp="nameFile(event)" /></div></li>');
        $('.newfile').focus();
    });

    var downdegs = 0;
    $('.controls .fa-minus').on('click', function(e) {
        downdegs =+ 180;
        $(this).css( 'transform', 'rotate('+downdegs+'deg)' );
        $('.selected').remove();
    });
 
    socket.on('open', function (data) {
        file = data.file;
        directory = data.directory;
        path = data.directory+'/'+data.file;
        $('.prompt').html('~/'+path+'$ ');
        editor.setValue(data.body, -1);
        $('li').removeClass('selected');
        if ($('li .subfolders').length > 0) {
            $('[data-file="'+file+'"][data-folder="'+directory+'"]').addClass('selected');
        } else {
            $('[data-folder="'+file+'"]').addClass('selected');    
        }
        window.location.hash = path;
    });

    socket.on('body', function (data) { editor.setValue(data.body, -1); });
    
    editor.on('change', function (data) {
        var content = editor.getValue(),
        cursor = editor.getCursorPosition();
        socket.emit('change', {
            file: file,
            directory: directory,
            cursor: cursor,
            body: content
        });
    });

    socket.on('insert', function (data) { 
        var cursor = editor.getCursorPosition(),
        body = editor.getValue();
        if (data.body != body) {
            console.log(body);
            console.log(data.body);
        }
        // if (data.body != body) editor.setValue(data.body, cursor);
    });
});
function nameFile(e) {
    var val = $(this).val();
    if (e.keyCode == 13) {
        $(this).remove().parent().append(val).parent().attr('data-folder', val);
    } else {
        $(this).attr('data-folder', val);
    }
}