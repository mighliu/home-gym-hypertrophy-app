import { EXERCISE_DB } from "../data/database";

export default function SwapModal({
  isOpen,
  onClose,
  pattern,
  currentExercise,
  onSwap
}) {
  if (!isOpen) return null;

  const patternData = EXERCISE_DB[pattern];
  const exercises = patternData ? patternData.exercises : [];

  const handleSelect = (ex) => {
    onSwap(ex);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="modal-badge">{pattern.toUpperCase()}</span>
            <h3 className="modal-title">Swap Exercise</h3>
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <p className="modal-instruction">
            Select an alternative exercise for this slot. Equipment settings, divisors, and rep ranges will adjust automatically.
          </p>
          <div className="exercise-options">
            {exercises.map((ex, idx) => {
              const isCurrent = ex === currentExercise;
              return (
                <button
                  key={ex}
                  className={`exercise-option-btn ${isCurrent ? "active" : ""}`}
                  onClick={() => handleSelect(ex)}
                >
                  <div className="option-info">
                    <span className="option-name">{ex}</span>
                    {idx === 0 && <span className="default-pill">Option 1 (Default)</span>}
                    {isCurrent && <span className="active-pill">Active</span>}
                  </div>
                  <span className="select-arrow">&rarr;</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .modal-instruction {
          font-size: 0.85rem;
          color: var(--color-text-muted);
          margin-bottom: 1.25rem;
          line-height: 1.4;
        }
        .exercise-options {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          max-height: 300px;
          overflow-y: auto;
          padding-right: 0.25rem;
        }
        .exercise-option-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--bg-input);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 0.9rem 1.2rem;
          color: var(--color-text-main);
          text-align: left;
          cursor: pointer;
          transition: var(--transition);
          font-family: var(--font-family);
        }
        .exercise-option-btn:hover {
          background: color-mix(in srgb, var(--color-primary) 8%, transparent);
          border-color: var(--color-primary);
        }
        .exercise-option-btn.active {
          background: color-mix(in srgb, var(--color-primary) 12%, transparent);
          border-color: var(--color-primary);
        }
        .option-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .option-name {
          font-weight: 600;
          font-size: 0.95rem;
        }
        .default-pill, .active-pill {
          align-self: flex-start;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .default-pill {
          background: color-mix(in srgb, var(--color-text-muted) 12%, transparent);
          color: var(--color-text-muted);
        }
        .active-pill {
          background: color-mix(in srgb, var(--color-secondary) 15%, transparent);
          color: var(--color-secondary);
        }
        .select-arrow {
          font-size: 1.1rem;
          color: var(--color-text-muted);
          transition: var(--transition);
        }
        .exercise-option-btn:hover .select-arrow {
          color: var(--color-primary);
          transform: translateX(3px);
        }
      ` }} />
    </div>
  );
}
