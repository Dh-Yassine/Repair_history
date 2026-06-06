import PageTransition from '../components/layout/PageTransition';

export default function PlaceholderPage({ title, desc }: { title: string; desc: string }) {
  return (
    <PageTransition>
      <h1 className="display" style={{ fontSize: 40, marginBottom: 12 }}>
        {title}
      </h1>
      <div className="card empty-state">
        <p className="muted">{desc}</p>
        <p className="mono subtle" style={{ marginTop: 16, fontSize: 12 }}>
          Coming in Phase 5
        </p>
      </div>
    </PageTransition>
  );
}
