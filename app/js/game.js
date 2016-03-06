(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var Game = {
	seconds: 0,
	debug: true,
	videoElement: undefined,
	audioElement: undefined,
	lyricsPath: "songs",
	lyrics: undefined,
	beat: undefined,
	delta: 0,
	refreshRate: 50,
	lyricsIndex: 0,
	currentLyrics: undefined,
	currentLyricIndex: undefined,
	currentSingingLyric: undefined,
	currentTotalDuration: undefined,
	currentTotalBubbles: undefined,
	shouldMovePosition: false,
	blocked: false,
	animating: true,
	score: 0,
	title: undefined,
	printDebug: function printDebug() {
		$("#debug_seconds").html(this.seconds);
		$("#debug_beat").html(this.beat);
		$("#debug_lyric").html(this.currentLyricIndex);
		$("#debug_pitch").html(window.Pitch.p1);
		$("#debug_points").html(this.score);
	},
	printPitch: function printPitch() {
		if (this.animating) {
			/* top_ = (noteStrings.indexOf(noteElem)%4)*50;
    left_ = $("#position").css("left");
    console.log(left_);
    $("#voices").append("<div class='voice' style='margin-left:"+left_+"px;margin-top:"+top_+"px;'></div>");
    */
			var neededNote = window.Pitch.noteStrings.indexOf(window.Pitch.noteStrings[this.currentSingingLyric["pitch"] % 12]);
			var sungNote = window.Pitch.noteStrings.indexOf(window.Pitch.noteElem);
			if (neededNote == sungNote) {
				var width = 0;
				if (this.currentSingingLyric["duration"] < this.delta) {
					width = 100;
				} else {
					//width = this.currentSingingLyric["duration"]/this.delta;
					width = 100;
				}
				if ($("#inner" + this.currentSingingLyric["id"]).length == 0) {
					$("#bubble" + this.currentSingingLyric["id"]).append("<div class='bubble inner' id='inner" + this.currentSingingLyric["id"] + "' style='width:5%'></div>");
				}
				$("#inner" + this.currentSingingLyric["id"]).animate({
					width: width + "%"
				}, 50, "linear", function () {});
				this.score += 100 / this.lyrics["lyrics"].length;
				$("#score").html(parseInt(this.score) * 10);
			}
		}
	},
	lyricsUntilBreak: function lyricsUntilBreak() {
		var lyrics = [];
		var lBreak = false;
		for (var i = this.currentLyricIndex; i < this.lyrics["lyrics"].length && lBreak == false; i++) {
			lyrics.push(this.lyrics["lyrics"][i]);
			if (lyrics.length != 1 && this.lyrics["lyrics"][i]["type"] == "break") {
				lBreak = true;
			}
		}
		return lyrics;
	},
	animatePosition: function animatePosition() {
		$("#position").css("left", "0px");
		this.shouldMovePosition = false;
		if (this.currentTotalDuration != undefined && this.currentTotalDuration > 0) {
			var totalSeconds = this.delta * this.currentTotalDuration;
			this.animating = true;
			$("#position").animate({
				left: "100%"
			}, totalSeconds * 5, "linear", function () {});
		}
	},
	printLyrics: function printLyrics() {
		$("#lyrics").html("");
		var number = 0;
		var n = 0;
		for (var l in this.currentLyrics) {
			var lyric = this.currentLyrics[l];
			if (lyric["type"] == "break") {
				if (l != 0) {
					number = n;
					$("#lyrics").append("<br>");
				}
			} else {
				if (number == 0) {
					n++;
				}
				$("#lyrics").append("<span id='lyric" + lyric["id"] + "'>" + lyric["text"] + "</span>");
			}
		}
		this.currentTotalBubbles = number;
	},
	printBubbles: function printBubbles() {

		$("#pitches").html("");
		$("#voices").html("");
		//Balls setup:
		var width = $("#pitches").width();
		var max = 0;
		var total = 0;
		var end = 0;
		for (var u = 0; u < this.currentTotalBubbles; u++) {
			var lyric = this.currentLyrics[u];
			if (lyric["type"] != "break") {
				var duration = lyric["duration"];
				total += duration;
				if (duration > max) {
					max = duration;
				}
			}
		}
		end = this.currentLyrics[u]["beat"];
		this.currentTotalDuration = total;
		for (var u = 0; u < this.currentTotalBubbles; u++) {
			var lyric = this.currentLyrics[u];
			var duration = lyric["duration"];
			var division = 100 * duration / total;
			var note = Pitch.noteStrings[lyric["pitch"] % 12];
			var top_ = Pitch.noteStrings.indexOf(note) * 20;

			$("#pitches").append("<div class='bubble' id='bubble" + lyric["id"] + "' style='margin-top:" + top_ + "px;width:" + division + "%;'></div>");
		}
		this.shouldMovePosition = true;
	},
	setLyrics: function setLyrics() {
		if (this.currentLyrics == undefined) {
			this.currentLyricIndex = 0;this.currentLyrics = this.lyricsUntilBreak();this.printLyrics();this.printBubbles();
		}

		var currentLyric = this.lyrics["lyrics"][this.currentLyricIndex];
		//	  if($("#lyric"+currentLyric["id"]).length==0){ this.currentLyrics = this.lyricsUntilBreak(); this.printLyrics(); }

		if (this.beat >= currentLyric["beat"] || this.currentSingingLyric == undefined) {
			if (this.currentSingingLyric != currentLyric) {
				this.currentSingingLyric = currentLyric;
				if (this.shouldMovePosition && this.currentLyrics[0]["id"] == currentLyric["id"]) {
					this.animatePosition();
				}
				$("#lyric" + currentLyric["id"]).toggleClass("singing");
			}
			if (this.beat > currentLyric["beat"] + currentLyric["duration"] || currentLyric["type"] == "break") {

				$("#lyric" + currentLyric["id"]).toggleClass("singing");
				//Next lyric
				//  if(currentLyric["id"]==this.currentLyrics[this.currentLyrics.length-1]["id"]){}else{
				this.currentLyricIndex++;
				//  }

				if (this.currentLyrics.length > 0 && this.lyrics["lyrics"][this.currentLyricIndex]["id"] > this.currentLyrics[this.currentLyrics.length - 1]["id"]) {
					this.currentLyrics = this.lyricsUntilBreak();
					this.printLyrics();
					this.printBubbles();
				}
			}
		}
	},
	progress: function progress() {
		this.seconds = this.videoElement.currentTime;
		if (this.lyrics["videogap"] == undefined) {
			this.lyrics["videogap"] = 0;
		}
		if (this.lyrics != undefined && this.seconds - this.lyrics["videogap"] >= this.lyrics["gap"] / 1000) {
			this.beat = this.delta * (this.seconds - this.lyrics["videogap"] - this.lyrics["gap"] / 1000);
			this.setLyrics();
			this.printPitch();
		}
		var _this = this;
		this.videoElement.addEventListener('loadeddata', function () {
			if (_this.videoElement.paused && _this.lyrics != undefined) {
				_this.videoElement.play();
				_this.delta = _this.lyrics["bpm"] * 4 / 60;
			}
		}, false);

		if (!this.videoElement.paused && this.audioElement.paused && this.seconds >= this.lyrics["videogap"]) {
			this.audioElement.play();
		}
		this.printDebug();
	},
	setup: function setup() {
		if (this.debug) {
			this.printDebug();
		}
		//window.Pitch.enumerateDevices();
		this.videoElement = $('#video').get(0);
		this.audioElement = $('#audio').get(0);
		$(document).keydown(function (e) {
			if (e.which == 27) {

				document.location.href = 'index.html';
			}
		});
		this.postSetup();
	},
	postSetup: function postSetup() {
		var vid = this.lyrics["video"].replace(".avi", ".avi.mp4");
		this.videoElement.src = this.lyricsPath + "/" + this.lyrics["name"] + "/" + vid;
		this.audioElement.src = this.lyricsPath + "/" + this.lyrics["name"] + "/" + this.lyrics["mp3"];
		setInterval(function () {
			Game.progress();
		}, this.refreshRate);
	},
	loadLyrics: function loadLyrics() {
		$.get(this.lyricsPath + "/" + this.title + "/" + this.title + ".txt", function (data) {
			Game.lyrics = Lyrics.parseLyric(data);
			Game.postSetup();
		});
	}

};
window.Game = Game;

},{}]},{},[1]);
