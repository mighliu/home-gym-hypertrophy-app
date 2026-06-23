import { EXERCISE_DB, getExerciseMuscleSimilarity, EXERCISE_MUSCLES } from "../data/database";

export default function SwapModal({
  isOpen,
  onClose,
  pattern,
  currentExercise,
  onSwap
}) {
  if (!isOpen) return null;

  const patternData = EXERCISE_DB[pattern];
  const rawExercises = patternData ? patternData.exercises : [];

  // Calculate similarity for each alternative exercise
  const exercisesWithScores = rawExercises.map((ex) => {
    const similarity = getExerciseMuscleSimilarity(currentExercise, ex);
    const muscles = EXERCISE_MUSCLES[ex] || { primary: [], secondary: [] };
    return {
      name: ex,
      similarity,
      muscles
    };
  });

  // Sort by similarity descending
  exercisesWithScores.sort((a, b) => b.similarity - a.similarity);

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
            Select an alternative exercise for this slot. Alternatives are ranked by muscle activation profile similarity.
          </p>
          <div className="exercise-options">
            {exercisesWithScores.map((item) => {
              const ex = item.name;
              const isCurrent = ex === currentExercise;
              const primaryTags = item.muscles.primary.slice(0, 2);
              
              return (
                <button
                  key={ex}
                  className={`exercise-option-btn ${isCurrent ? "active" : ""}`}
                  onClick={() => handleSelect(ex)}
                >
                  <div className="option-info">
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span className="option-name">{ex}</span>
                      {ex === rawExercises[0] && <span className="default-pill">Default</span>}
                      {isCurrent && <span className="active-pill">Active</span>}
                      <span className={`match-badge ${item.similarity >= 85 ? "high-match" : "mid-match"}`}>
                        {item.similarity}% Match
                      </span>
                    </div>
                    {primaryTags.length > 0 && (
                      <div className="option-muscle-tags">
                        {primaryTags.map(m => (
                          <span key={m} className="muscle-tag">{m}</span>
                        ))}
                      </div>
                    )}
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
          max-height: 320px;
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
          gap: 0.35rem;
        }
        .option-name {
          font-weight: 600;
          font-size: 0.95rem;
        }
        .default-pill, .active-pill, .match-badge {
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
        .match-badge {
          border: 1px solid transparent;
        }
        .match-badge.high-match {
          background: rgba(0, 242, 254, 0.08);
          border-color: rgba(0, 242, 254, 0.25);
          color: var(--color-primary);
        }
        .match-badge.mid-match {
          background: rgba(176, 38, 255, 0.08);
          border-color: rgba(176, 38, 255, 0.25);
          color: var(--color-accent);
        }
        .option-muscle-tags {
          display: flex;
          gap: 0.3rem;
        }
        .muscle-tag {
          font-size: 0.6rem;
          background: rgba(255, 255, 255, 0.05);
          color: var(--color-text-muted);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
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

