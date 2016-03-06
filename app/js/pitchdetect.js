/*
The MIT License (MIT)

Copyright (c) 2014 Chris Wilson

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

var Pitch = {
	p1:null,
	p2:null,

	note:null,
	audioContext:null,
	isPlaying:false,
	sourceNode:null,
	analyser:null,
	analyser2:null,
	
	theBuffer:null,
	DEBUGCANVAS:null,
	mediaStreamSource:null,
	detectorElem:null, 
	canvasElem:null,
	waveCanvas:null,
	pitchElem:null,
	noteElem:null,
	detuneElem:null,
	detuneAmount:null,
	
	init:function() {
		this.audioContext = new  window.AudioContext();
		var MAX_SIZE = Math.max(4,Math.floor(this.audioContext.sampleRate/5000));	// corresponds to a 5kHz signal
	
	
	},
	
	error:function() {
	    alert('Stream generation failed.');
	},
	
	getUserMedia:function(dictionary, callback) {
	    try {
	        navigator.getUserMedia = 
	        	navigator.getUserMedia ||
	        	navigator.webkitGetUserMedia ||
	        	navigator.mozGetUserMedia;
	        navigator.getUserMedia(dictionary, callback, this.error);
	    } catch (e) {
	        alert('getUserMedia threw exception :' + e);
	    }
	},
	gotDevices:function(deviceInfos) {
	  // Handles being called several times to update labels. Preserve values.
	
	  for (var i = 0; i !== deviceInfos.length; ++i) {
	    var deviceInfo = deviceInfos[i];
	    if (deviceInfo.kind === 'audioinput') {
	      	var text = deviceInfo.label ||  'microphone ' + i;
	       $("#audioinput").append($("<option>", { value: deviceInfo.deviceId }).text(text));
	
	    } 
	  }
	},
	errorCallback:function(err){
		console.log(err);
	},
	enumerateDevices:function(stream) {
		
	navigator.mediaDevices.enumerateDevices()
	.then(this.gotDevices)
	.catch(this.errorCallback);
	
	},
	   
	gotStream:function(stream) {
		var t = Pitch;
	    // Create an AudioNode from the stream.
	    t.mediaStreamSource = t.audioContext.createMediaStreamSource(stream);
	
	    // Connect it to the destination.
	    t.analyser = t.audioContext.createAnalyser();
	   // analyser2.smoothingTimeConstant = 0.0;
	    t.analyser.fftSize = 1024;
	
	    t.analyser2 = t.audioContext.createAnalyser();
	  //  analyser2.smoothingTimeConstant = 0.3;
	    t.analyser2.fftSize = 1024;
	
	    var splitter = t.audioContext.createChannelSplitter(2);
	    
	    t.mediaStreamSource.connect( splitter );
	    
	   
	    //To hear microphones:
	    t.mediaStreamSource.connect(t.audioContext.destination);
	    
		splitter.connect(t.analyser,0,0);
		splitter.connect(t.analyser2,1,0);
	    
	   // mediaStreamSource.connect(audioContext.destination);
	   // analyser.connect(javascriptNode);
	    
	   // splitter.connect(audioContext.destination, 0);
	    t.getPitches();
	},
		
	toggleLiveInput:function() {
	    if (this.isPlaying) {
	        //stop playing and return
	        this.sourceNode.stop( 0 );
	        this.sourceNode = null;
	        this.analyser = null;
	        this.isPlaying = false;
			if (!window.cancelAnimationFrame)
				window.cancelAnimationFrame = window.webkitCancelAnimationFrame;
	        window.cancelAnimationFrame( rafID );
	    }
	    //var au = document.getElementById('audioinput');
	    //var did = au.options[au.selectedIndex].value;
	    var did='';
	    this.getUserMedia(
	    	{
	            "audio": {
	                "mandatory": {
		                "echoCancellation":"false",
	                    "googEchoCancellation": "false",
	                    "googAutoGainControl": "false",
	                    "googNoiseSuppression": "false",
	                    "googHighpassFilter": "false"
	                },
	                "optional": [{ "sourceId": did }]
	            },
	        }, this.gotStream);
	},
	
	rafID:null,
	tracks:null,
	buflen:1024,
	buf:new Float32Array( 1024 ),
	buf2:new Float32Array( 2014 ),
	
	noteStrings: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
	
	noteFromPitch:function( frequency ) {
		var noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
		return Math.round( noteNum ) + 69;
	},
	
	frequencyFromNoteNumber:function( note ) {
		return 440 * Math.pow(2,(note-69)/12);
	},
	
	centsOffFromPitch:function( frequency, note ) {
		return Math.floor( 1200 * Math.log( frequency / frequencyFromNoteNumber( note ))/Math.log(2) );
	},
		
	MIN_SAMPLES:0,  // will be initialized when AudioContext is created.
	
	autoCorrelate:function( buf, sampleRate ) {
		var SIZE = buf.length;
		var MAX_SAMPLES = Math.floor(SIZE/2);
		var best_offset = -1;
		var best_correlation = 0;
		var rms = 0;
		var foundGoodCorrelation = false;
		var correlations = new Array(MAX_SAMPLES);
		var MIN_SAMPLES = this.MIN_SAMPLES;
		for (var i=0;i<SIZE;i++) {
			var val = buf[i];
			rms += val*val;
		}
		rms = Math.sqrt(rms/SIZE);
		if (rms<0.01) // not enough signal
			return -1;
	
		var lastCorrelation=1;
		for (var offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
			var correlation = 0;
	
			for (var i=0; i<MAX_SAMPLES; i++) {
				correlation += Math.abs((buf[i])-(buf[i+offset]));
			}
			correlation = 1 - (correlation/MAX_SAMPLES);
			correlations[offset] = correlation; // store it, for the tweaking we need to do below.
			if ((correlation>0.9) && (correlation > lastCorrelation)) {
				foundGoodCorrelation = true;
				if (correlation > best_correlation) {
					best_correlation = correlation;
					best_offset = offset;
				}
			} else if (foundGoodCorrelation) {
				// short-circuit - we found a good correlation, then a bad one, so we'd just be seeing copies from here.
				// Now we need to tweak the offset - by interpolating between the values to the left and right of the
				// best offset, and shifting it a bit.  This is complex, and HACKY in this code (happy to take PRs!) -
				// we need to do a curve fit on correlations[] around best_offset in order to better determine precise
				// (anti-aliased) offset.
	
				// we know best_offset >=1, 
				// since foundGoodCorrelation cannot go to true until the second pass (offset=1), and 
				// we can't drop into this clause until the following pass (else if).
				var shift = (correlations[best_offset+1] - correlations[best_offset-1])/correlations[best_offset];  
				return sampleRate/(best_offset+(8*shift));
			}
			lastCorrelation = correlation;
		}
		if (best_correlation > 0.01) {
			// console.log("f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")")
			return sampleRate/best_offset;
		}
		return -1;
	//	var best_frequency = sampleRate/best_offset;
	},
	getPitches:function(time){
		
		Pitch.updatePitch( time);
		//updatePitch( time, 2 );
	
	},
	
	updatePitch:function( time ) {
		var cycles = new Array;
	
		this.analyser.getFloatTimeDomainData( this.buf );
		this.analyser2.getFloatTimeDomainData( this.buf2 );
	
		var ac = this.autoCorrelate( this.buf, this.audioContext.sampleRate );
		var ac2 = this.autoCorrelate( this.buf2, this.audioContext.sampleRate );
	
		// TODO: Paint confidence meter on canvasElem here.
	
	
	 	if (ac == -1) {	} else {
		 	var pitch = ac;	 	
		 	var note =  this.noteFromPitch( pitch );
	
			this.noteElem = this.noteStrings[note%12];
			this.p1 = this.noteElem;
		//	document.getElementById('p1').innerHTML=noteElem;
			}
	
	 	if (ac2 == -1) {	} else {
		 	var pitch2 = ac2;	 	
		 	var note2 =  this.noteFromPitch( pitch2 );
	
			this.noteElem2 = this.noteStrings[note2%12];
			this.p2 = this.noteElem2;
	
		//	document.getElementById('p2').innerHTML=noteElem2;
		}
		/*	
			var detune = centsOffFromPitch( pitch, note );
			if (detune == 0 ) {
				//detuneElem.className = "";
				//detuneAmount.innerHTML = "--";
			} else {
				if (detune > 0){
				
				//	detuneElem.className = "sharp";
				//console.log( Math.abs( detune ));
				}
			}
			*/
		
	
		if (!window.requestAnimationFrame)
			window.requestAnimationFrame = window.webkitRequestAnimationFrame;
		this.rafID = window.requestAnimationFrame( this.getPitches );
	}
}
window.Pitch = Pitch;

