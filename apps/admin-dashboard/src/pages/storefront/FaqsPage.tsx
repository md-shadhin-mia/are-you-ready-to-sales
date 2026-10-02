import React, { useState } from 'react';
import { HelpCircle, Plus, Trash2, Search, Eye } from 'lucide-react';
import {
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@repo/ui';

interface FaqItem {
  id: string;
  category: 'Ordering' | 'Delivery' | 'Returns' | 'Payments' | 'Student Training';
  question: string;
  answer: string;
  sortPriority: number;
  isPublished: boolean;
}

const initialFaqs: FaqItem[] = [
  {
    id: 'faq-1',
    category: 'Delivery',
    question: 'How many days does standard shipping take across Bangladesh?',
    answer: 'Inside Dhaka, deliveries are completed within 24 to 48 hours. Outside Dhaka, courier transit requires 2 to 3 business days via our logistics partners.',
    sortPriority: 1,
    isPublished: true,
  },
  {
    id: 'faq-2',
    category: 'Returns',
    question: 'What is the eligibility requirement for an exchange?',
    answer: 'Customers can request a replacement within 7 calendar days of delivery if the item is unused, unworn, and has its original tags and barcode packaging intact.',
    sortPriority: 2,
    isPublished: true,
  },
  {
    id: 'faq-3',
    category: 'Student Training',
    question: 'When are student affiliate sales profits disbursed?',
    answer: 'Commissions and affiliate profits are reviewed weekly and disbursed on the 1st of every month directly to the verified bank routing account.',
    sortPriority: 3,
    isPublished: true,
  },
];

export default function FaqsPage() {
  const [faqs, setFaqs] = useState<FaqItem[]>(initialFaqs);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [category, setCategory] = useState<FaqItem['category']>('Ordering');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sortPriority, setSortPriority] = useState('1');

  const handleAddFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question || !answer) return;

    const newFaq: FaqItem = {
      id: `faq-${Date.now()}`,
      category,
      question,
      answer,
      sortPriority: Number(sortPriority) || 1,
      isPublished: true,
    };

    setFaqs([...faqs, newFaq]);
    setIsModalOpen(false);
    setQuestion('');
    setAnswer('');
  };

  const togglePublished = (id: string) => {
    setFaqs(faqs.map((f) => (f.id === id ? { ...f, isPublished: !f.isPublished } : f)));
  };

  const filtered = faqs.filter((f) => {
    const matchesSearch =
      f.question.toLowerCase().includes(search.toLowerCase()) ||
      f.answer.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'All' || f.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-primary" />
            FAQ Knowledge Base
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Maintain categorized customer queries, ordering policies, and training program answers.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="text-xs flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add FAQ Item
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search questions or answers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="All">All Categories</option>
          <option value="Ordering">Ordering</option>
          <option value="Delivery">Delivery</option>
          <option value="Returns">Returns</option>
          <option value="Payments">Payments</option>
          <option value="Student Training">Student Training</option>
        </select>
      </div>

      <div className="space-y-3">
        {filtered.map((item) => (
          <div key={item.id} className="p-4 rounded-xl border border-border bg-card space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {item.category}
                </Badge>
                <span className="text-xs font-mono text-muted-foreground">Priority: #{item.sortPriority}</span>
              </div>
              <Badge variant={item.isPublished ? 'default' : 'secondary'} className="text-[10px]">
                {item.isPublished ? 'PUBLISHED' : 'DRAFT'}
              </Badge>
            </div>

            <h3 className="text-sm font-bold text-foreground">{item.question}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{item.answer}</p>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => togglePublished(item.id)}
                className="text-xs h-7 text-muted-foreground hover:text-foreground"
              >
                {item.isPublished ? 'Unpublish' : 'Publish'}
              </Button>
              <button
                type="button"
                onClick={() => setFaqs(faqs.filter((f) => f.id !== item.id))}
                className="text-rose-500 hover:text-rose-400 text-xs flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add FAQ Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleAddFaq} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Add FAQ Item</DialogTitle>
              <p className="text-xs text-muted-foreground">
                Provide clear answers for common customer or student inquiries.
              </p>
            </DialogHeader>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="Ordering">Ordering</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Returns">Returns</option>
                    <option value="Payments">Payments</option>
                    <option value="Student Training">Student Training</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Sort Priority</label>
                  <input
                    type="number"
                    min="1"
                    value={sortPriority}
                    onChange={(e) => setSortPriority(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Question Text *</label>
                <input
                  type="text"
                  required
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. How do I track my parcel?"
                  className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Answer Content *</label>
                <textarea
                  rows={4}
                  required
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Write clear, friendly steps..."
                  className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs">
                Save FAQ
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
