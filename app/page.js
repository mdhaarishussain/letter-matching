'use client';

import { useMemo, useState } from 'react';

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

function createLevelOneRounds() {
  return Array.from({ length: ROUNDS_PER_LEVEL }, () => {
    const target = ALPHABETS[Math.floor(Math.random() * ALPHABETS.length)];
    const distractor = shuffle(ALPHABETS.filter((letter) => letter !== target))[0];
    const options = shuffle([target.toLowerCase(), distractor.toLowerCase()]);

    return {
      type: 'tap',
      target,
      options
    };
  });
}

function createLevelTwoRounds() {
  return Array.from({ length: ROUNDS_PER_LEVEL }, () => {
    const row = shuffle(ALPHABETS).slice(0, 6);
    const target = row[Math.floor(Math.random() * row.length)];
    return {
      type: 'row',
      target,
      row: shuffle(row)
    };
  });
}

function buildRounds(level) {
  return level === 1 ? createLevelOneRounds() : createLevelTwoRounds();
}

export default function Home() {
  const [level, setLevel] = useState(1);
  const [started, setStarted] = useState(false);
  const [roundIndex, setRoundIndex] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [selectedLower, setSelectedLower] = useState(null);
  const [activityKey, setActivityKey] = useState(0);

  const rounds = useMemo(() => buildRounds(level), [level, activityKey]);
  const currentRound = rounds[roundIndex];
  const isFinished = roundIndex >= rounds.length;

  const startActivity = () => {
    setStarted(true);
    setRoundIndex(0);
    setFeedback(null);
    setScore({ correct: 0, wrong: 0 });
    setSelectedLower(null);
    setActivityKey((prev) => prev + 1);
  };

  const handleCorrect = () => {
    setFeedback('correct');
    setScore((prev) => ({ ...prev, correct: prev.correct + 1 }));
    setTimeout(() => {
      setFeedback(null);
      setSelectedLower(null);
      setRoundIndex((prev) => prev + 1);
    }, 700);
  };

  const handleWrong = () => {
    setFeedback('wrong');
    setScore((prev) => ({ ...prev, wrong: prev.wrong + 1 }));
    setTimeout(() => {
      setFeedback(null);
      setSelectedLower(null);
    }, 600);
  };

  const handleTapChoice = (letter) => {
    if (feedback || isFinished) {
      return;
    }

    if (letter === currentRound.target.toLowerCase()) {
      handleCorrect();
    } else {
      handleWrong();
    }
  };

  const handleRowChoice = (lowercase) => {
    if (feedback || isFinished) {
      return;
    }

    setSelectedLower(lowercase);
    if (lowercase.toUpperCase() === currentRound.target) {
      handleCorrect();
    } else {
      handleWrong();
    }
  };

  const switchLevel = (newLevel) => {
    setLevel(newLevel);
    setStarted(false);
    setFeedback(null);
    setRoundIndex(0);
    setScore({ correct: 0, wrong: 0 });
    setSelectedLower(null);
  };

  return (
    <main className="page">
      <header className="topBar">
        <h1>Find my little brother</h1>
        <p>Uppercase ↔ lowercase matching game for kindergarten kids</p>
      </header>

      <section className="teacherPanel">
        <h2>Teacher Controls</h2>
        <div className="levelGroup">
          <button className={level === 1 ? 'active' : ''} onClick={() => switchLevel(1)}>
            Level 1 - Simple Tap
          </button>
          <button className={level === 2 ? 'active' : ''} onClick={() => switchLevel(2)}>
            Level 2 - Scrambled Row
          </button>
        </div>
        <button className="startBtn" onClick={startActivity}>Start Activity</button>
      </section>

      <section className="scoreboard">
        <span>Slides: {Math.min(roundIndex + (started ? 1 : 0), ROUNDS_PER_LEVEL)} / {ROUNDS_PER_LEVEL}</span>
        <span className="ok">✅ Correct: {score.correct}</span>
        <span className="bad">❌ Wrong: {score.wrong}</span>
      </section>

      {!started && <p className="hint">Select a level and press <strong>Start Activity</strong> to begin.</p>}

      {started && !isFinished && (
        <section className={`gameArea ${feedback ?? ''}`}>
          <article className="targetCard">{currentRound.target}</article>

          {currentRound.type === 'tap' ? (
            <div className="choices twoCol">
              {currentRound.options.map((option) => (
                <button key={option} className="letterCard" onClick={() => handleTapChoice(option)}>
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <div className="choices rowWrap">
              {currentRound.row.map((option) => (
                <button
                  key={option}
                  className={`letterCard ${selectedLower === option.toLowerCase() ? 'selected' : ''}`}
                  onClick={() => handleRowChoice(option.toLowerCase())}
                >
                  {option.toLowerCase()}
                </button>
              ))}
            </div>
          )}

          {feedback === 'correct' && <p className="feedback good">🎉 Yay! Great matching!</p>}
          {feedback === 'wrong' && <p className="feedback bad">🌈 Oops! Try again.</p>}
        </section>
      )}

      {started && isFinished && (
        <section className="completeCard">
          <h3>Activity Complete 🎓</h3>
          <p>Correct: {score.correct}</p>
          <p>Wrong: {score.wrong}</p>
          <button onClick={startActivity}>Play Again</button>
        </section>
      )}
    </main>
  );
}
