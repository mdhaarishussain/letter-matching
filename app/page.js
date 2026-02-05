'use client';

import { useEffect, useMemo, useState } from 'react';

const ALPHABETS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const ROUNDS_PER_LEVEL = 20;
const ROOM_STATE_KEY = 'letter-room-state-v2';
const ROOM_ROLE_KEY = 'letter-room-roles-v2';
const CHANNEL_NAME = 'letter-room-channel-v2';

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

function makeRounds() {
  return {
    1: Array.from({ length: ROUNDS_PER_LEVEL }, () => {
      const target = pickUnique(1)[0];
      const distractor = pickUnique(2).find((item) => item !== target) || 'B';
      return {
        type: 'single',
        uppers: [target],
        lowers: shuffle([target.toLowerCase(), distractor.toLowerCase()])
      };
    }),
    2: Array.from({ length: ROUNDS_PER_LEVEL }, () => {
      const uppers = pickUnique(5);
      return {
        type: 'row5',
        uppers,
        lowers: shuffle(uppers.map((item) => item.toLowerCase()))
      };
    }),
    3: Array.from({ length: ROUNDS_PER_LEVEL }, () => {
      const uppers = pickUnique(9);
      return {
        type: 'matrix9',
        uppers,
        lowers: shuffle(uppers.map((item) => item.toLowerCase()))
      };
    })
  };
}

function initialRoomState() {
  return {
    level: 1,
    started: false,
    roundIndex: 0,
    rounds: makeRounds(),
    score: { correct: 0, wrong: 0 },
    selectedUpper: null,
    selectedLower: null,
    matchedUppers: [],
    flash: null,
    attempts: []
  };
}

function pairCount(level) {
  if (level === 1) return 1;
  if (level === 2) return 5;
  return 9;
}

function currentRound(state) {
  return state.rounds[state.level][state.roundIndex];
}

function moveToNextRound(state) {
  const total = state.rounds[state.level].length;
  if (state.roundIndex + 1 >= total) {
    return {
      ...state,
      started: false,
      roundIndex: total,
      selectedUpper: null,
      selectedLower: null,
      matchedUppers: [],
      flash: null
    };
  }

  return {
    ...state,
    roundIndex: state.roundIndex + 1,
    selectedUpper: null,
    selectedLower: null,
    matchedUppers: [],
    flash: null
  };
}

function applyAction(state, action) {
  if (action.type === 'SYNC') {
    return action.payload;
  }

  if (action.type === 'SWITCH_LEVEL') {
    return {
      ...state,
      level: action.level,
      started: false,
      roundIndex: 0,
      score: { correct: 0, wrong: 0 },
      selectedUpper: null,
      selectedLower: null,
      matchedUppers: [],
      flash: null,
      attempts: []
    };
  }

  if (action.type === 'START_ACTIVITY') {
    return {
      ...state,
      started: true,
      roundIndex: 0,
      rounds: makeRounds(),
      score: { correct: 0, wrong: 0 },
      selectedUpper: null,
      selectedLower: null,
      matchedUppers: [],
      flash: null,
      attempts: []
    };
  }

  if (!state.started) {
    return state;
  }

  const round = currentRound(state);
  if (!round) {
    return state;
  }

  if (action.type === 'SELECT_UPPER') {
    if (state.matchedUppers.includes(action.upper)) {
      return state;
    }

    return {
      ...state,
      selectedUpper: action.upper,
      selectedLower: null,
      flash: null
    };
  }

  if (action.type === 'SELECT_LOWER') {
    if (!state.selectedUpper) return state;

    const expected = state.selectedUpper.toLowerCase();
    const isCorrect = action.lower === expected;
    const now = Date.now();

    const base = {
      ...state,
      selectedLower: action.lower,
      flash: {
        upper: state.selectedUpper,
        lower: action.lower,
        result: isCorrect ? 'correct' : 'wrong',
        at: now
      },
      score: {
        correct: state.score.correct + (isCorrect ? 1 : 0),
        wrong: state.score.wrong + (isCorrect ? 0 : 1)
      },
      attempts: [
        {
          at: now,
          level: state.level,
          slide: state.roundIndex + 1,
          upper: state.selectedUpper,
          lower: action.lower,
          result: isCorrect ? 'correct' : 'wrong'
        },
        ...state.attempts
      ].slice(0, 18)
    };

    if (!isCorrect) {
      return {
        ...base,
        selectedUpper: null,
        selectedLower: null
      };
    }

    const updatedMatched = [...state.matchedUppers, state.selectedUpper];
    const complete = updatedMatched.length >= pairCount(state.level);

    if (complete) {
      return moveToNextRound({
        ...base,
        matchedUppers: updatedMatched
      });
    }

    return {
      ...base,
      selectedUpper: null,
      selectedLower: null,
      matchedUppers: updatedMatched
    };
  }

  return state;
}

