import { ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Skeleton } from '../common/Skeleton.jsx';
import { STATUS_LABEL } from '../../utils/format.js';

const COLORS = { completed: 'var(--ok)', answered: 'var(--ok)', failed: 'var(--danger)', busy: 'var(--warn)', no_answer: 'var(--warn)', canceled: 'var(--muted)', queued: 'var(--muted)', initiated: 'var(--accent)', ringing: 'var(--accent)' };
const axis = { stroke: 'var(--muted)', fontSize: 12, tickLine: false, axisLine: false };
const tip = { contentStyle: { background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)' } };
const short = (d) => d.slice(5);

function ChartCard({ title, summary, loading, empty, children }) {
  return (
    <section className="card p-4 min-w-0">
      <h2 className="mb-3 text-base">{title}</h2>
      {loading ? <Skeleton className="h-56" /> : empty ? <p className="h-56 grid place-items-center text-sm text-muted">No data for this period yet.</p> : (
        <div role="img" aria-label={summary} className="h-56 w-full">{<ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>}</div>
      )}
    </section>
  );
}

export function DashboardCharts({ stats, loading }) {
  const daily = stats?.daily || [];
  const pie = Object.entries(stats?.counts || {}).map(([k, v]) => ({ key: k, name: STATUS_LABEL[k] || k, value: v }));
  const none = !daily.length;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ChartCard title="Call activity over time" loading={loading} empty={none} summary={`Daily calls and answered calls over ${daily.length} days`}>
        <LineChart data={daily}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="date" tickFormatter={short} {...axis} /><YAxis allowDecimals={false} width={32} {...axis} /><Tooltip {...tip} /><Legend />
          <Line type="monotone" dataKey="total" name="Total" stroke="var(--accent)" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="answered" name="Answered" stroke="var(--ok)" strokeWidth={2} dot={false} /></LineChart>
      </ChartCard>
      <ChartCard title="Answered vs failed" loading={loading} empty={none} summary="Answered and failed calls per day">
        <BarChart data={daily}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="date" tickFormatter={short} {...axis} /><YAxis allowDecimals={false} width={32} {...axis} /><Tooltip {...tip} /><Legend />
          <Bar dataKey="answered" name="Answered" stackId="a" fill="var(--ok)" radius={[0, 0, 0, 0]} /><Bar dataKey="failed" name="Failed / busy / no answer" stackId="a" fill="var(--danger)" radius={[4, 4, 0, 0]} /></BarChart>
      </ChartCard>
      <ChartCard title="Daily call volume" loading={loading} empty={none} summary="Number of calls created each day">
        <BarChart data={daily.slice(-14)}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="date" tickFormatter={short} {...axis} /><YAxis allowDecimals={false} width={32} {...axis} /><Tooltip {...tip} /><Bar dataKey="total" name="Calls" fill="var(--accent)" radius={[4, 4, 0, 0]} /></BarChart>
      </ChartCard>
      <ChartCard title="Status distribution" loading={loading} empty={!pie.length} summary={`Call status distribution: ${pie.map((p) => `${p.name} ${p.value}`).join(', ')}`}>
        <PieChart><Pie data={pie} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="none">{pie.map((p) => <Cell key={p.key} fill={COLORS[p.key] || 'var(--muted)'} />)}</Pie><Tooltip {...tip} /><Legend /></PieChart>
      </ChartCard>
    </div>
  );
}
