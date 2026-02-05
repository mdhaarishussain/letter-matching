'use client';

import { useMemo, useRef, useState } from 'react';

const ALPHABETS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const ROUNDS_PER_LEVEL = 20;

function shuffle(list) {
  const cloned = [...list];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

function pickUnique(count) {
  return shuffle(ALPHABETS).slice(0, count);
}

function levelMeta(level) {
  if (level === 1) return { pairs: 1, title: 'Level 1 · Single Pair Practice', mode: 'practice' };
  if (level === 2) return { pairs: 5, title: 'Level 2 · Two Row Practice', mode: 'practice' };
  if (level === 3) return { pairs: 9, title: 'Level 3 · 3×3 Matrix Practice', mode: 'practice' };
  return { pairs: 6, title: 'Level 4 · Final Test (No Retry)', mode: 'test' };
}

function makeRounds(level) {
  const { pairs } = levelMeta(level);
  return Array.from({ length: ROUNDS_PER_LEVEL }, () => {
    const uppers = pickUnique(pairs);
    return {
      uppers,
      lowers: shuffle(uppers.map((item) => item.toLowerCase()))
    };
  });
}

function makeInitialState(level) {
  return {
    level,
    started: false,
    roundIndex: 0,
    rounds: makeRounds(level),
    selectedUpper: null,
    matchedUppers: [],
    failedUppers: [],
    score: { correct: 0, wrong: 0 },
    feedback: null,
    streak: 0
  };
}

function toneFor(upper, state) {
  if (state.matchedUppers.includes(upper)) return 'correct';
  if (state.failedUppers.includes(upper)) return 'wrong';
  if (state.selectedUpper === upper) return 'selected';
  if (state.feedback?.upper === upper) return state.feedback.result;
  return 'neutral';
}

function toneForLower(lower, state) {
  const upper = lower.toUpperCase();
  if (state.matchedUppers.includes(upper)) return 'correct';
  if (state.failedUppers.includes(upper)) return 'wrong';
  if (state.feedback?.lower === lower) return state.feedback.result;
  return 'neutral';
}

function createSound() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  return new AudioCtx();
}

function playTone(context, freq, duration, type = 'sine', gainValue = 0.06) {
  if (!context) return;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = gainValue;
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start();
  osc.stop(context.currentTime + duration);
}

