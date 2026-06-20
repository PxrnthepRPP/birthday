/**
 * Happy Birthday Interactive App Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const introScreen = document.getElementById('intro-screen');
  const envelopeWrapper = document.getElementById('envelope-wrapper');
  const mainScreen = document.getElementById('main-screen');
  const topBar = document.getElementById('top-bar');
  const muteToggle = document.getElementById('mute-toggle');
  const musicIconPlaying = document.getElementById('music-icon-playing');
  const musicIconMuted = document.getElementById('music-icon-muted');
  
  const floatingPlayer = document.getElementById('floating-player');
  const playerDisc = document.getElementById('player-disc');
  const playerPlayBtn = document.getElementById('player-play-btn');
  const discPlayIcon = document.getElementById('disc-play-icon');
  const discPauseIcon = document.getElementById('disc-pause-icon');
  
  const openWishBtn = document.getElementById('open-wish-btn');
  const wishModal = document.getElementById('wish-modal');
  const closeWishBtn = document.getElementById('close-wish-btn');
  const wishTextarea = document.getElementById('wish-textarea');
  const blowCandlesBtn = document.getElementById('blow-candles-btn');
  const micInstructionText = document.getElementById('mic-instruction-text');
  
  const flame1 = document.getElementById('flame-1');
  const flame2 = document.getElementById('flame-2');

  // Application State
  let musicPlaying = false;
  let synthInitialized = false;
  let audioCtx = null;
  let synthInterval = null;
  let micStream = null;
  let micAudioContext = null;
  let micAnalyser = null;
  let micAnimationId = null;
  let candlesBlown = false;

  /* ----------------------------------------------------
   * 1. Canvas Particle Background (Floating Hearts/Stars)
   * ---------------------------------------------------- */
  const pCanvas = document.getElementById('particle-canvas');
  const pCtx = pCanvas.getContext('2d');
  let particles = [];

  function resizeCanvas() {
    pCanvas.width = window.innerWidth;
    pCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  class Particle {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * pCanvas.width;
      this.y = initial ? Math.random() * pCanvas.height : pCanvas.height + 20;
      this.size = Math.random() * 8 + 6;
      this.speedY = -(Math.random() * 0.8 + 0.4);
      this.speedX = Math.sin(Math.random() * Math.PI) * 0.3;
      this.type = Math.random() > 0.45 ? 'heart' : 'star';
      // Gentle shades of warm red/pink/gold
      this.color = this.type === 'heart' 
        ? `rgba(${Math.floor(Math.random() * 60 + 195)}, ${Math.floor(Math.random() * 40 + 90)}, ${Math.floor(Math.random() * 50 + 100)}, ${Math.random() * 0.4 + 0.15})`
        : `rgba(${Math.floor(Math.random() * 30 + 225)}, ${Math.floor(Math.random() * 30 + 200)}, 150, ${Math.random() * 0.35 + 0.1})`;
      this.wobble = Math.random() * 100;
      this.wobbleSpeed = Math.random() * 0.02 + 0.005;
    }

    update() {
      this.y += this.speedY;
      this.wobble += this.wobbleSpeed;
      this.x += this.speedX + Math.sin(this.wobble) * 0.25;

      if (this.y < -20 || this.x < -20 || this.x > pCanvas.width + 20) {
        this.reset(false);
      }
    }

    draw() {
      pCtx.fillStyle = this.color;
      if (this.type === 'heart') {
        // Draw Heart Shape
        pCtx.beginPath();
        const d = this.size;
        const x = this.x;
        const y = this.y;
        pCtx.moveTo(x, y + d / 4);
        pCtx.quadraticCurveTo(x, y, x + d / 2, y);
        pCtx.quadraticCurveTo(x + d, y, x + d, y + d / 3);
        pCtx.quadraticCurveTo(x + d, y + (d * 2) / 3, x + d / 2, y + d);
        pCtx.quadraticCurveTo(x, y + (d * 2) / 3, x, y + d / 3);
        pCtx.quadraticCurveTo(x, y, x, y + d / 4);
        pCtx.closePath();
        pCtx.fill();
      } else {
        // Draw Star/Sparkle
        pCtx.beginPath();
        pCtx.arc(this.x, this.y, this.size / 3, 0, Math.PI * 2);
        pCtx.closePath();
        pCtx.fill();
      }
    }
  }

  // Create initial particle pool
  const maxParticles = Math.min(60, Math.floor(window.innerWidth / 15));
  for (let i = 0; i < maxParticles; i++) {
    particles.push(new Particle());
  }

  function animateParticles() {
    pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
    particles.forEach(p => {
      p.update();
      p.draw();
    });
    requestAnimationFrame(animateParticles);
  }
  animateParticles();

  /* ----------------------------------------------------
   * 2. Web Audio Synthesizer (Music Box Engine)
   * ---------------------------------------------------- */
  // Loops a beautiful ambient chord progression (Cmaj7 -> Am9 -> Fmaj7 -> G6)
  // Synthesized sounds mimic a romantic wooden music box with echoes.
  function initMusicBox() {
    if (synthInitialized) return;
    
    // Create AudioContext (fallback for older browsers)
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    
    // Create a delay/echo module for spacey ambient effect
    const delay = audioCtx.createDelay(1.0);
    const feedback = audioCtx.createGain();
    
    delay.delayTime.value = 0.38; // 380ms echo
    feedback.gain.value = 0.42;   // Echo volume feedback decay
    
    // Connect delay loop
    delay.connect(feedback);
    feedback.connect(delay);
    
    // Main output volume node
    const mainVolume = audioCtx.createGain();
    mainVolume.gain.setValueAtTime(0.5, audioCtx.currentTime);
    
    // Route elements: Synth -> mainVolume & delay -> Speaker
    delay.connect(mainVolume);
    mainVolume.connect(audioCtx.destination);

    // Music Box Note Player
    function playNote(freq, time, duration = 1.8) {
      if (!audioCtx || audioCtx.state === 'suspended') return;

      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = 'triangle'; // Smooth sweet tone
      osc.frequency.setValueAtTime(freq, time);
      
      // Music box pluck style envelope (ADSR)
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(0.35, time + 0.01); // Quick pluck attack
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration); // Long ring release
      
      osc.connect(gainNode);
      gainNode.connect(mainVolume);
      gainNode.connect(delay); // Send to echo channel
      
      osc.start(time);
      osc.stop(time + duration);
    }

    // Chord progressions with frequencies (Hz)
    // Cmaj7 arpeggio (C4, E4, G4, B4, C5, E5)
    // Am9 arpeggio (A3, C4, E4, G4, B4, C5, E5)
    // Fmaj7 arpeggio (F3, A3, C4, E4, G4, A4, C5)
    // G6 arpeggio (G3, B3, D4, G4, B4, D5, G5)
    
    const chords = [
      [261.63, 329.63, 392.00, 493.88, 523.25, 659.25], // Cmaj7
      [220.00, 261.63, 329.63, 392.00, 493.88, 523.25], // Am9
      [174.61, 220.00, 261.63, 329.63, 392.00, 440.00], // Fmaj7
      [196.00, 246.94, 293.66, 392.00, 493.88, 587.33]  // G6
    ];

    let chordIndex = 0;
    let noteIndex = 0;
    const noteInterval = 0.4; // seconds between notes in arpeggios
    
    function scheduler() {
      const scheduleAheadTime = 0.1;
      let nextNoteTime = audioCtx.currentTime;

      synthInterval = setInterval(() => {
        while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
          const chordNotes = chords[chordIndex];
          
          // Pattern logic: Arpeggiate up and down, occasionally adding sweet high notes
          let noteFreq = chordNotes[noteIndex % chordNotes.length];
          
          // Introduce light randomized high spark note representing stars
          if (Math.random() > 0.8) {
            // Play a high octave harmonic
            playNote(noteFreq * 2, nextNoteTime, 0.8);
          } else {
            playNote(noteFreq, nextNoteTime, 1.8);
          }

          nextNoteTime += noteInterval;
          noteIndex++;

          // Move to next chord after arpeggiating a full bar (8 notes)
          if (noteIndex % 8 === 0) {
            chordIndex = (chordIndex + 1) % chords.length;
            noteIndex = 0;
          }
        }
      }, 50);
    }

    scheduler();
    synthInitialized = true;
    window.synthAudioVolumeNode = mainVolume; // Save reference to toggle sound
  }

  // Toggle synthesized music state
  function toggleMusic(play) {
    if (play) {
      if (!synthInitialized) {
        initMusicBox();
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      document.body.classList.add('music-playing');
      musicIconPlaying.classList.remove('hidden');
      musicIconMuted.classList.add('hidden');
      discPauseIcon.classList.remove('hidden');
      discPlayIcon.classList.add('hidden');
      playerDisc.style.animationPlayState = 'running';
      musicPlaying = true;
    } else {
      if (audioCtx && audioCtx.state === 'running') {
        audioCtx.suspend();
      }
      document.body.classList.remove('music-playing');
      musicIconPlaying.classList.add('hidden');
      musicIconMuted.classList.remove('hidden');
      discPauseIcon.classList.add('hidden');
      discPlayIcon.classList.remove('hidden');
      playerDisc.style.animationPlayState = 'paused';
      musicPlaying = false;
    }
  }

  /* ----------------------------------------------------
   * 3. Envelope Landing Screen Transitions
   * ---------------------------------------------------- */
  envelopeWrapper.addEventListener('click', () => {
    // Open envelope
    envelopeWrapper.classList.add('open');

    // Smooth page transitions after folding animation completed
    setTimeout(() => {
      // Fade out landing
      introScreen.classList.add('fade-out');
      
      // Reveal main site structure
      mainScreen.classList.remove('hidden');
      topBar.classList.remove('hidden');
      floatingPlayer.classList.remove('hidden');

      // Initialize music context (User interaction block cleared)
      toggleMusic(true);
      
      // Trigger subtle celebratory mini-confetti burst
      createConfettiBurst(25);
      
      // Trigger scroll checks to show visible components on reveal
      checkScrollReveal();
    }, 1100);
  });

  /* ----------------------------------------------------
   * 4. Sync Music Buttons
   * ---------------------------------------------------- */
  muteToggle.addEventListener('click', () => {
    toggleMusic(!musicPlaying);
  });

  playerPlayBtn.addEventListener('click', () => {
    toggleMusic(!musicPlaying);
  });

  /* ----------------------------------------------------
   * 5. Scroll Fade-in Reveal Engine
   * ---------------------------------------------------- */
  const scrollElements = document.querySelectorAll('.animate-scroll-fade');
  
  function checkScrollReveal() {
    const triggerBottom = (window.innerHeight / 5) * 4;
    
    scrollElements.forEach(el => {
      const boxTop = el.getBoundingClientRect().top;
      
      if (boxTop < triggerBottom) {
        el.classList.add('visible');
      }
    });
  }

  window.addEventListener('scroll', checkScrollReveal);

  /* ----------------------------------------------------
   * 6. Confetti Physics Engine (Canvas Renderer)
   * ---------------------------------------------------- */
  const cCanvas = document.getElementById('confetti-canvas');
  const cCtx = cCanvas.getContext('2d');
  let confettiParticles = [];
  let confettiLoopActive = false;

  function resizeConfettiCanvas() {
    cCanvas.width = window.innerWidth;
    cCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeConfettiCanvas);
  resizeConfettiCanvas();

  class Confetti {
    constructor(x, y, isBurst = false) {
      this.x = x;
      this.y = y;
      this.size = Math.random() * 6 + 5;
      
      // Initial velocity vector
      if (isBurst) {
        // Explode upwards and outwards
        const angle = Math.random() * Math.PI - Math.PI; // -180 to 0 deg
        const speed = Math.random() * 12 + 5;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - 5; // Extra vertical boost
      } else {
        // Standard fall
        this.vx = Math.random() * 4 - 2;
        this.vy = Math.random() * 5 + 3;
      }

      this.gravity = 0.28;
      this.friction = 0.985;
      this.rotation = Math.random() * Math.PI;
      this.rotationSpeed = Math.random() * 0.1 + 0.05;
      
      // Bright celebratory colors
      const colors = ['#ff477e', '#ff7096', '#ff85a1', '#fbb1bd', '#f9bec7', '#ffb5a7', '#ffd6ff', '#fcd5ce', '#ffd166', '#a8dadc'];
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.shape = Math.random() > 0.4 ? 'rect' : 'circle';
    }

    update() {
      this.vy += this.gravity;
      this.vx *= this.friction;
      this.vy *= this.friction;
      this.x += this.vx;
      this.y += this.vy;
      this.rotation += this.rotationSpeed;
    }

    draw() {
      cCtx.save();
      cCtx.translate(this.x, this.y);
      cCtx.rotate(this.rotation);
      cCtx.fillStyle = this.color;
      
      if (this.shape === 'rect') {
        cCtx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size * 1.5);
      } else {
        cCtx.beginPath();
        cCtx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        cCtx.fill();
      }
      cCtx.restore();
    }
  }

  function createConfettiBurst(count, sourceX = null, sourceY = null) {
    const x = sourceX || window.innerWidth / 2;
    const y = sourceY || window.innerHeight + 10;
    
    for (let i = 0; i < count; i++) {
      confettiParticles.push(new Confetti(x, y, true));
    }
    
    if (!confettiLoopActive) {
      confettiLoopActive = true;
      animateConfetti();
    }
  }

  function animateConfetti() {
    cCtx.clearRect(0, 0, cCanvas.width, cCanvas.height);
    
    confettiParticles.forEach((p, idx) => {
      p.update();
      p.draw();
      
      // Remove off-screen particles
      if (p.y > cCanvas.height + 20 || p.x < -20 || p.x > cCanvas.width + 20) {
        confettiParticles.splice(idx, 1);
      }
    });

    if (confettiParticles.length > 0) {
      requestAnimationFrame(animateConfetti);
    } else {
      confettiLoopActive = false;
      cCtx.clearRect(0, 0, cCanvas.width, cCanvas.height);
    }
  }

  /* ----------------------------------------------------
   * 7. Interactive Wish Modal & Candle Blowout Logic
   * ---------------------------------------------------- */
  
  // Open modal
  openWishBtn.addEventListener('click', () => {
    wishModal.classList.add('open');
    setupMicrophoneDetection();
  });

  // Close modal
  function closeModal() {
    wishModal.classList.remove('open');
    stopMicrophoneDetection();
  }
  
  closeWishBtn.addEventListener('click', closeModal);
  
  // Save wish to local storage when closing or typing
  wishTextarea.addEventListener('input', () => {
    localStorage.setItem('birthday_wish', wishTextarea.value);
  });

  // Load previous wish if exists
  const savedWish = localStorage.getItem('birthday_wish');
  if (savedWish) {
    wishTextarea.value = savedWish;
  }

  // Blowout candles handler
  function blowOutCandles() {
    if (candlesBlown) return;
    candlesBlown = true;

    // Extinguish flames
    flame1.classList.add('blown-out');
    flame2.classList.add('blown-out');
    
    // Play sweet synthesized celebratory chime
    playCelebrationChime();

    // Trigger colorful heavy confetti explosions from multiple locations
    setTimeout(() => {
      createConfettiBurst(70, window.innerWidth * 0.2, window.innerHeight * 0.8);
      createConfettiBurst(70, window.innerWidth * 0.8, window.innerHeight * 0.8);
      createConfettiBurst(100, window.innerWidth * 0.5, window.innerHeight * 0.7);
    }, 150);

    // Update instruction text in modal
    micInstructionText.textContent = "เป่าเทียนเรียบร้อยแล้ว! คำอธิษฐานของคุณได้รับการบันทึกแล้ว 🎉";
    micInstructionText.style.color = "#a45362";
    micInstructionText.style.fontWeight = "bold";

    // Auto close modal with delayed transition
    setTimeout(() => {
      closeModal();
      
      // Display a beautiful message card on the screen
      const wishInvitationSec = document.querySelector('.wish-invitation-section');
      wishInvitationSec.innerHTML = `
        <h2 class="wish-title animate-pulse-glow" style="color: #ffb8c6; font-size: 2.5rem;">🎉 เป่าเทียนฉลองวันเกิดเรียบร้อยแล้ว 🎉</h2>
        <p class="wish-subtitle" style="font-size: 1.2rem; color: #fbeee0; margin-top: 15px;">ขอให้สมหวังในทุกๆ ประการนะคนดี! ความฝันของคุณจะถูกเก็บรักษาไว้อย่างปลอดภัยตลอดไป 💖</p>
        <div style="font-size: 4rem; margin-top: 20px; animation: bounce-gentle 3s infinite;">🎂✨🧁</div>
      `;
    }, 3000);
  }

  // Button fallback trigger
  blowCandlesBtn.addEventListener('click', blowOutCandles);

  /* ----------------------------------------------------
   * 8. Web Audio Microphone Volume Blow Detection
   * ---------------------------------------------------- */
  function setupMicrophoneDetection() {
    if (candlesBlown) return;

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          micStream = stream;
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          micAudioContext = new AudioContextClass();
          
          const source = micAudioContext.createMediaStreamSource(stream);
          micAnalyser = micAudioContext.createAnalyser();
          micAnalyser.fftSize = 256;
          
          source.connect(micAnalyser);
          
          const bufferLength = micAnalyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          
          // Let the user know the mic is active
          micInstructionText.textContent = "ไมโครโฟนทำงานอยู่ ลองเป่าลมใส่ไมค์ของคุณ หรือคลิกปุ่มด้านล่าง";
          micInstructionText.style.color = "#497d59"; // Gentle green
          
          function checkBlow() {
            if (candlesBlown) return;
            
            micAnalyser.getByteFrequencyData(dataArray);
            
            // Calculate total energy / volume
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const averageVolume = sum / bufferLength;

            // Blow detection: checking higher frequencies (wind/blowing sound)
            // or simply a very high sound volume threshold
            if (averageVolume > 85) { // Threshold for blow
              blowOutCandles();
              stopMicrophoneDetection();
            } else {
              micAnimationId = requestAnimationFrame(checkBlow);
            }
          }
          
          checkBlow();
        })
        .catch(err => {
          console.warn("Microphone access denied or unavailable. Fallback to click button.", err);
          micInstructionText.textContent = "คลิกปุ่มด้านล่างเพื่อเป่าเทียน";
        });
    } else {
      micInstructionText.textContent = "คลิกปุ่มด้านล่างเพื่อเป่าเทียน";
    }
  }

  function stopMicrophoneDetection() {
    if (micAnimationId) {
      cancelAnimationFrame(micAnimationId);
      micAnimationId = null;
    }
    if (micStream) {
      micStream.getTracks().forEach(track => track.stop());
      micStream = null;
    }
    if (micAudioContext) {
      micAudioContext.close();
      micAudioContext = null;
    }
  }

  // Celebratory synthetic chime when blowing out candles
  function playCelebrationChime() {
    if (!audioCtx) return;
    
    const now = audioCtx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Sweet sweeping chord)
    
    notes.forEach((freq, index) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.08);
      
      gainNode.gain.setValueAtTime(0, now + index * 0.08);
      gainNode.gain.linearRampToValueAtTime(0.2, now + index * 0.08 + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.6);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start(now + index * 0.08);
      osc.stop(now + index * 0.08 + 0.6);
    });
  }
});
