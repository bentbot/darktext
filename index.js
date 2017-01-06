var cookieParser = require('cookie-parser'),
	bodyParser = require('body-parser'),
	websocket = require('socket.io'),
	readjson = require('read-json'),
	winston = require ('winston'),
	express = require('express'),
	auth = require('http-auth'),
	async = require('async'),
	https = require('https'),
	http = require('http'),
	jade = require('jade'),
	fs = require('fs'),
	now = new Date(),
	app = express(),
	data;

var vars = {
	title: 'Darktext',
	description: 'A console based text editor',
	version: '0.1',
	author: 'Bent Bot',
	editor: 'ace',
	theme: 'twilight',
	font: 'monospace',
	mode: 'html',
	files: 'docs',
	logs: 'logs',
	port: 8000
}

var basic = auth.basic({
	realm: "Darktext"
}, function (username, password, callback) {
	callback(username === 'darktext' && password === 'darktext');
});

var io = websocket.listen(1999);
var shoe = io;

winston.add(winston.transports.File, { filename: vars.logs+'/'+'dev.log' });

app.use( cookieParser() );
app.use( bodyParser.urlencoded({ extended: false }) );
app.use( auth.connect(basic) );

app.use( '/includes', express.static('views/includes') );
app.use( '/includes/ace', express.static('views/includes/ace') );

var editor = jade.compileFile('views/editor.jade');

app.get('/render/:file', function (req, res) {
	vars.file = req.params.file;
	res.set('Content-Type', 'text/html');
	fs.readFile('./'+vars.files+vars.file, 'utf8', function (err, data) {
		if (err) { res.send(err.code); } else { res.send(data); }
	});
});
app.get('/:file', function (req, res) {

	vars.directory = req.params.file;
	vars.file = 'index';
	vars.folders = [];
	vars.path = vars.directory;
	vars.body = '';

	fs.readdir('./'+vars.files+'/'+vars.directory, function (err, folders) {
		async.each(folders, function (folder) {
			vars.folders.push({ name: folder });
		});
	});

	// Open a folder from disk
	fs.readdir('./'+vars.files+'/'+vars.directory, function (err, folders) {
		
		if (err) {
			// Open a file from disk
			fs.readFile('./'+vars.files+'/'+vars.directory+'/'+vars.file, 'utf8', function (err, data) {
				if (err) {
					vars.body = '';
					res.send( editor(vars) );
				} else {
					vars.body = data;
					vars.path = vars.path+'/'+vars.file;
					res.send( editor(vars) );
					winston.log('fileRead', vars.directory+'/'+vars.file);
				}
			}); // Read File

		} else {
			winston.log('directoryRead', vars.directory);
				
			// Open a file from disk
			fs.readFile('./'+vars.files+'/'+vars.directory+'/'+vars.file, 'utf8', function (err, data) {
				if (err) {
					vars.body = '';
				} else {
					vars.body = data;
					vars.path = vars.path+'/'+vars.file;
					res.send( editor(vars) );
					winston.log('fileRead', vars.directory+'/'+vars.file);
				}
			}); // Read File	

		}
	});
});

app.get('/:folder/:file', function (req, res) {

	vars.directory = req.params.folder;
	vars.file = req.params.file;
	vars.folders = [];
	vars.path = vars.directory + '/' + vars.file;
	vars.body = '';

	fs.readdir('./'+vars.files+'/'+vars.directory, function (err, folders) {
		async.each(folders, function (folder) {
			vars.folders.push({ name: folder });
		});
	});

	console.log(vars);

	// Open a file from disk
	fs.readFile('./'+vars.files+'/'+vars.directory+'/'+vars.file, 'utf8', function (err, data) {
		if (err) {
			vars.body = '';
			res.send( editor(vars) );
		} else {
			vars.body = data;
			res.send( editor(vars) );
			winston.log('fileRead', vars.file);
		}
	}); // Read File

});
// Viewing Logs
app.get('/log', function (req, res) {
	vars.file = 'dev.log';
	vars.directory = 'logs';
	vars.folders = false;
	vars.path = vars.logs+'/'+vars.file;
	fs.readFile('./'+vars.logs+'/'+vars.file, 'utf8', function (err, data) {
		if (err) throw (err);
		vars.body = data;
		winston.log('logRead', vars.file);
		res.send( editor(vars) );
	});
});

