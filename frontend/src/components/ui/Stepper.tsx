interface StepperItem {
  id: string;
  label: string;
  hint?: string;
}

export default function Stepper({
  steps,
  current,
}: {
  steps: StepperItem[];
  current: string;
}) {
  const currentIdx = steps.findIndex((s) => s.id === current);

  return (
    <ol className="stepper" aria-label="Workflow steps">
      {steps.map((step, idx) => {
        const state = idx < currentIdx ? 'done' : idx === currentIdx ? 'active' : '';
        return (
          <li key={step.id} className={`stepper-item ${state}`}>
            <span className="stepper-num">{idx < currentIdx ? '✓' : idx + 1}</span>
            <span className="stepper-label">
              <span>Step {idx + 1}</span>
              <strong>{step.label}</strong>
              {step.hint && (
                <span style={{ marginTop: 2, color: 'var(--color-text-muted)', textTransform: 'none', letterSpacing: 0 }}>
                  {step.hint}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
