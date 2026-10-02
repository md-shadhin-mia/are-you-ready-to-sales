import React, { useState } from 'react';
import { Info, Plus, Trash2, Save, CheckCircle2, UserCheck, Calendar } from 'lucide-react';
import { Button } from '@repo/ui';

interface TeamMember {
  id: string;
  name: string;
  title: string;
  bio: string;
  linkedin: string;
}

interface Milestone {
  id: string;
  year: string;
  title: string;
  description: string;
}

export default function AboutUsPage() {
  const [mission, setMission] = useState(
    'Democratizing e-commerce education and providing state-of-the-art multi-channel fulfillment infrastructure for young entrepreneurs in South Asia.'
  );
  const [vision, setVision] = useState(
    'To build an ecosystem where every aspiring individual can launch, scale, and automate a sustainable retail business with zero friction.'
  );

  const [team, setTeam] = useState<TeamMember[]>([
    {
      id: 'tm-1',
      name: 'Dr. Rafid Chowdhury',
      title: 'Founder & Academic Chancellor',
      bio: 'Over 15 years in digital trade infrastructure and corporate education leadership.',
      linkedin: 'https://linkedin.com/in/example',
    },
    {
      id: 'tm-2',
      name: 'Nadia Karim',
      title: 'Head of Operations & Logistics',
      bio: 'Ex-courier regional director leading nationwide dispatch networks.',
      linkedin: 'https://linkedin.com/in/example',
    },
  ]);

  const [milestones, setMilestones] = useState<Milestone[]>([
    {
      id: 'ms-1',
      year: '2023',
      title: 'Foundation of E-Commerce Academy',
      description: 'First batch of 120 students graduated with real sales experience.',
    },
    {
      id: 'ms-2',
      year: '2025',
      title: 'Multi-Hub Logistics Cloud Launch',
      description: 'Expanded physical fulfillment hubs across Dhaka, Chittagong, and Sylhet.',
    },
  ]);

  const [saved, setSaved] = useState(false);

  const handleAddMember = () => {
    const newMember: TeamMember = {
      id: `tm-${Date.now()}`,
      name: 'New Leader',
      title: 'Executive Title',
      bio: 'Bio description...',
      linkedin: '',
    };
    setTeam([...team, newMember]);
  };

  const handleAddMilestone = () => {
    const newMilestone: Milestone = {
      id: `ms-${Date.now()}`,
      year: '2026',
      title: 'New Milestone Achievement',
      description: 'Details of milestone...',
    };
    setMilestones([...milestones, newMilestone]);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Info className="h-6 w-6 text-primary" />
            About Us & Institutional Heritage
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Curate core mission statements, executive faculty, and operational history milestones.
          </p>
        </div>

        {saved && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            Changes published!
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="p-6 rounded-xl border border-border bg-card space-y-4">
          <h3 className="text-sm font-bold text-foreground">Mission & Vision Statements</h3>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Corporate Mission</label>
            <textarea
              rows={2}
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              className="w-full p-2 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Corporate Vision</label>
            <textarea
              rows={2}
              value={vision}
              onChange={(e) => setVision(e.target.value)}
              className="w-full p-2 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Executive Team */}
        <div className="p-6 rounded-xl border border-border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Executive Leadership</h3>
            <Button type="button" size="sm" variant="outline" onClick={handleAddMember} className="text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Leader
            </Button>
          </div>

          <div className="space-y-3">
            {team.map((m, idx) => (
              <div key={m.id} className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-xs text-foreground">Leader #{idx + 1}</div>
                  <button
                    type="button"
                    onClick={() => setTeam(team.filter((item) => item.id !== m.id))}
                    className="text-rose-500 hover:text-rose-400 text-xs"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={m.name}
                    placeholder="Full Name"
                    onChange={(e) => {
                      const updated = [...team];
                      updated[idx].name = e.target.value;
                      setTeam(updated);
                    }}
                    className="px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground"
                  />
                  <input
                    type="text"
                    value={m.title}
                    placeholder="Title / Designation"
                    onChange={(e) => {
                      const updated = [...team];
                      updated[idx].title = e.target.value;
                      setTeam(updated);
                    }}
                    className="px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Milestone Timeline */}
        <div className="p-6 rounded-xl border border-border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Milestone Timeline</h3>
            <Button type="button" size="sm" variant="outline" onClick={handleAddMilestone} className="text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Milestone
            </Button>
          </div>

          <div className="space-y-3">
            {milestones.map((ms, idx) => (
              <div key={ms.id} className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-xs text-foreground">Milestone #{idx + 1}</div>
                  <button
                    type="button"
                    onClick={() => setMilestones(milestones.filter((item) => item.id !== ms.id))}
                    className="text-rose-500 hover:text-rose-400 text-xs"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={ms.year}
                    placeholder="Year"
                    onChange={(e) => {
                      const updated = [...milestones];
                      updated[idx].year = e.target.value;
                      setMilestones(updated);
                    }}
                    className="px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground font-mono"
                  />
                  <input
                    type="text"
                    value={ms.title}
                    placeholder="Milestone Title"
                    onChange={(e) => {
                      const updated = [...milestones];
                      updated[idx].title = e.target.value;
                      setMilestones(updated);
                    }}
                    className="col-span-2 px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" size="sm" className="text-xs flex items-center gap-1.5">
            <Save className="h-4 w-4" />
            Publish About Us Content
          </Button>
        </div>
      </form>
    </div>
  );
}
