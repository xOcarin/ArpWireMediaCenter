import { useState, useRef, useEffect } from "react";
import "./App.css";
//const { ipcRenderer } = window.require("electron");
//onClick={() => ipcRenderer.send("minimize-window")
//onClick={() => ipcRenderer.send("close-window")
import AudioVisualizer from './AudioVisualizer'; 
import { Howl } from 'howler'; // Import Howler


function App() {
  // State declarations
  const [files, setFiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0); // Volume state (range 0-1)
  const [pressedButton, setPressedButton] = useState(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [tempFileName, setTempFileName] = useState(null); // New state for temporary file name
  const [showVisualizer, setShowVisualizer] = useState(false); // New state for visualizer
  const [sound, setSound] = useState(null); // New state for Howler sound
  const [playbackRate, setPlaybackRate] = useState(1); // New state for playback rate
  const mediaRef = useRef(null);
  const progressRef = useRef(null); // Reference to the progress bar
  const fileNameRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [tempFileNameTimeout, setTempFileNameTimeout] = useState(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false); // New state for video modal visibility
  const videoRef = useRef(null); // Reference for the video element


  const [displayText, setDisplayText] = useState("Default Text");
  const [isChangingText, setIsChangingText] = useState(false);

 

  


  


  // Load media files
  useEffect(() => {
    const importMediaFiles = async () => {
      const context = require.context("./media", false, /\.(mp3|wav|mp4)$/);
      const mediaFiles = context.keys().map((file) => ({
        name: file.replace("./", ""),
        src: context(file),
        type: file.endsWith(".mp4") ? "video/mp4" : "audio/mpeg",
      }));
      setFiles(mediaFiles);
    };
    importMediaFiles();
  }, []);

  // Define currentFile after files are set
  const currentFile = files[currentIndex]; // Ensure this is defined after files are populated

  // Toggle play/pause
  const togglePlayPause = () => {
    if (currentFile && sound) {
      if (isPlaying) {
        sound.pause(); // Pause the current track
        if (videoRef.current) {
          videoRef.current.pause(); // Pause the video as well
        }
      } else {
        sound.play(); // Play the current track
        if (videoRef.current) {
          videoRef.current.play(); // Play the video as well
        }
      }
      setIsPlaying(!isPlaying); // Toggle the playing state
    }
  };

  // Update progress
  const updateProgress = () => {
    if (sound) {
        const progressValue = (sound.seek() / sound.duration()) * 100; // Get current time and duration from Howler
        setProgress(progressValue); // Update progress state
    }
  };

  // Next track
  const nextTrack = () => {
    if (sound) {
      sound.stop(); // Stop the current track
    }
    setCurrentIndex((prevIndex) => (prevIndex + 1) % files.length);
    setIsPlaying(false); // Ensure isPlaying is set to false when skipping
    setProgress(0);
    
    // Play the next track directly
    const newSound = new Howl({
      src: [files[(currentIndex + 1) % files.length].src],
      volume: volume,
      rate: playbackRate,
      onplay: () => setIsPlaying(true),
      onpause: () => setIsPlaying(false),
      onend: nextTrack, // Automatically go to the next track when the current one ends
    });
    setSound(newSound);
    newSound.play(); // Start playing the next track
  }; 

  // Previous track
  const prevTrack = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + files.length) % files.length);
    setIsPlaying(false);
    setProgress(0);
  };

  // Handle volume change
  const handleVolumeChange = (e) => {
    const volumeValue = e.target.value;
    setVolume(volumeValue);
    if (mediaRef.current) {
      mediaRef.current.volume = volumeValue; // Update the volume on the media element
    }
  };

  // Handle progress mouse events
  const handleProgressMouseDown = (e) => {
    e.preventDefault(); // Prevent default behavior
    setIsDragging(true);
    updateProgressBar(e); // Update immediately on mouse down
  };

  const handleProgressMouseMove = (e) => {
    if (isDragging) {
      e.preventDefault(); // Prevent default behavior
      updateProgressBar(e); // Update while dragging
    }
  };

  const handleProgressMouseUp = () => {
    setIsDragging(false); // Stop dragging
  };

  // Update progress bar
  const updateProgressBar = (e) => {
    if (!sound) return; // Ensure sound is available
    const progressBar = progressRef.current;
    const rect = progressBar.getBoundingClientRect();
    const offsetX = e.clientX - rect.left; // Calculate mouse position relative to the progress bar
    const newProgress = Math.min(Math.max(0, offsetX / rect.width), 1); // Clamp value between 0 and 1
    
    setProgress(newProgress * 100); // Update progress state
    sound.seek(newProgress * sound.duration()); // Set Howler sound current time
  };

  // Event listeners for dragging behavior
  useEffect(() => {
    window.addEventListener("mouseup", handleProgressMouseUp);
    window.addEventListener("mousemove", handleProgressMouseMove);
    return () => {
        window.removeEventListener("mouseup", handleProgressMouseUp);
        window.removeEventListener("mousemove", handleProgressMouseMove);
    };
  }, [isDragging]);

  // Update progress on time update
  useEffect(() => {
    const interval = setInterval(updateProgress, 1000); // Update progress every second
    return () => clearInterval(interval); // Cleanup interval on unmount
  }, [sound]); // Run this effect when the sound changes

  // Ensure the volume is set every time the current track changes
  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.volume = volume;
    }
  }, [currentIndex, volume]); // Reapply volume when the song or volume changes

  // Auto play the new track when it changes
  useEffect(() => {
    if (currentFile) {
      // Stop the previous sound if it exists
      if (sound) {
        sound.stop();
      }
      
      // Define elements to toggle based on media type
      const audioOnlyElements = ['aud', 'screen', 'filenameText']; // Add other audio-specific element IDs here
      const videoOnlyElements = []; // Add video-specific element IDs here if needed later

      // Use Howler for audio playback for all types
      const newSound = new Howl({
        src: [currentFile.src],
        volume: volume,
        rate: playbackRate,
        onplay: () => {
          setIsPlaying(true);
          if (currentFile.type.startsWith("video")) {
            if (videoRef.current) {
              videoRef.current.play(); // Play the video when the audio starts
            }
          }
        },
        onpause: () => {
          setIsPlaying(false);
          if (videoRef.current) {
            videoRef.current.pause(); // Pause the video when the audio is paused
          }
        },
        onend: nextTrack, // Automatically go to the next track when the current one ends
      });
      setSound(newSound);
      newSound.play(); // Start playing the new track
      
      // Toggle element visibility based on file type
      if (currentFile.type.startsWith("video")) {
        audioOnlyElements.forEach(id => toggleElementVisibilityById(id, false)); // Hide audio-only elements
        videoOnlyElements.forEach(id => toggleElementVisibilityById(id, true)); // Show video-only elements
      } else {
        audioOnlyElements.forEach(id => toggleElementVisibilityById(id, true)); // Show audio-only elements
        videoOnlyElements.forEach(id => toggleElementVisibilityById(id, false)); // Hide video-only elements
      }
    }
    // Cleanup function to stop the sound when the component unmounts or track changes
    return () => {
      if (sound) {
        sound.stop();
      }
    };
  }, [currentFile]); // This will run when tshe track changes

  // Event listeners for video playback
  useEffect(() => {
    // Use videoRef for video element listeners
    const videoElement = videoRef.current;

    if (videoElement) {
      const updateProgress = () => {
        // Ensure sound is available and is playing or was playing just before pause
        if (sound) {
          const progressValue = (sound.seek() / sound.duration()) * 100; // Get current time and duration from Howler
          setProgress(progressValue); // Update progress state
        } else {
           // Fallback for video if Howler isn't ready, though ideally Howler handles progress
          const progressValue = (videoElement.currentTime / videoElement.duration) * 100;
          setProgress(progressValue);
        }
      };

      videoElement.addEventListener("play", () => {
        setIsPlaying(true);
        // Ensure Howler sound plays in sync with video if it exists
        if (sound && sound.state() === 'paused') {
           sound.play();
        }
      });
      videoElement.addEventListener("pause", () => {
        setIsPlaying(false);
        // Ensure Howler sound pauses in sync with video if it exists
         if (sound && sound.state() === 'playing') {
           sound.pause();
         }
      });
      videoElement.addEventListener("timeupdate", updateProgress);
      videoElement.addEventListener("ended", nextTrack); // Add listener for video end

      return () => {
        // Check if videoElement exists before removing listeners
        if (videoElement) {
          videoElement.removeEventListener("play", () => setIsPlaying(true));
          videoElement.removeEventListener("pause", () => setIsPlaying(false));
          videoElement.removeEventListener("timeupdate", updateProgress);
          videoElement.removeEventListener("ended", nextTrack);
        }
      };
    }
  }, [videoRef, sound, nextTrack]); // Re-run when videoRef, sound, or nextTrack changes, dependency on sound is important for sync

  // Handle button clicks
  const handleButtonClick = (buttonId) => {
    setPressedButton((prevButton) => (prevButton === buttonId ? null : buttonId));
    if (buttonId === 'aud') {
      setShowVisualizer((prev) => !prev); // Toggle visualizer
    }
    if (buttonId === 'button1') {
      const newRate = playbackRate === 0.8 ? 1 : 0.8; // Toggle between normal and slowed down
      setPlaybackRate(newRate); // Set the global playback rate for audio
      if (sound) {
        sound.rate(newRate); // Set the playback rate for audio
      }
      if (videoRef.current) {
        videoRef.current.playbackRate = newRate; // Set the playback rate for video
      }
    }
    if (buttonId === 'button2') {
      const newRate = playbackRate === 1.2 ? 1 : 1.2; // Toggle between normal and sped up
      setPlaybackRate(newRate); // Set the global playback rate for audio
      if (sound) {
        sound.rate(newRate); // Set the playback rate for audio
      }
      if (videoRef.current) {
        videoRef.current.playbackRate = newRate; // Set the playback rate for video
      }
    }
    if (buttonId === 'button3') {
      // Jump backward by 5 seconds
      if (sound) {
        sound.seek(Math.max(0, sound.seek() - 5)); // Seek back for audio
      } else if (videoRef.current) {
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5); // Seek back for video
      }
    }
    if (buttonId === 'button4') {
      // Jump forward by 5 seconds
      if (sound) {
        sound.seek(Math.min(sound.duration(), sound.seek() + 5)); // Seek forward for audio
      } else if (videoRef.current && videoRef.current.duration) {
        videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 5); // Seek forward for video
      }
    }
    if (buttonId === 'button5') {
      // Reset playback speed to 1x
      setPlaybackRate(1); // Set global playback rate state
      if (sound) {
        sound.rate(1); // Set playback rate for audio
      }
      if (videoRef.current) {
        videoRef.current.playbackRate = 1; // Set playback rate for video
      }
    }
    if (buttonId === 'button6') {
      // Set playback speed to 1.5x
      const newRate = 1.5; // Define the new rate
      setPlaybackRate(newRate); // Set global playback rate state
      if (sound) {
        sound.rate(newRate); // Set playback rate for audio
      }
      if (videoRef.current) {
        videoRef.current.playbackRate = newRate; // Set playback rate for video
      }
    }
    if (buttonId === 'button7') {
      console.log("Button 7 clicked"); // Placeholder effect
    }
    if (buttonId === 'button8') {
      console.log("Button 8 clicked"); // Placeholder effect
    }
    if (buttonId === 'button9') {
      console.log("Button 9 clicked"); // Placeholder effect
    }
    if (buttonId === 'button10') {
      console.log("Button 10 clicked"); // Placeholder effect
    }
  };

  // Check for overflow in file name
  useEffect(() => {
    const checkOverflow = () => {
      if (fileNameRef.current) {
        const isOverflowing = fileNameRef.current.scrollWidth > fileNameRef.current.clientWidth;
        setShouldScroll(isOverflowing);
      }
    };
  
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
  
    return () => {
      window.removeEventListener('resize', checkOverflow);
    };
  }, [files, currentIndex, tempFileName]); // Include tempFileName as a dependency
  

  // Handle clock click
  const handleClockClick = () => {
    const currentTime = new Date().toLocaleTimeString();
    setTempFileName(currentTime); // Temporarily set the file name
    setShouldScroll(false); // Disable scrolling
  
    if (tempFileNameTimeout) clearTimeout(tempFileNameTimeout); // Clear any existing timeout
  
    const timeout = setTimeout(() => {
      setTempFileName(null); // Revert back to original file name after 3 seconds
      setShouldScroll(true); // Re-enable scrolling after reverting
    }, 3000);
  
    setTempFileNameTimeout(timeout); // Store the timeout ID to clear it later
  };
  

  const temporarilyChangeText = (newText) => {
    if (tempFileNameTimeout) clearTimeout(tempFileNameTimeout);
  
    setTempFileName(newText); // Temporarily set new text
    setShouldScroll(false); // Disable scrolling while showing new text
  
    const timeout = setTimeout(() => {
      setTempFileName(null); // Revert text after 3 seconds
      setShouldScroll(true); // Re-enable scrolling
    }, 3000);
  
    setTempFileNameTimeout(timeout); // Store timeout ID for cleanup
  };
  

  // Helper function to toggle element visibility by ID
  const toggleElementVisibilityById = (id, isVisible) => {
    const element = document.getElementById(id);
    if (element) {
      element.style.display = isVisible ? '' : 'none'; // Use '' to revert to default display or 'block'
    }
  };

  if (files.length === 0) return <div className="app">Loading media files...</div>;

  return (
    <div className="app">
      <div className="title-bar">
        <div className="drag-region"></div>
        <button className="window-btn">—</button>
        <button className="window-btn close">✕</button>
      </div>
      <div className="player-container">
        <img id={'background'} src="/media player components/background.png" alt="Next" style={{ position: 'absolute' }} />
        <img id={'screen'} src="/media player components/screen.png" alt="Next" style={{ position: 'absolute'}} />
        
        {/* Navigation buttons */}
        <img id="button1" className={`navbuttons ${pressedButton === 'button1' ? 'active' : ''}`} src="/media player components/1-2.png" alt="Button Image" onClick={() => { handleButtonClick('button1'); temporarilyChangeText('Slow Mo!'); }} />
        <img id="button2" className={`navbuttons ${pressedButton === 'button2' ? 'active' : ''}`} src="/media player components/2-2.png" alt="Button Image" onClick={() => { handleButtonClick('button2'); temporarilyChangeText('Speed Up!'); }} />
        <img id="button3" className={`navbuttons ${pressedButton === 'button3' ? 'active' : ''}`} src="/media player components/3-2.png" alt="Button Image" onClick={() => { handleButtonClick('button3'); temporarilyChangeText('Rewind!'); }} />
        <img id="button4" className={`navbuttons ${pressedButton === 'button4' ? 'active' : ''}`} src="/media player components/4-2.png" alt="Button Image" onClick={() => { handleButtonClick('button4'); temporarilyChangeText('Fast Forward!'); }} />
        <img id="button5" className={`navbuttons ${pressedButton === 'button5' ? 'active' : ''}`} src="/media player components/5-2.png" alt="Button Image" onClick={() => { handleButtonClick('button5'); temporarilyChangeText('Normal Speed!'); }} />
        <img id="button6" className={`navbuttons ${pressedButton === 'button6' ? 'active' : ''}`} src="/media player components/6-2.png" alt="Button Image" onClick={() => { handleButtonClick('button6'); temporarilyChangeText('Double Time!'); }} />

        
        <img id="aud" className="navbuttons" src="/media player components/aud-2.png" alt="Button Image" onClick={() => handleButtonClick('aud')} />
        <img id="dsc" className="navbuttons" src="/media player components/dsc-2.png" alt="Button Image" onClick={() => handleButtonClick('dsc')} />
        <img id="clock" className="navbuttons" src="/media player components/clock-2.png" alt="Button Image" onClick={handleClockClick} />
        <img id="ba" className="navbuttons" src="/media player components/ba-2.png" alt="Button Image" onClick={() => handleButtonClick('ba')} />
        <img id="rel" className="navbuttons" src="/media player components/rel-2.png" alt="Button Image" onClick={() => handleButtonClick('rel')} />

        <img id="on" className="roundButtons" onClick={togglePlayPause} src={isPlaying ? "/media player components/on.png" : "/media player components/play.png"} alt={isPlaying ? "Play Button" : "Pause Button"} />
        
        <img id="skipL" className="skipButtons" onClick={prevTrack} src="/media player components/skipL.png" alt="Button Image" style={{ pointerEvents: 'none' }} />
        <div className="skipButton-mask skipL-mask" onClick={prevTrack}></div>
        
        <img id="skipR" className="skipButtons" onClick={nextTrack} src="/media player components/skipR.png" alt="Button Image" style={{ pointerEvents: 'none' }} />
        <div className="skipButton-mask skipR-mask" onClick={nextTrack}></div>
        
        <img id="topS" className="skipButtons" src="/media player components/topS.png" alt="Button Image" style={{ pointerEvents: 'none' }} />
        <div className="skipButton-mask topS-mask" onClick={() => {
          const newVolume = Math.min(volume + 0.1, 1);
          setVolume(newVolume);
          if (sound) sound.volume(newVolume);
        }}></div>
        
        <img id="bottomS" className="skipButtons" src="/media player components/bottomS.png" alt="Button Image" style={{ pointerEvents: 'none' }} />
        <div className="skipButton-mask bottomS-mask" onClick={() => {
          const newVolume = Math.max(volume - 0.1, 0);
          setVolume(newVolume);
          if (sound) sound.volume(newVolume);
        }}></div>

{/* Apply the hidden class when tempFileName is set */}
<p className={`file-name ${shouldScroll && !tempFileName ? 'scroll' : 'hidden'}`} ref={fileNameRef}>
  <span id="filenameText">{tempFileName || currentFile.name}</span>
</p>

{/* Show time-display only when tempFileName is present */}
{tempFileName && (
  <p className="time-display">{tempFileName}</p>
)}



        {currentFile && (
          <>
            {currentFile.type.startsWith("video") ? (
              <video ref={videoRef} src={currentFile.src} className="video" autoPlay muted />
            ) : (
              <audio ref={mediaRef} src={currentFile.src} className="audio" onClick={togglePlayPause} />
            )}
          </>
        )}
        <div className="controls">
          <div className="controls-inner">
            <button className="play-pause" onClick={togglePlayPause}>
              {isPlaying ? "❚❚" : "▶"}
            </button>
          </div>
          <div className="progress-bar" ref={progressRef} onMouseDown={handleProgressMouseDown}>
            <div className="progress" style={{ width: `${progress}%` }}></div>
          </div>

          {/* Custom Volume Control */}
          <div className="volume-control" id="volumeControl">
            <label htmlFor="volume-slider">Volume:</label>
            <input
              type="range"
              id="volume-slider"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
            />
            <button>WAWEAW</button>
          </div>
        </div>
      </div>
      {showVisualizer && <AudioVisualizer mediaRef={mediaRef} />} {/* Render visualizer conditionally */}

      {/* Video Modal */}
      {isVideoModalOpen && (
        <div className="video-modal">
          <div className="modal-content">
            <span className="close" onClick={() => setIsVideoModalOpen(false)}>&times;</span>
            <video ref={mediaRef} src={currentFile.src} className="video" controls />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
