'use strict'

const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const path = require('path')

const fs = require('fs');

const ipc = electron.ipcMain;

var request = require('request');

var request = request.defaults({jar: true})

var select = require('soupselect').select;
var htmlparser = require("htmlparser");

var WebTorrent = require('webtorrent')

var client = new WebTorrent()

var FileCookieStore = require('tough-cookie-filestore');
var j = request.jar(new FileCookieStore(__dirname+'/assets/cookies.json'));

var downloadEvent;

var Transcoder = require('stream-transcoder');

let loginUltrastar=function(){
	request.post({url:"http://ultrastar-es.org/foro/ucp.php?mode=login", jar: j, form: {username:'openstar', password:'openstarAPI', login:''}}, function (error, response, body) {
        if (!error && response.statusCode == 200) {
	       }else{
		       console.log(error);
		       console.log(response.statusCode);
	       }
	 })
}
	 
loginUltrastar();

ipc.on('search', function(event, arg) {
  getSongs(arg, event);
})

ipc.on('download', function(event, arg) {
	downloadEvent=event;
   downloadTorrentFile(arg["download"]);
})

var transcodeFinished=function(name){
		
   downloadEvent.sender.send("downloadFinished", name);
	
	
}
var transcode=function(name, path){
	new Transcoder(path)
	    .maxSize(320, 240)
	    .videoCodec('h264')
	    .videoBitrate(800 * 1000)
	    .fps(25)
	    .audioCodec('libfaac')
	    .sampleRate(44100)
	    .channels(2)
	    .audioBitrate(128 * 1000)
	    .format('mp4')
		.on('progress', function(progress) {
		   downloadEvent.sender.send("downloadProgress", 0.9+(0.10*progress.progress));
		})
	    .on('finish', function() {
	    	transcodeFinished(name);
	    }).on('errror', function(e) {
	    	console.log(e);
	    }).writeToFile(path+".mp4");
}

var downloadTorrentFinished=function(buff){
	client.add(buff, {path: __dirname+"/songs/", }, function (torrent) {
	  // Got torrent metadata!
	  console.log('Client is downloading:', torrent.infoHash)
	  torrent.on('download', function(chunkSize){
	  	  downloadEvent.sender.send("downloadProgress", 0.90*torrent.progress);
	})
	torrent.on('done', function(){
	  console.log('torrent finished downloading');
	  var trans=false;
	  var f = undefined;
	  torrent.files.forEach(function(file){
	     if(file.name.indexOf(".avi")!=-1){
		     console.log(__dirname+"/songs/"+file.path);
		     //Transcoding needed
		     trans=true;
		     transcode(file.name.replace(".avi", ""), __dirname+"/songs/"+file.path);	

	     }
	  })
	  	 if(trans==false){
		  	 	var name = torrent.files[0].name.slice(0, -4);
		  	 	console.log(name);
		  	    downloadEvent.sender.send("downloadFinished", name);
	  	 }
	  	 console.log(trans);
	})

	  torrent.files.forEach(function (file) {
	    // Display the file by appending it to the DOM. Supports video, audio, images, and
	    // more. Specify a container element (CSS selector or reference to DOM node).
	  })
	})


}

var downloadTorrentFile=function(link){
	var binaryRequest = request.defaults({
		 encoding: null
	})

	binaryRequest({url:link, jar: j}, function (error, response, fileContent) {
        if (!error && response.statusCode == 200) {
			downloadTorrentFinished(fileContent);
	       }else{
		       console.log(error);
		       console.log(response.statusCode);
		       console.log(link);
	       }
	 })
}

let songsCallback=function(c, e){
	e.sender.send("results", c);
}


let getSongs=function(query, event){
	request({url:'http://ultrastar-es.org/es/canciones?busqueda='+query,  jar: j}, function (error, response, body) {
	  if (!error && response.statusCode == 200) {
	     var handler = new htmlparser.DefaultHandler(function(err, dom) {
	         var canciones = select(dom, 'ul.canciones')[0];
	         var final = [];
	         for(var c in canciones.children){
		         var song = canciones.children[c];
		         var image;
		         var author;
		         var title;
		         var download;
		         var img = select(song, 'img')[0];
		         var a = select(song, 'a');
		         if(img!=undefined){
			         image = img.attribs.src;
			         author = a[3].children[0].raw
			         title = a[4].children[0].raw
			         for(var x=0;x<a.length;x++){
				         if( a[x].attribs!=undefined && a[x].attribs.href.indexOf("torrent")!=-1){
					         download = a[x].attribs.href;
				         }
			         }
			         console.log(download);
					 final.push({"title":title, "artist":author, "remote":true, "image":image, "download":"http://ultrastar-es.org"+download});
		         }
	         }
	        songsCallback(final, event);

	          
	  	});
	  	 var parser = new htmlparser.Parser(handler);
	     parser.parseComplete(body);
	  }
	})
}


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

let getSavedSongs= () => {
	var dir = __dirname+"/songs";
	if (!fs.existsSync(dir)){
    	fs.mkdirSync(dir);

	}
  return fs.readdirSync(__dirname+"/songs").filter(function(file) {
    return fs.statSync(path.join(__dirname+"/songs", file)).isDirectory();
  });
}
ipc.on('getSavedSongs', function(event, arg) {
	event.sender.send('savedSongs', getSavedSongs());
});


let createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 1000, height: 550})

  // and load the index.html of the app.
  mainWindow.loadURL(path.join('file://', __dirname, '/index.html'))

  // Open the DevTools.
 // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

