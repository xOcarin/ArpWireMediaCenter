import { useState, useRef, useEffect } from "react";
import "./App.css";
import { Howl } from 'howler'; // Import Howler for audio playback

/**
 * Main App Component - Media Player Application
 * Handles both audio and video playback with custom UI controls
 * Uses Howler.js for audio management and native video elements for video playback
 */
function App() {
  // ==================== STATE MANAGEMENT ====================
  
  // Media file management
  const [files, setFiles] = useState([]); // Array of media files loaded from selected folder // Array of media files loaded from selected folder
  const [currentIndex, setCurrentIndex] = useState(0); // Index of currently playing file
  const [isPlaying, setIsPlaying] = useState(false); // Playback state
  const [progress, setProgress] = useState(0); // Playback progress (0-100%)
  const [volume, setVolume] = useState(.5); // Volume level (0-1 range)
  const [pressedButton, setPressedButton] = useState(null); // Tracks which control button is active
  const [shouldScroll, setShouldScroll] = useState(false); // Whether filename should scroll if too long
  const [tempFileName, setTempFileName] = useState(null); // Temporary text to display instead of filename
  const [showVisualizer, setShowVisualizer] = useState(false); // Audio visualizer visibility
  const [sound, setSound] = useState(null); // Howler.js sound instance for current track
  const [playbackRate, setPlaybackRate] = useState(1); // Playback speed multiplier (1 = normal)
  const [mediaSourcePath, setMediaSourcePath] = useState(''); // Path to folder containing media files // Path to folder containing media files
  
  // DOM References
  const mediaRef = useRef(null); // Reference to audio element
  const progressRef = useRef(null); // Reference to progress bar for seeking
  const fileNameRef = useRef(null); // Reference to filename display for overflow detection
  const videoRef = useRef(null); // Reference to video element
  const visualizerRef = useRef(null); // Reference to canvas element for audio visualization
  const animationFrameRef = useRef(null); // Reference for requestAnimationFrame cleanup
  
  // UI interaction state
  const [isDragging, setIsDragging] = useState(false); // Tracks if user is dragging progress bar
  const [tempFileNameTimeout, setTempFileNameTimeout] = useState(null); // Timeout for reverting temporary text
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false); // Video modal visibility (currently unused)
  
  // Audio visualization
  const [audioContext, setAudioContext] = useState(null); // Web Audio API context
  const [audioAnalyser, setAudioAnalyser] = useState(null); // Audio analyzer node for visualizer
  const [isVisualizerPressed, setIsVisualizerPressed] = useState(false); // Visual feedback for visualizer button
  
  // Button animation states (visual feedback for user interactions)
  const [isSkipRTilted, setIsSkipRTilted] = useState(false); // Skip right button pressed state
  const [isSkipLTilted, setIsSkipLTilted] = useState(false); // Skip left button pressed state
  const [isTopSTilted, setIsTopSTilted] = useState(false); // Volume up button pressed state
  const [isBottomSTilted, setIsBottomSTilted] = useState(false); // Volume down button pressed state
  
  // Easter egg animations
  const [showDisc, setShowDisc] = useState(false); // Disc animation visibility (deprecated, use discs array)
  const [canTriggerDisc, setCanTriggerDisc] = useState(true); // Prevents spam clicking disc animation
  const [discs, setDiscs] = useState([]); // Array of active disc animation IDs
  const [sheep, setSheep] = useState([]); // Array of active sheep animation IDs
  const [canTriggerSheep, setCanTriggerSheep] = useState(true); // Prevents spam clicking sheep animation
  const [sheepSound] = useState(new Howl({ // Sound effect for sheep animation
    src: [process.env.PUBLIC_URL + '/media player components/sheep.mp3'],
    volume: 1.0
  }));

  // Unused legacy state (can be removed)
  const [displayText, setDisplayText] = useState("Default Text");
  const [isChangingText, setIsChangingText] = useState(false);

  // ==================== MEDIA FILE LOADING ====================
  
  /**
   * Loads media files from a specified folder path
   * Communicates with Electron main process to read file system
   * Filters for supported formats (mp3, wav, mp4)
   * @param {string} folderPath - Absolute path to folder containing media files
   */
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
    };
  };

  /**
   * Effect: Initialize media files on component mount and when path changes
   * Loads files from stored path or leaves files array empty if no path set
   */
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

  /**
   * Opens folder selection dialog via Electron API
   * Called when user clicks the "dsc" (disc/source) button
   */
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

  // ==================== PLAYBACK CONTROL ====================
  
  // Get the currently selected file based on index
  const currentFile = files[currentIndex];

  /**
   * Toggles between play and pause states
   * Handles both audio (via Howler) and video (via videoRef) playback
   */
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

  /**
   * Updates the progress bar based on current playback position
   * Called periodically by interval timer
   */
  const updateProgress = () => {
    if (sound) {
        const progressValue = (sound.seek() / sound.duration()) * 100; // Get current time and duration from Howler
        setProgress(progressValue); // Update progress state
    }
  };

  /**
   * Skips to the next track in the playlist
   * Wraps around to first track when reaching the end
   * Automatically starts playing the new track
   */
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

  /**
   * Skips to the previous track in the playlist
   * Wraps around to last track when at the beginning
   * Resets playback state and progress
   */
  const prevTrack = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + files.length) % files.length);
    setIsPlaying(false);
    setProgress(0);
  };

  // ==================== VOLUME CONTROL ====================
  
  /**
   * Updates volume level from slider input
   * Note: Currently only updates mediaRef, may need to update Howler sound as well
   */
  const handleVolumeChange = (e) => {
    const volumeValue = e.target.value;
    setVolume(volumeValue);
    if (mediaRef.current) {
      mediaRef.current.volume = volumeValue; // Update the volume on the media element
    }
  };

  // ==================== PROGRESS BAR SEEKING ====================
  
  /**
   * Initiates dragging on progress bar
   * Allows user to seek to specific position in track
   */
  const handleProgressMouseDown = (e) => {
    e.preventDefault(); // Prevent default behavior
    setIsDragging(true);
    updateProgressBar(e); // Update immediately on mouse down
  };

  /**
   * Handles mouse movement during progress bar drag
   * Only updates if dragging is active
   */
  const handleProgressMouseMove = (e) => {
    if (isDragging) {
      e.preventDefault(); // Prevent default behavior
      updateProgressBar(e); // Update while dragging
    }
  };

  /**
   * Ends progress bar dragging interaction
   */
  const handleProgressMouseUp = () => {
    setIsDragging(false); // Stop dragging
  };

  /**
   * Calculates and applies new playback position based on mouse position
   * @param {MouseEvent} e - Mouse event containing cursor position
   */
  const updateProgressBar = (e) => {
    if (!sound) return; // Ensure sound is available
    const progressBar = progressRef.current;
    const rect = progressBar.getBoundingClientRect();
    const offsetX = e.clientX - rect.left; // Calculate mouse position relative to the progress bar
    const newProgress = Math.min(Math.max(0, offsetX / rect.width), 1); // Clamp value between 0 and 1
    
    setProgress(newProgress * 100); // Update progress state
    sound.seek(newProgress * sound.duration()); // Set Howler sound current time
  };

  // ==================== EFFECT HOOKS ====================
  
  /**
   * Effect: Set up global mouse event listeners for progress bar dragging
   * Ensures dragging works even when cursor moves outside progress bar
   */
  useEffect(() => {
    window.addEventListener("mouseup", handleProgressMouseUp);
    window.addEventListener("mousemove", handleProgressMouseMove);
    return () => {
        window.removeEventListener("mouseup", handleProgressMouseUp);
        window.removeEventListener("mousemove", handleProgressMouseMove);
    };
  }, [isDragging]);

  /**
   * Effect: Update progress bar every second during playback
   */
  useEffect(() => {
    const interval = setInterval(updateProgress, 1000); // Update progress every second
    return () => clearInterval(interval); // Cleanup interval on unmount
  }, [sound]); // Run this effect when the sound changes

  /**
   * Effect: Reapply volume setting when track or volume changes
   * Ensures volume persists across track changes
   */
  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.volume = volume;
    }
  }, [currentIndex, volume]); // Reapply volume when the song or volume changes

  /**
   * Effect: Initialize and play new track when currentFile changes
   * - Creates new Howler sound instance with current settings
   * - Sets up audio analyzer for visualizer
   * - Handles video element synchronization
   * - Toggles UI elements based on media type (audio vs video)
   */
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

  /**
   * Effect: Synchronize video element events with playback state
   * Keeps video and audio playback in sync, updates progress bar
   */
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

  // ==================== BUTTON HANDLERS ====================
  
  /**
   * Main handler for numbered control buttons and special function buttons
   * Buttons 1-4: Playback speed controls
   * Button 5-6: Handled separately by handleSeekButtonClick
   * Button 7-10: Placeholder for future features
   * aud: Toggles audio visualizer
   * @param {string} buttonId - ID of the clicked button
   */
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

  /**
   * Handler for seek forward/backward buttons (5 and 6)
   * Does not toggle pressed state, only performs seek action
   * @param {string} buttonId - Either 'button5' (back 5s) or 'button6' (forward 5s)
   */
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

  // ==================== FILENAME DISPLAY ====================
  
  /**
   * Effect: Check if filename text overflows container and needs scrolling
   * Updates shouldScroll state which triggers CSS animation
   */
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
  

  /**
   * Shows current time when clock button is clicked
   * Temporarily replaces filename display for 1.5 seconds
   */
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
  

  /**
   * Temporarily displays custom text in place of filename
   * Used for user feedback (e.g., "Speed1!", "-5 seconds")
   * @param {string} newText - Text to display temporarily
   */
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
  

  // ==================== UTILITY FUNCTIONS ====================
  
  /**
   * Toggles visibility of DOM elements by their ID
   * Used to show/hide elements based on media type (audio vs video)
   * @param {string} id - Element ID to toggle
   * @param {boolean} isVisible - Whether element should be visible
   */
  const toggleElementVisibilityById = (id, isVisible) => {
    const element = document.getElementById(id);
    if (element) {
      element.style.display = isVisible ? '' : 'none'; // Use '' to revert to default display or 'block'
    }
  };

  /**
   * Effect: Load saved media source path from localStorage on mount
   * Falls back to default music path via Electron API if no saved path exists
   */
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

  // ==================== AUDIO VISUALIZER ====================
  
  /**
   * Effect: Start/stop audio visualizer animation
   * Requires showVisualizer flag, active sound, and audio analyzer
   */
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

  /**
   * Draws audio frequency visualization on canvas
   * Uses Web Audio API analyzer to get frequency data
   * Creates animated bars representing audio spectrum
   */
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

  // ==================== BUTTON ANIMATION HANDLERS ====================
  // Visual feedback handlers for button press/release states
  
  /**
   * Skip right button press handler - adds tilt effect
   */
  const handleSkipRMouseDown = () => {
    setIsSkipRTilted(true);
  };

  /**
   * Skip right button release handler - removes tilt effect
   */
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

  // ==================== EASTER EGG HANDLERS ====================
  
  /**
   * Triggers spinning disc animation when "rel" button is clicked
   * Prevents spam clicking with cooldown timer
   */
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

  /**
   * Triggers sheep animation and sound effect when "ba" button is clicked
   * Prevents spam clicking with cooldown timer
   */
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

  // ==================== RENDER ====================
  
  // Empty state: Show UI with prompt to select folder
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
        
        <img 
          id="skipL"
          className={`skipButtons ${isSkipLTilted ? 'tilted' : ''}`}
          src={process.env.PUBLIC_URL + '/media player components/skipl.png'}
          alt="Skip Left"
          onClick={prevTrack}
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
        />

        <img 
          id="skipR"
          className={`skipButtons ${isSkipRTilted ? 'tilted' : ''}`}
          src={process.env.PUBLIC_URL + '/media player components/skipr.png'}
          alt="Skip Right"
          onClick={nextTrack}
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
        />
        
        <img id="topS" className="skipButtons" src={process.env.PUBLIC_URL + '/media player components/topS.png'} alt="Button Image" style={{ pointerEvents: 'none' }} />
        <div className="skipButton-mask topS-mask"></div>
        
        <img id="bottomS" className="skipButtons" src={process.env.PUBLIC_URL + '/media player components/bottomS.png'} alt="Button Image" style={{ pointerEvents: 'none' }} />
        <div className="skipButton-mask bottomS-mask"></div>

        <p className="file-name">Select a folder to begin</p>
      </div>
    </div>
  );

  // Main player UI with loaded media files
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
          src={process.env.PUBLIC_URL + '/media player components/skipl.png'}
          alt="Skip Left"
          onClick={prevTrack}
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
        />
        
        <img 
          id="skipR"
          className={`skipButtons ${isSkipRTilted ? 'tilted' : ''}`}
          src={process.env.PUBLIC_URL + '/media player components/skipr.png'}
          alt="Skip Right"
          onClick={nextTrack}
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
        />
        
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