export default function Home() {
  const [state, setState] = useState(() => makeInitialState(1));
  const [level, setLevel] = useState(1);
  const [showFinalScore, setShowFinalScore] = useState(false);
  const audioRef = useRef(null);

  const currentRound = useMemo(() => state.rounds[state.roundIndex], [state.roundIndex, state.rounds]);
  const isFinalTest = levelMeta(state.level).mode === 'test';

  const ensureAudio = async () => {
    if (!audioRef.current) {
      audioRef.current = createSound();
    }
    if (audioRef.current?.state === 'suspended') {
      await audioRef.current.resume();
    }
    return audioRef.current;
  };

  const soundClick = async () => {
    const ctx = await ensureAudio();
    playTone(ctx, 540, 0.06, 'triangle', 0.04);
  };

  const soundCorrect = async () => {
    const ctx = await ensureAudio();
    playTone(ctx, 660, 0.08, 'sine', 0.05);
    setTimeout(() => playTone(ctx, 860, 0.11, 'sine', 0.06), 80);
  };

  const soundWrong = async () => {
    const ctx = await ensureAudio();
    playTone(ctx, 220, 0.1, 'sawtooth', 0.05);
    setTimeout(() => playTone(ctx, 180, 0.12, 'sawtooth', 0.04), 90);
  };

  const switchLevel = (nextLevel) => {
    setLevel(nextLevel);
    setState(makeInitialState(nextLevel));
    setShowFinalScore(false);
  };

  const startActivity = () => {
    setState((prev) => ({
      ...makeInitialState(level),
      started: true
    }));
    setShowFinalScore(false);
  };

  const moveRoundIfDone = (nextState) => {
    const { pairs, mode } = levelMeta(nextState.level);
    const solvedCount = nextState.matchedUppers.length + (mode === 'test' ? nextState.failedUppers.length : 0);
    if (solvedCount < pairs) {
      return nextState;
    }

    if (nextState.roundIndex + 1 >= ROUNDS_PER_LEVEL) {
      return {
        ...nextState,
        started: false,
        roundIndex: ROUNDS_PER_LEVEL
      };
    }

    return {
      ...nextState,
      roundIndex: nextState.roundIndex + 1,
      selectedUpper: null,
      matchedUppers: [],
      failedUppers: [],
      feedback: null
    };
  };

  const onUpperSelect = async (upper) => {
    if (!state.started || !currentRound) return;
    if (state.matchedUppers.includes(upper) || state.failedUppers.includes(upper)) return;
    await soundClick();
    setState((prev) => ({ ...prev, selectedUpper: upper, feedback: null }));
  };

  const onLowerSelect = async (lower) => {
    if (!state.started || !currentRound || !state.selectedUpper) return;
    const upper = state.selectedUpper;
    const isCorrect = upper.toLowerCase() === lower;

    if (isCorrect) {
      await soundCorrect();
      setState((prev) => {
        const next = {
          ...prev,
          matchedUppers: [...prev.matchedUppers, upper],
          score: { ...prev.score, correct: prev.score.correct + 1 },
          streak: prev.streak + 1,
          selectedUpper: null,
          feedback: { result: 'correct', upper, lower }
        };
        return moveRoundIfDone(next);
      });
      return;
    }

    await soundWrong();
    setState((prev) => {
      const mode = levelMeta(prev.level).mode;
      const failedUppers = mode === 'test' ? [...prev.failedUppers, upper] : prev.failedUppers;
      const next = {
        ...prev,
        failedUppers,
        score: { ...prev.score, wrong: prev.score.wrong + 1 },
        streak: 0,
        selectedUpper: null,
        feedback: { result: 'wrong', upper, lower }
      };
      return moveRoundIfDone(next);
    });
  };

  const progressSlide = Math.min(state.roundIndex + (state.started ? 1 : 0), ROUNDS_PER_LEVEL);

  return (
    <main className="page premium">
      <header className="hero">
        <p className="pill">Student Practice Arena</p>
        <h1>Find my little brother</h1>
        <p className="subtitle">Choose uppercase first, then match lowercase. Learn with sounds and visual rewards.</p>
      </header>

      <section className="teacherPanel glass">
        <div>
          <h2>Choose a Level</h2>
          <p className="meta">Levels 1–3 are practice. Level 4 is final test mode with no retry per pair.</p>
        </div>
        <div className="levelGroup">
          {[1, 2, 3, 4].map((lv) => (
            <button key={lv} className={state.level === lv ? 'active' : ''} onClick={() => switchLevel(lv)}>
              {levelMeta(lv).title}
            </button>
          ))}
        </div>
        <button className="startBtn" onClick={startActivity}>Start Practice</button>
      </section>

      <section className="scoreboard glass">
        <span>Slides: {progressSlide} / {ROUNDS_PER_LEVEL}</span>
        <span className="ok">✅ Correct: {state.score.correct}</span>
        <span className="bad">❌ Wrong: {state.score.wrong}</span>
        <span>🔥 Streak: {state.streak}</span>
      </section>

      {!state.started && state.roundIndex < ROUNDS_PER_LEVEL && (
        <p className="hint">Tap Start Practice. In final test level, each uppercase gets only one chance.</p>
      )}

      {state.started && currentRound && (
        <section className="gameArea glass">
          <div className="instruction">Tap <strong>UPPERCASE</strong> first (blue halo), then matching lowercase.</div>

          <div className={state.level === 1 ? 'upperRow single' : state.level === 2 ? 'upperRow rowFive' : state.level === 3 ? 'upperRow grid3' : 'upperRow rowFive'}>
            {currentRound.uppers.map((upper) => (
              <button
                key={`u-${upper}`}
                className={`letterCard upper ${toneFor(upper, state)}`}
                onClick={() => onUpperSelect(upper)}
              >
                <span>{upper}</span>
                {toneFor(upper, state) === 'correct' && <em className="badge">✓</em>}
                {toneFor(upper, state) === 'wrong' && <em className="badge wrong">✕</em>}
              </button>
            ))}
          </div>

          <div className={state.level === 1 ? 'lowerRow single' : state.level === 2 ? 'lowerRow rowFive' : state.level === 3 ? 'lowerRow grid3' : 'lowerRow rowFive'}>
            {currentRound.lowers.map((lower) => (
              <button
                key={`l-${lower}`}
                className={`letterCard lower ${toneForLower(lower, state)}`}
                onClick={() => onLowerSelect(lower)}
              >
                <span>{lower}</span>
                {toneForLower(lower, state) === 'correct' && <em className="badge">✓</em>}
                {toneForLower(lower, state) === 'wrong' && <em className="badge wrong">✕</em>}
              </button>
            ))}
          </div>

          {state.feedback?.result === 'correct' && <p className="feedback good">🎉 Perfect match!</p>}
          {state.feedback?.result === 'wrong' && (
            <p className="feedback bad">
              {isFinalTest ? '❌ Final test: no retry for this letter.' : '❌ Not a match. Try again.'}
            </p>
          )}
        </section>
      )}

      {state.roundIndex >= ROUNDS_PER_LEVEL && !showFinalScore && (
        <section className="completeCard glass">
          <h3>{isFinalTest ? 'Final Test Complete 🏁' : 'Practice Complete 🎓'}</h3>
          <p>Total Correct: {state.score.correct}</p>
          <p>Total Wrong: {state.score.wrong}</p>
          <button onClick={() => setShowFinalScore(true)}>See Final Score Card</button>
        </section>
      )}

      {showFinalScore && (
        <section className="attemptPanel glass">
          <h3>Final Score Card</h3>
          <p><strong>Level:</strong> {levelMeta(state.level).title}</p>
          <p><strong>Accuracy:</strong> {Math.round((state.score.correct / Math.max(1, state.score.correct + state.score.wrong)) * 100)}%</p>
          <p><strong>Correct:</strong> {state.score.correct} | <strong>Wrong:</strong> {state.score.wrong}</p>
          <p className="muted">Tip: Replay earlier levels to improve speed and confidence before final test.</p>
        </section>
      )}
    </main>
  );
}
