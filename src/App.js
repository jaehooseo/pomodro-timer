import { useState, useEffect, useRef } from 'react';
import './App.css';

const MODES = {
  focus: { label: '집중', time: 25 * 60, color: '#ef4444' },
  short: { label: '짧은 휴식', time: 5 * 60, color: '#22c55e' },
  long: { label: '긴 휴식', time: 15 * 60, color: '#3b82f6' },
};

const RADIUS = 130;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function App() {
  const [mode, setMode] = useState('focus');
  const [timeLeft, setTimeLeft] = useState(MODES.focus.time);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [task, setTask] = useState('');
  const [animate, setAnimate] = useState(true);
  const intervalRef = useRef(null);
  const endTimeRef = useRef(null);

  const playAlarm = () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    const notes = [
      { freq: 523.25, start: 0,   duration: 0.8 },
      { freq: 659.25, start: 0.5, duration: 0.8 },
      { freq: 783.99, start: 1.0, duration: 0.8 },
      { freq: 1046.5, start: 1.5, duration: 1.5 },
    ];

    notes.forEach(({ freq, start, duration }) => {
      [1, 2].forEach((harmonic) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = ctx.currentTime + start;

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = harmonic === 1 ? 'sine' : 'triangle';
        osc.frequency.value = freq * (harmonic === 1 ? 1 : 0.5);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(harmonic === 1 ? 0.4 : 0.15, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        osc.start(t);
        osc.stop(t + duration);
      });
    });
  };

  const totalTime = MODES[mode].time;
  const progress = timeLeft / totalTime;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  useEffect(() => {
    if (isRunning) {
      endTimeRef.current = Date.now() + timeLeft * 1000;
      intervalRef.current = setInterval(() => {
        const remaining = Math.ceil((endTimeRef.current - Date.now()) / 1000);
        if (remaining <= 0) {
          clearInterval(intervalRef.current);
          setIsRunning(false);
          if (mode === 'focus') setSessions(s => s + 1);
          setTimeLeft(0);
          playAlarm();
        } else {
          setTimeLeft(remaining);
        }
      }, 500);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, mode]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isRunning) {
        setAnimate(false);
        const remaining = Math.ceil((endTimeRef.current - Date.now()) / 1000);
        setTimeLeft(remaining > 0 ? remaining : 0);
        requestAnimationFrame(() => setAnimate(true));
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  const switchMode = (newMode) => {
    setMode(newMode);
    setTimeLeft(MODES[newMode].time);
    setIsRunning(false);
  };

  const reset = () => {
    setTimeLeft(MODES[mode].time);
    setIsRunning(false);
  };

  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const seconds = String(timeLeft % 60).padStart(2, '0');
  const color = MODES[mode].color;

  return (
    <div className="app">
      <div className="card">
        <h1 className="title">Pomodoro</h1>

        <div className="mode-buttons">
          {Object.entries(MODES).map(([key, val]) => (
            <button
              key={key}
              className={`mode-btn ${mode === key ? 'active' : ''}`}
              style={mode === key ? { backgroundColor: val.color } : {}}
              onClick={() => switchMode(key)}
            >
              {val.label}
            </button>
          ))}
        </div>

        <div className="ring-wrapper">
          <svg width="300" height="300" className="ring-svg">
            <circle cx="150" cy="150" r={RADIUS} className="ring-bg" />
            <circle
              cx="150"
              cy="150"
              r={RADIUS}
              className="ring-progress"
              style={{
                stroke: color,
                strokeDasharray: CIRCUMFERENCE,
                strokeDashoffset,
                transition: animate ? 'stroke-dashoffset 0.8s ease, stroke 0.5s ease' : 'stroke 0.5s ease',
              }}
            />
          </svg>
          <div className="ring-inner">
            <div className="timer">{minutes}:{seconds}</div>
            <div className="task-label">{task || '작업 없음'}</div>
          </div>
        </div>

        <input
          className="task-input"
          type="text"
          placeholder="어떤 작업을 하시나요?"
          maxLength={40}
          value={task}
          onChange={e => setTask(e.target.value)}
        />

        <div className={`controls ${timeLeft === 0 ? 'done' : ''}`}>
          <button
            className="btn-reset"
            style={timeLeft === 0 ? { backgroundColor: color, color: 'white', borderColor: color } : {}}
            onClick={reset}
          >
            리셋
          </button>
          <button
            className="btn-start"
            style={{
              backgroundColor: color,
              flex: timeLeft === 0 ? '0 0 0' : undefined,
              padding: timeLeft === 0 ? '0' : undefined,
              minWidth: 0,
              opacity: timeLeft === 0 ? 0 : 1,
              overflow: 'hidden',
              transition: 'flex 0.4s ease, padding 0.4s ease, opacity 0.3s ease',
            }}
            onClick={() => setIsRunning(r => !r)}
            disabled={timeLeft === 0}
          >
            {isRunning ? '일시정지' : '시작'}
          </button>
        </div>

        <div className="sessions">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className={`dot ${i < sessions % 4 ? 'filled' : ''}`} style={i < sessions % 4 ? { backgroundColor: color } : {}} />
          ))}
          <span className="sessions-text">세션 {sessions}회 완료</span>
        </div>
      </div>
    </div>
  );
}

export default App;