function loadOrInitRole(clientId) {
  const raw = localStorage.getItem(ROOM_ROLE_KEY);
  const roles = raw ? JSON.parse(raw) : { teacher: null, student: null };

  if (roles.teacher === clientId) return 'teacher';
  if (roles.student === clientId) return 'student';

  if (!roles.teacher) {
    roles.teacher = clientId;
    localStorage.setItem(ROOM_ROLE_KEY, JSON.stringify(roles));
    return 'teacher';
  }

  if (!roles.student) {
    roles.student = clientId;
    localStorage.setItem(ROOM_ROLE_KEY, JSON.stringify(roles));
    return 'student';
  }

  return 'observer';
}

export default function Home() {
  const [clientId] = useState(() => `client-${Math.random().toString(36).slice(2, 9)}`);
  const [role, setRole] = useState('observer');
  const [state, setState] = useState(initialRoomState);

  useEffect(() => {
    const assigned = loadOrInitRole(clientId);
    setRole(assigned);

    const saved = localStorage.getItem(ROOM_STATE_KEY);
    const loadedState = saved ? JSON.parse(saved) : initialRoomState();
    setState(loadedState);
    if (!saved) localStorage.setItem(ROOM_STATE_KEY, JSON.stringify(loadedState));

    const channel = new BroadcastChannel(CHANNEL_NAME);
    const onStorage = (event) => {
      if (event.key === ROOM_STATE_KEY && event.newValue) {
        setState(JSON.parse(event.newValue));
      }
    };

    channel.onmessage = (event) => {
      if (event.data?.type === 'ROOM_STATE') {
        setState(event.data.payload);
      }
    };

    window.addEventListener('storage', onStorage);

    return () => {
      channel.close();
      window.removeEventListener('storage', onStorage);
    };
  }, [clientId]);

  useEffect(() => {
    if (!state.flash?.at) {
      return;
    }

    const timer = setTimeout(() => {
      const latestRaw = localStorage.getItem(ROOM_STATE_KEY);
      if (!latestRaw) {
        return;
      }

      const latest = JSON.parse(latestRaw);
      if (latest.flash?.at === state.flash.at) {
        const cleaned = { ...latest, flash: null };
        setState(cleaned);
        localStorage.setItem(ROOM_STATE_KEY, JSON.stringify(cleaned));
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channel.postMessage({ type: 'ROOM_STATE', payload: cleaned });
        channel.close();
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [state.flash]);

  const persist = (nextState) => {
    setState(nextState);
    localStorage.setItem(ROOM_STATE_KEY, JSON.stringify(nextState));
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage({ type: 'ROOM_STATE', payload: nextState });
    channel.close();
  };

  const dispatch = (action) => {
    if ((action.type === 'START_ACTIVITY' || action.type === 'SWITCH_LEVEL') && role !== 'teacher') {
      return;
    }

    if ((action.type === 'SELECT_UPPER' || action.type === 'SELECT_LOWER') && role !== 'student') {
      return;
    }

    const next = applyAction(state, action);
    persist(next);
  };

  const round = useMemo(() => {
    const rounds = state.rounds[state.level] || [];
    return rounds[state.roundIndex];
  }, [state]);

  const totalSlides = state.rounds[state.level]?.length ?? ROUNDS_PER_LEVEL;
  const ended = state.roundIndex >= totalSlides;

  const cardTone = (letter, kind) => {
    if (!round) return 'neutral';
    const normalized = kind === 'upper' ? letter : letter.toUpperCase();

    if (state.matchedUppers.includes(normalized)) return 'correct';
    if (state.flash && state.flash.at && Date.now() - state.flash.at < 900) {
      const hitUpper = kind === 'upper' && state.flash.upper === letter;
      const hitLower = kind === 'lower' && state.flash.lower === letter.toLowerCase();
      if (hitUpper || hitLower) {
        return state.flash.result;
      }
    }

    if (kind === 'upper' && state.selectedUpper === letter) return 'selected';
    return 'neutral';
  };

  return (
    <main className="page premium">
      <header className="hero">
        <p className="pill">Interactive Classroom Activity</p>
        <h1>Find my little brother</h1>
        <p className="subtitle">Premium uppercase ↔ lowercase matching for kindergarten learners</p>
      </header>

      <section className="teacherPanel glass">
        <div>
          <h2>Teacher Controls</h2>
          <p className="meta">Role: <strong>{role.toUpperCase()}</strong> (first joiner = teacher, second = student)</p>
        </div>
        <div className="levelGroup">
          <button className={state.level === 1 ? 'active' : ''} onClick={() => dispatch({ type: 'SWITCH_LEVEL', level: 1 })}>Level 1 · Single Pair</button>
          <button className={state.level === 2 ? 'active' : ''} onClick={() => dispatch({ type: 'SWITCH_LEVEL', level: 2 })}>Level 2 · Two Rows (5 pairs)</button>
          <button className={state.level === 3 ? 'active' : ''} onClick={() => dispatch({ type: 'SWITCH_LEVEL', level: 3 })}>Level 3 · 3×3 Matrix</button>
        </div>
        <button className="startBtn" onClick={() => dispatch({ type: 'START_ACTIVITY' })}>Start Activity</button>
      </section>

      <section className="scoreboard glass">
        <span>Slides: {Math.min(state.roundIndex + (state.started ? 1 : 0), totalSlides)} / {totalSlides}</span>
        <span className="ok">✅ Correct: {state.score.correct}</span>
        <span className="bad">❌ Wrong: {state.score.wrong}</span>
      </section>

      {!state.started && !ended && (
        <p className="hint">{role === 'teacher' ? 'Select level and start the activity.' : 'Wait for teacher to start, then tap uppercase and lowercase to match.'}</p>
      )}

      {state.started && round && !ended && (
        <section className="gameArea glass">
          <div className="instruction">Tap <strong>UPPERCASE</strong> first (blue halo), then tap matching lowercase.</div>

          <div className={state.level === 1 ? 'upperRow single' : state.level === 2 ? 'upperRow rowFive' : 'upperRow grid3'}>
            {round.uppers.map((upper) => (
              <button
                key={`u-${upper}`}
                className={`letterCard upper ${cardTone(upper, 'upper')}`}
                onClick={() => dispatch({ type: 'SELECT_UPPER', upper })}
              >
                <span>{upper}</span>
                {cardTone(upper, 'upper') === 'correct' && <em className="badge">✓</em>}
                {cardTone(upper, 'upper') === 'wrong' && <em className="badge wrong">✕</em>}
              </button>
            ))}
          </div>

          <div className={state.level === 1 ? 'lowerRow single' : state.level === 2 ? 'lowerRow rowFive' : 'lowerRow grid3'}>
            {round.lowers.map((lower) => (
              <button
                key={`l-${lower}`}
                className={`letterCard lower ${cardTone(lower, 'lower')}`}
                onClick={() => dispatch({ type: 'SELECT_LOWER', lower })}
              >
                <span>{lower}</span>
                {cardTone(lower, 'lower') === 'correct' && <em className="badge">✓</em>}
                {cardTone(lower, 'lower') === 'wrong' && <em className="badge wrong">✕</em>}
              </button>
            ))}
          </div>

          {state.flash?.result === 'correct' && <p className="feedback good">🎉 Perfect match!</p>}
          {state.flash?.result === 'wrong' && <p className="feedback bad">❌ Not a match. Try another pair.</p>}
        </section>
      )}

      {ended && (
        <section className="completeCard glass">
          <h3>Activity Complete 🎓</h3>
          <p>Total Correct: {state.score.correct}</p>
          <p>Total Wrong: {state.score.wrong}</p>
          {role === 'teacher' && <button onClick={() => dispatch({ type: 'START_ACTIVITY' })}>Run Again</button>}
        </section>
      )}

      <section className="attemptPanel glass">
        <h3>Teacher Live View · Student Attempts</h3>
        {state.attempts.length === 0 ? (
          <p className="muted">No attempts yet.</p>
        ) : (
          <ul>
            {state.attempts.map((item) => (
              <li key={`${item.at}-${item.upper}-${item.lower}`}>
                L{item.level} · Slide {item.slide}: {item.upper} → {item.lower} {' '}
                <strong className={item.result === 'correct' ? 'ok' : 'bad'}>{item.result}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
