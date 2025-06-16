import { useState, useRef, useEffect } from "react";
import "./App.css";
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
  const [mediaSourcePath, setMediaSourcePath] = useState('');
  const mediaRef = useRef(null);
  const progressRef = useRef(null); // Reference to the progress bar
  const fileNameRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [tempFileNameTimeout, setTempFileNameTimeout] = useState(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false); // New state for video modal visibility
  const videoRef = useRef(null); // Reference for the video element
  const visualizerRef = useRef(null); // Reference for the visualizer canvas
  const animationFrameRef = useRef(null); // Reference for animation frame
  const [audioContext, setAudioContext] = useState(null);
  const [audioAnalyser, setAudioAnalyser] = useState(null);
  const [isVisualizerPressed, setIsVisualizerPressed] = useState(false);
  const [isSkipRTilted, setIsSkipRTilted] = useState(false);
  const [isSkipLTilted, setIsSkipLTilted] = useState(false);
  const [isTopSTilted, setIsTopSTilted] = useState(false);
  const [isBottomSTilted, setIsBottomSTilted] = useState(false);
  const [showDisc, setShowDisc] = useState(false);
  const [canTriggerDisc, setCanTriggerDisc] = useState(true);
  const [discs, setDiscs] = useState([]);
  const [sheep, setSheep] = useState([]);
  const [canTriggerSheep, setCanTriggerSheep] = useState(true);
  const [sheepSound] = useState(new Howl({
    src: [process.env.PUBLIC_URL + '/media player components/sheep.mp3'],
    volume: 1.0
  }));

  const [displayText, setDisplayText] = useState("Default Text");
  const [isChangingText, setIsChangingText] = useState(false);

  // Function to load media files from a folder
  const loadMediaFiles = async (folderPath) => {
    if (!folderPath) return;
    setMediaSourcePath(folderPath);
    localStorage.setItem('mediaSourcePath', folderPath);

    // Use IPC to get file list from main process
    if (window.electronAPI && window.electronAPI.getMediaFiles) {
      try {
        const items = await window.electronAPI.getMediaFiles(folderPath);
        
        // Filter for media files and add their full paths
        const validMediaFiles = items
          .filter(file => {
            if (file.isDirectory) return false;
            const ext = file.name.toLowerCase().split('.').pop();
            return ['mp3', 'wav', 'mp4'].includes(ext);
          })
          .map(file => ({
            ...file,
            absPath: file.path,
            fileUrl: 'file://' + file.path.replace(/\\/g, '/'),
            type: file.name.toLowerCase().endsWith('.mp4') ? 'video/mp4' : 'audio/mpeg'
          }));
        
        console.log('Found media files:', validMediaFiles); // Debug log
        setFiles(validMediaFiles);
        setCurrentIndex(0); // Reset to first file
      } catch (error) {
        console.error('Error loading media files:', error);
      }
    }
  };

  // Load media files
  useEffect(() => {
    const loadInitialMediaFiles = async () => {
      if (mediaSourcePath) {
        // Only load files if we have a path
        await loadMediaFiles(mediaSourcePath);
      } else {
        // If no path, just set empty files array
        setFiles([]);
      }
    };
    loadInitialMediaFiles();
  }, [mediaSourcePath]);

  // Handler for the src (dsc) button
  const handleSourceButtonClick = async () => {
    if (!window.electronAPI || !window.electronAPI.selectFolder) {
      alert("Electron API not available");
      return;
    }
    const folderPath = await window.electronAPI.selectFolder();
    if (folderPath) {
      await loadMediaFiles(folderPath);
    }
  };

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
      src: [files[(currentIndex + 1) % files.length].absPath],
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
      const audioOnlyElements = ['aud', 'screen', 'filenameText'];
      const videoOnlyElements = [];

      // Use Howler for audio playback for all types
      const newSound = new Howl({
        src: [currentFile.absPath],
        volume: volume,
        rate: playbackRate,
        html5: false, // Use HTML4 Audio
        onplay: () => {
          setIsPlaying(true);
          if (currentFile.type.startsWith("video")) {
            if (videoRef.current) {
              videoRef.current.play();
            }
          }
        },
        onpause: () => {
          setIsPlaying(false);
          if (currentFile.type.startsWith("video")) {
            if (videoRef.current) {
              videoRef.current.pause();
            }
          }
        },
        onend: nextTrack,
        onload: () => {
          console.log('Sound loaded, setting up analyzer');
          // Set up audio analyzer after sound is loaded
          if (newSound._sounds[0] && newSound._sounds[0]._node) {
            try {
              const audioContext = newSound._sounds[0]._node.context;
              const analyser = audioContext.createAnalyser();
              analyser.fftSize = 256;
              newSound._sounds[0]._node.connect(analyser);
              analyser.connect(audioContext.destination);
              setAudioAnalyser(analyser);
              console.log('Audio analyzer set up successfully');
            } catch (error) {
              console.error('Error setting up audio analyzer:', error);
            }
          } else {
            console.log('Sound node not available for analyzer setup');
          }
        }
      });
      setSound(newSound);
      newSound.play();
      
      // Toggle element visibility based on file type
      if (currentFile.type.startsWith("video")) {
        audioOnlyElements.forEach(id => toggleElementVisibilityById(id, false));
        videoOnlyElements.forEach(id => toggleElementVisibilityById(id, true));
      } else {
        audioOnlyElements.forEach(id => toggleElementVisibilityById(id, true));
        videoOnlyElements.forEach(id => toggleElementVisibilityById(id, false));
      }
    }
    // Cleanup function to stop the sound when the component unmounts or track changes
    return () => {
      if (sound) {
        sound.stop();
      }
    };
  }, [currentFile]);

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
    if (buttonId === 'aud') {
      console.log('Toggling visualizer, current state:', showVisualizer);
      setShowVisualizer((prev) => !prev);
      console.log('New visualizer state:', !showVisualizer);
      setIsVisualizerPressed((prev) => !prev);
    } else {
      setPressedButton((prevButton) => (prevButton === buttonId ? null : buttonId));
    }
    
    if (buttonId === 'button1') {
      const newRate = playbackRate === 0.6 ? 1 : 0.6; // Toggle between normal and slowed down
      setPlaybackRate(newRate); // Set the global playback rate for audio
      if (sound) {
        sound.rate(newRate); // Set the playback rate for audio
      }
      if (videoRef.current) {
        videoRef.current.playbackRate = newRate; // Set the playback rate for video
      }
    }
    if (buttonId === 'button2') {
      const newRate = playbackRate === 0.8 ? 1 : 0.8; // Toggle between normal and slowed down
      setPlaybackRate(newRate); // Set the global playback rate for audio
      if (sound) {
        sound.rate(newRate); // Set the playback rate for audio
      }
      if (videoRef.current) {
        videoRef.current.playbackRate = newRate; // Set the playback rate for video
      }
    }
    if (buttonId === 'button3') {
      const newRate = playbackRate === 1.2 ? 1 : 1.2; // Toggle between normal and sped up
      setPlaybackRate(newRate); // Set the global playback rate for audio
      if (sound) {
        sound.rate(newRate); // Set the playback rate for audio
      }
      if (videoRef.current) {
        videoRef.current.playbackRate = newRate; // Set the playback rate for video
      }
    }
    if (buttonId === 'button4') {
      // Set playback speed to 1.5x
      const newRate = playbackRate === 1.5 ? 1 : 1.5; // Define the new rate
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

  // New handler for seek buttons (5 and 6) that does not toggle pressedButton
  const handleSeekButtonClick = (buttonId) => {
    if (buttonId === 'button5') {
      // Jump backward by 5 seconds
      if (sound) {
        sound.seek(Math.max(0, sound.seek() - 5)); // Seek back for audio
      } else if (videoRef.current) {
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5); // Seek back for video
      }
      temporarilyChangeText('-5 seconds');
    }
    if (buttonId === 'button6') {
      // Jump forward by 5 seconds
      if (sound) {
        sound.seek(Math.min(sound.duration(), sound.seek() + 5)); // Seek forward for audio
      } else if (videoRef.current && videoRef.current.duration) {
        videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 5); // Seek forward for video
      }
      temporarilyChangeText('+5 seconds');
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
    }, 1500);
  
    setTempFileNameTimeout(timeout); // Store the timeout ID to clear it later
  };
  

  const temporarilyChangeText = (newText) => {
    if (tempFileNameTimeout) clearTimeout(tempFileNameTimeout);
  
    setTempFileName(newText); // Temporarily set new text
    setShouldScroll(false); // Disable scrolling while showing new text
  
    const timeout = setTimeout(() => {
      setTempFileName(null); // Revert text after 3 seconds
      setShouldScroll(true); // Re-enable scrolling
    }, 1500);
  
    setTempFileNameTimeout(timeout); // Store timeout ID for cleanup
  };
  

  // Helper function to toggle element visibility by ID
  const toggleElementVisibilityById = (id, isVisible) => {
    const element = document.getElementById(id);
    if (element) {
      element.style.display = isVisible ? '' : 'none'; // Use '' to revert to default display or 'block'
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('mediaSourcePath');
    if (stored) {
      setMediaSourcePath(stored);
    } else if (window.electronAPI && window.electronAPI.getMusicPath) {
      window.electronAPI.getMusicPath().then((musicPath) => {
        setMediaSourcePath(musicPath);
      });
    }
  }, []);

  // Modify the visualizer effect
  useEffect(() => {
    console.log('Visualizer effect running:', { 
      showVisualizer, 
      hasSound: !!sound,
      hasAnalyser: !!audioAnalyser
    });
    
    if (showVisualizer && sound && audioAnalyser) {
      try {
        // Start animation
        console.log('Starting visualizer animation');
        drawVisualizer();
      } catch (error) {
        console.error('Error setting up visualizer:', error);
      }
    } else {
      // Clean up animation frame
      if (animationFrameRef.current) {
        console.log('Cleaning up visualizer animation');
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    
    return () => {
      if (animationFrameRef.current) {
        console.log('Cleaning up visualizer animation on unmount');
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [showVisualizer, sound, audioAnalyser]);

  // Modify the drawVisualizer function
  const drawVisualizer = () => {
    if (!visualizerRef.current || !audioAnalyser) {
      console.log('Visualizer or analyzer not ready:', { 
        hasVisualizer: !!visualizerRef.current, 
        hasAnalyser: !!audioAnalyser
      });
      return;
    }
    
    try {
      const canvas = visualizerRef.current;
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      
      // Clear the canvas
      ctx.clearRect(0, 0, width, height);
      
      const dataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
      audioAnalyser.getByteFrequencyData(dataArray);
      
      // Draw the visualization
      const barWidth = (width / dataArray.length) * 2.5;
      let x = 0;
      
      for (let i = 0; i < dataArray.length; i++) {
        const barHeight = (dataArray[i] / 255) * height;
        
        // Create gradient
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#000000');
        gradient.addColorStop(1, '#000000');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
      
      // Request next frame
      animationFrameRef.current = requestAnimationFrame(drawVisualizer);
    } catch (error) {
      console.error('Error in drawVisualizer:', error);
    }
  };

  // Add these handlers
  const handleSkipRMouseDown = () => {
    setIsSkipRTilted(true);
  };

  const handleSkipRMouseUp = () => {
    setIsSkipRTilted(false);
  };

  const handleSkipLMouseDown = () => {
    setIsSkipLTilted(true);
  };

  const handleSkipLMouseUp = () => {
    setIsSkipLTilted(false);
  };

  const handleTopSMouseDown = () => {
    setIsTopSTilted(true);
  };

  const handleTopSMouseUp = () => {
    setIsTopSTilted(false);
  };

  const handleBottomSMouseDown = () => {
    setIsBottomSTilted(true);
  };

  const handleBottomSMouseUp = () => {
    setIsBottomSTilted(false);
  };

  // Add this handler
  const handleRelClick = () => {
    if (canTriggerDisc) {
      const newDiscId = Date.now(); // Create unique ID for the disc
      setDiscs(prev => [...prev, newDiscId]);
      setCanTriggerDisc(false);
      
      // Re-enable the button after 2 seconds
      setTimeout(() => {
        setCanTriggerDisc(true);
        // Remove the disc after animation completes
        setDiscs(prev => prev.filter(id => id !== newDiscId));
      }, 2000);
    }
  };

  const handleBaClick = () => {
    if (canTriggerSheep) {
      const newSheepId = Date.now();
      setSheep(prev => [...prev, newSheepId]);
      setCanTriggerSheep(false);
      
      // Play the sheep sound
      sheepSound.play();
      
      // Remove the sheep after a brief moment
      setTimeout(() => {
        setCanTriggerSheep(true);
        setSheep(prev => prev.filter(id => id !== newSheepId));
      }, 800);
    }
  };

  if (files.length === 0) return (
    <div className="app">
      <div className="title-bar">
        <div className="drag-region"></div>
        <button className="window-btn" onClick={() => window.electronAPI.minimizeWindow()}>—</button>
        <button className="window-btn close" onClick={() => window.electronAPI.closeWindow()}>✕</button>
      </div>
      <div className="player-container">
        <img id={'background'} src={process.env.PUBLIC_URL + '/media player components/background.png'} alt="Next" style={{ position: 'absolute' }} />
        <img id={'screen'} src={process.env.PUBLIC_URL + '/media player components/screen.png'} alt="Next" style={{ position: 'absolute'}} />
        
        {/* Navigation buttons */}
        <img id="button1" className="navbuttons" src={process.env.PUBLIC_URL + '/media player components/1-2.png'} alt="Button Image" />
        <img id="button2" className="navbuttons" src={process.env.PUBLIC_URL + '/media player components/2-2.png'} alt="Button Image" />
        <img id="button3" className="navbuttons" src={process.env.PUBLIC_URL + '/media player components/3-2.png'} alt="Button Image" />
        <img id="button4" className="navbuttons" src={process.env.PUBLIC_URL + '/media player components/4-2.png'} alt="Button Image" />
        <img id="button5" className="navbuttons" src={process.env.PUBLIC_URL + '/media player components/5-2.png'} alt="Button Image" />
        <img id="button6" className="navbuttons" src={process.env.PUBLIC_URL + '/media player components/6-2.png'} alt="Button Image" />
        
        <img id="aud" className="navbuttons" src={process.env.PUBLIC_URL + '/media player components/aud-2.png'} alt="Button Image" />
        <img id="dsc" className="navbuttons" src={process.env.PUBLIC_URL + '/media player components/dsc-2.png'} alt="Button Image" onClick={handleSourceButtonClick} />
        <img id="clock" className="navbuttons" src={process.env.PUBLIC_URL + '/media player components/clock-2.png'} alt="Button Image" />
        <img id="ba" className="navbuttons" src={process.env.PUBLIC_URL + '/media player components/ba-2.png'} alt="Button Image" />
        <img id="rel" className="navbuttons" src={process.env.PUBLIC_URL + '/media player components/rel-2.png'} alt="Button Image" />

        <img id="on" className="roundButtons" src={process.env.PUBLIC_URL + '/media player components/play.png'} alt="Play Button" />
        
        <img id="skipL" className="skipButtons" src={process.env.PUBLIC_URL + '/media player components/skipL.png'} alt="Button Image" style={{ pointerEvents: 'none' }} />
        <div className="skipButton-mask skipL-mask"></div>
        
        <img id="skipR" className="skipButtons" src={process.env.PUBLIC_URL + '/media player components/skipR.png'} alt="Button Image" style={{ pointerEvents: 'none' }} />
        <div className="skipButton-mask skipR-mask"></div>
        
        <img id="topS" className="skipButtons" src={process.env.PUBLIC_URL + '/media player components/topS.png'} alt="Button Image" style={{ pointerEvents: 'none' }} />
        <div className="skipButton-mask topS-mask"></div>
        
        <img id="bottomS" className="skipButtons" src={process.env.PUBLIC_URL + '/media player components/bottomS.png'} alt="Button Image" style={{ pointerEvents: 'none' }} />
        <div className="skipButton-mask bottomS-mask"></div>

        <p className="file-name">Select a folder to begin</p>
      </div>
    </div>
  );

  return (
    <div className="app">
      <div className="title-bar">
        <div className="drag-region"></div>
        <button className="window-btn" onClick={() => window.electronAPI.minimizeWindow()}>—</button>
        <button className="window-btn close" onClick={() => window.electronAPI.closeWindow()}>✕</button>
      </div>
      <div className="player-container">
        <img id={'background'} src={process.env.PUBLIC_URL + '/media player components/background.png'} alt="Next" style={{ position: 'absolute' }} />
        <img id={'screen'} src={process.env.PUBLIC_URL + '/media player components/screen.png'} alt="Next" style={{ position: 'absolute'}} />
        
        {/* Navigation buttons */}
        <img id="button1" className={`navbuttons ${pressedButton === 'button1' ? 'active' : ''}`} src={process.env.PUBLIC_URL + '/media player components/1-2.png'} alt="Button Image" onClick={() => { handleButtonClick('button1'); temporarilyChangeText('Slow 1!'); }} />
        <img id="button2" className={`navbuttons ${pressedButton === 'button2' ? 'active' : ''}`} src={process.env.PUBLIC_URL + '/media player components/2-2.png'} alt="Button Image" onClick={() => { handleButtonClick('button2'); temporarilyChangeText('Slow 2!'); }} />
        <img id="button3" className={`navbuttons ${pressedButton === 'button3' ? 'active' : ''}`} src={process.env.PUBLIC_URL + '/media player components/3-2.png'} alt="Button Image" onClick={() => { handleButtonClick('button3'); temporarilyChangeText('Speed1!'); }} />
        <img id="button4" className={`navbuttons ${pressedButton === 'button4' ? 'active' : ''}`} src={process.env.PUBLIC_URL + '/media player components/4-2.png'} alt="Button Image" onClick={() => { handleButtonClick('button4'); temporarilyChangeText('Speed2!'); }} />
        <img id="button5" className={`navbuttons ${pressedButton === 'button5' ? 'active' : ''}`} src={process.env.PUBLIC_URL + '/media player components/5-2.png'} alt="Button Image" onClick={() => handleSeekButtonClick('button5')} />
        <img id="button6" className={`navbuttons ${pressedButton === 'button6' ? 'active' : ''}`} src={process.env.PUBLIC_URL + '/media player components/6-2.png'} alt="Button Image" onClick={() => handleSeekButtonClick('button6')} />

        
        <img 
          id="aud" 
          className={`navbuttons ${isVisualizerPressed ? 'active' : ''}`} 
          src={process.env.PUBLIC_URL + '/media player components/aud-2.png'} 
          alt="Button Image" 
          onClick={() => {
            console.log('Aud button clicked');
            handleButtonClick('aud');
            temporarilyChangeText(showVisualizer ? 'Visualizer Off' : 'Visualizer On');
          }} 
        />
        <img id="dsc" className="navbuttons" src={process.env.PUBLIC_URL + '/media player components/dsc-2.png'} alt="Button Image" onClick={handleSourceButtonClick} />
        <img id="clock" className="navbuttons" src={process.env.PUBLIC_URL + '/media player components/clock-2.png'} alt="Button Image" onClick={handleClockClick} />
        <img 
          id="ba" 
          className={`navbuttons ${!canTriggerSheep ? 'active' : ''}`} 
          src={process.env.PUBLIC_URL + '/media player components/ba-2.png'} 
          alt="Button Image" 
          onClick={handleBaClick} 
        />
        <img 
          id="rel" 
          className={`navbuttons ${!canTriggerDisc ? 'active' : ''}`} 
          src={process.env.PUBLIC_URL + '/media player components/rel-2.png'} 
          alt="Button Image" 
          onClick={handleRelClick} 
        />

        {sheep.map(sheepId => (
          <img 
            key={sheepId}
            id="sheep" 
            className="sheep animate"
            src={process.env.PUBLIC_URL + '/media player components/sheep.png'} 
          />
        ))}

        <img id="on" className="roundButtons" onClick={togglePlayPause} src={isPlaying ? process.env.PUBLIC_URL + '/media player components/on.png' : process.env.PUBLIC_URL + '/media player components/play.png'} alt={isPlaying ? "Play Button" : "Pause Button"} />
        
        {discs.map(discId => (
          <img 
            key={discId}
            id="disc" 
            className="disc animate"
            src={process.env.PUBLIC_URL + '/media player components/Disc.png'} 
          />
        ))}

        <img 
          id="skipL" 
          className={`skipButtons ${isSkipLTilted ? 'tilted' : ''}`} 
          onClick={prevTrack} 
          src={process.env.PUBLIC_URL + '/media player components/skipL.png'} 
          alt="Button Image" 
          style={{ pointerEvents: 'none' }} 
          onMouseDown={handleSkipLMouseDown}
          onMouseUp={handleSkipLMouseUp}
          onMouseLeave={handleSkipLMouseUp}
        />
        <div 
          className="skipButton-mask skipL-mask" 
          onClick={prevTrack}
          onMouseDown={handleSkipLMouseDown}
          onMouseUp={handleSkipLMouseUp}
          onMouseLeave={handleSkipLMouseUp}
        ></div>
        
        <img 
          id="skipR" 
          className={`skipButtons ${isSkipRTilted ? 'tilted' : ''}`} 
          onClick={nextTrack} 
          src={process.env.PUBLIC_URL + '/media player components/skipR.png'} 
          alt="Button Image" 
          style={{ pointerEvents: 'none' }} 
          onMouseDown={handleSkipRMouseDown}
          onMouseUp={handleSkipRMouseUp}
          onMouseLeave={handleSkipRMouseUp}
        />
        <div 
          className="skipButton-mask skipR-mask" 
          onClick={nextTrack}
          onMouseDown={handleSkipRMouseDown}
          onMouseUp={handleSkipRMouseUp}
          onMouseLeave={handleSkipRMouseUp}
        ></div>
        
        <img 
          id="topS" 
          className={`skipButtons ${isTopSTilted ? 'tilted' : ''}`} 
          src={process.env.PUBLIC_URL + '/media player components/topS.png'} 
          alt="Button Image" 
          style={{ pointerEvents: 'none' }} 
          onMouseDown={handleTopSMouseDown}
          onMouseUp={handleTopSMouseUp}
          onMouseLeave={handleTopSMouseUp}
        />
        <div 
          className="skipButton-mask topS-mask" 
          onClick={() => {
            const newVolume = Math.min(volume + 0.1, 1);
            setVolume(newVolume);
            if (sound) sound.volume(newVolume);
          }}
          onMouseDown={handleTopSMouseDown}
          onMouseUp={handleTopSMouseUp}
          onMouseLeave={handleTopSMouseUp}
        ></div>
        
        <img 
          id="bottomS" 
          className={`skipButtons ${isBottomSTilted ? 'tilted' : ''}`} 
          src={process.env.PUBLIC_URL + '/media player components/bottomS.png'} 
          alt="Button Image" 
          style={{ pointerEvents: 'none' }} 
          onMouseDown={handleBottomSMouseDown}
          onMouseUp={handleBottomSMouseUp}
          onMouseLeave={handleBottomSMouseUp}
        />
        <div 
          className="skipButton-mask bottomS-mask" 
          onClick={() => {
            const newVolume = Math.max(volume - 0.1, 0);
            setVolume(newVolume);
            if (sound) sound.volume(newVolume);
          }}
          onMouseDown={handleBottomSMouseDown}
          onMouseUp={handleBottomSMouseUp}
          onMouseLeave={handleBottomSMouseUp}
        ></div>

        {showVisualizer && (
          <canvas
            ref={visualizerRef}
            className="visualizer"
            width={300}
            height={40}
            style={{
              position: 'absolute',
              top: '40%',
              left: '50%',
              transform: 'translateX(-48%)',
              width: '46%',
              height: '40px',
              zIndex: tempFileName ? 1 : 1000000,
              visibility: tempFileName ? 'hidden' : 'visible'
            }}
          />
        )}

        <p className={`file-name ${shouldScroll && !tempFileName && !showVisualizer ? 'scroll' : 'hidden'}`} ref={fileNameRef}>
          <span id="filenameText">{tempFileName || currentFile.name}</span>
        </p>

        {tempFileName && (
          <p className="time-display" style={{ zIndex: 1000001 }}>{tempFileName}</p>
        )}

        {currentFile && (
          <>
            {currentFile.type.startsWith("video") ? (
              <video ref={videoRef} src={currentFile.fileUrl} className="video" autoPlay muted />
            ) : (
              <audio ref={mediaRef} src={currentFile.fileUrl} className="audio" onClick={togglePlayPause} />
            )}
          </>
        )}
        <div className="controls">
          <div className="controls-inner">
            <button className="play-pause" onClick={togglePlayPause}>
              {isPlaying ? "❚❚" : "▶"}
            </button>
          </div>
          <div className={`progress-bar${currentFile.type.startsWith('video') ? ' video-progress-bar' : ''}`} ref={progressRef} onMouseDown={handleProgressMouseDown}>
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

      {/* Video Modal */}
      {isVideoModalOpen && (
        <div className="video-modal">
          <div className="modal-content">
            <span className="close" onClick={() => setIsVideoModalOpen(false)}>&times;</span>
            <video ref={mediaRef} src={currentFile.fileUrl} className="video" controls />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
