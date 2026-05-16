"use client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { t: "06:00", v: 18 }, { t: "07:00", v: 32 }, { t: "08:00", v: 55 },
  { t: "09:00", v: 78 }, { t: "10:00", v: 88 }, { t: "11:00", v: 91 },
  { t: "12:00", v: 95 }, { t: "13:00", v: 89 }, { t: "14:00", v: 82 },
  { t: "15:00", v: 76 }, { t: "16:00", v: 80 }, { t: "17:00", v: 88 },
  { t: "18:00", v: 92 }, { t: "19:00", v: 70 }, { t: "20:00", v: 48 },
  { t: "21:00", v: 34 }, { t: "22:00", v: 22 },
];

export function OccupancyChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#4f6ef7" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#4f6ef7" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="t" stroke="#3f3f46" tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} interval={2} />
        <YAxis stroke="#3f3f46" tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
        <Tooltip
          contentStyle={{ background: "#1a1a1f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", fontSize: "12px", color: "#f4f4f5" }}
          itemStyle={{ color: "#818cf8" }}
          labelStyle={{ color: "#a1a1aa" }}
          formatter={(v: number) => [`${v}%`, "Occupancy"]}
        />
        <Area type="monotone" dataKey="v" stroke="#4f6ef7" strokeWidth={2} fill="url(#grad)" dot={false} activeDot={{ r: 4, fill: "#4f6ef7", strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