// Document Index
app.get('/', function (req, res) {
	vars.directory = 'help';	
	vars.file = 'index';
	vars.folders = [];
	vars.path = vars.directory+'/'+vars.file;
	// Read the index of files
	 fs.readdir('./'+vars.files, function (err, folders) {
		async.each(folders, function (folder) {
			fs.readdir('./'+vars.files+'/'+folder, function (err, subfolders) {
				vars.folders.push({ name: folder, subfolders: subfolders });
			});
		});
	});

	// fs.readdir('./'+vars.files, function (err, folders) {
	// 	if (err) throw (err);
	// 	winston.log('rootIndex', './'+vars.files);	
	// });
	// Read the index file
	fs.readFile('./'+vars.files+'/'+vars.directory+'/'+vars.file, 'utf8', function (err, data) {
		if (err) { vars.body = 'Error opening '+err.path; } else { vars.body = data; }
		res.send( editor(vars) );
		shoe = io.of('/');
		winston.log('fileRead', vars.file);
	});
});

// Websockets 
shoe.on('connection', function (sock) {
	sock.on('command', function (data) {
		var cmd = data.command;	
		cmd = cmd.split(' ');
		switch (cmd[0]) {
			case 's':
			case 'save':
				// Save file
				fs.access('./'+vars.files+'/'+data.directory, function (err) {
					if ( err ) {
						fs.mkdir('./'+vars.files+'/'+data.directory, function (err) {
							if (err) throw err;
							fs.writeFile('./'+vars.files+'/'+data.directory + '/' + data.file, data.body, function (err) {
								if (err) throw (err);
								winston.log('save', data.file);
							});
						});
					} else {
						fs.writeFile('./'+vars.files+'/'+data.directory + '/' + data.file, data.body, function (err) {
							if (err) {
								
							}
							winston.log('save', data.file);
						});
					}
				});

			break;
			case 'rm':
			case 'remove':
				fs.access('./'+vars.files+'/'+data.directory, function (err) {
					if ( err ) {
				
					} else {
						fs.unlink('./'+vars.files+'/'+data.directory+'/'+data.file, function (err) {
							if (err) throw (err);
							fs.readdir('./'+vars.files+'/'+data.directory, function (err, folders) {
								if (err) throw (err);
								if (folders.length == 0) {
									fs.rmdir('./'+vars.files+'/'+data.directory, function (err) {
										if (err) throw (err);
									}); 
								}
							});
							winston.log('remove', data.file);
						});
					}
				});
			break;
			case 'o':
			case 'open':
				vars.folders = [];
				vars.path = data.directory+'/'+data.file;
				fs.readdir('./'+vars.files+'/'+vars.path, function (err, folders) {
					async.each(folders, function (folder) {
						vars.folders.push({ name: folder });
					});
				});

				fs.readFile('./'+vars.files+'/'+data.directory+'/'+data.file, 'utf8', function (err, read) {
					if (err) { sock.emit('response', 'Unable to read file. Error '+err.code); }
					vars.body = read;
					sock.emit('open', {body: read, file: data.file, directory: data.directory });
					winston.log('read', vars.file);
				});
			break;
			case 'ls':
			case 'dir':
			case 'directory':
			case 'folders':
			case 'folder':
				var path = './'+vars.files+'/'+vars.directory;
				fs.readdir(path, function (err, folders) {
					async.each(folders, function (folder) {
						vars.folders.push({ name: folder });
						sock.emit('responce', { responce: vars.folders });
					});
				});
			break;
			default:
				console.log('Unknown command: '+cmd);
				sock.emit('response', { command: 'unknown' });
			break;
		}

	});

	sock.on('change', function(data) {
		console.log('data: ' + data.body);
		console.log('body: ' + vars.body);
		sock.emit('insert', { body: data.body, position: data.cursor });
	});

	sock.on('save', function(data) {

	});

	sock.on('disconnect', function () {

	});
});

app.listen(vars.port);
winston.log('info', 'App started ' + now );
winston.log('info', 'Listening on port ' + vars.port );
