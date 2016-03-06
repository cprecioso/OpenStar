module.exports = React.createClass({
	componentDidMount () {
		window.Pitch.init();
		window.Pitch.toggleLiveInput();
		window.Game.lyrics = this.props.song;
		window.Game.setup();
	},
	
	
	render () {
	    return (
		    <div id="game-container">
			<div className="topbar-wrapper">
				<div id="topbar">
					<div id="score"></div>
					<div id="mic_selector">
						<select id="audioinput" onchange="toggleLiveInput();toggleLiveInput();">
							<option>default (selection not supported)</option>
						</select>
					</div>
				</div>
				
				<div id="bubbles">
					<div id="voices"></div>
					<div id="pitches"></div>
					<div id="position"></div>
				</div>
				
				<div id="lyrics"></div>
			</div>
			<video id="video" muted>
				<source type="video/mp4"/>
			</video>
			<audio id="audio">
				<source type="audio/mp3"/>
			</audio>
			
			
		</div>
		 )	
	
	}
})