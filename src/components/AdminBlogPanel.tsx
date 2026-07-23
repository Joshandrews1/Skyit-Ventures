import React, { useState } from 'react';
import { BlogPost } from '../types';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Save, 
  X, 
  Check, 
  BookOpen, 
  Calendar, 
  User, 
  Tag, 
  AlertCircle,
  Bot,
  Send,
  RefreshCw,
  Mail,
  CheckCircle2,
  Globe,
  TrendingUp,
  FileText
} from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface AdminBlogPanelProps {
  posts: BlogPost[];
  onPostsChange: (posts: BlogPost[]) => void;
}

export const AdminBlogPanel: React.FC<AdminBlogPanelProps> = ({
  posts,
  onPostsChange
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // AI Agent States
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiNiche, setAiNiche] = useState('Solar & Clean Energy');
  const [aiTopic, setAiTopic] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiResult, setAiResult] = useState<{
    title: string;
    slug: string;
    category: string;
    excerpt: string;
    content: string;
    readTimeMinutes: number;
    tags: string[];
    coverImage: string;
    trendingSources: string[];
    newsletter: {
      subject: string;
      html: string;
    };
  } | null>(null);
  const [aiPreviewTab, setAiPreviewTab] = useState<'blog' | 'newsletter'>('blog');
  const [isDispatchingNewsletter, setIsDispatchingNewsletter] = useState(false);
  const [newsletterStatus, setNewsletterStatus] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<BlogPost>>({
    title: '',
    category: 'Solar & Clean Energy',
    excerpt: '',
    content: '',
    coverImage: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=1200&q=80',
    authorName: 'Daniel Eweh',
    authorRole: 'Managing Director, SkyIT Ventures',
    published: true,
    featured: false,
    readTimeMinutes: 5,
    tags: ['Solar Energy', 'Clean Energy', 'SkyIT']
  });

  const [tagInput, setTagInput] = useState('');

  // Sample trending prompts for 1-click execution
  const presetPrompts = [
    { label: "⚡ 2026 Grid Tariffs & Solar Microgrid ROI", category: "Solar & Clean Energy", prompt: "Real-time analysis of Nigerian NERC electricity tariff band adjustments and ROI of off-grid solar microgrids for commercial buildings in 2026." },
    { label: "🔒 AI-Powered 4K Surveillance & Security Arrays", category: "Security & Surveillance", prompt: "Integrating AI motion tracking, starlight night vision, and hybrid solar batteries for 24/7 security perimeter protection." },
    { label: "🔋 LiFePO4 Lithium vs Tall Tubular Battery Footprint", category: "Solar & Clean Energy", prompt: "Comprehensive technical cost comparison between 5KWH Wall-mount Lithium-Iron Phosphate cells and Deep-cycle Tall Tubular batteries in West Africa." },
    { label: "🏢 Corporate Digital Transformation & Network Infrastructure", category: "IT & Digital Transformation", prompt: "Deploying resilient server topologies, cloud telemetry, and clean power backups for enterprise IT facilities." }
  ];

  const handleOpenAdd = () => {
    setEditingPost(null);
    setFormData({
      title: '',
      category: 'Solar & Clean Energy',
      excerpt: '',
      content: '',
      coverImage: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=1200&q=80',
      authorName: 'Daniel Eweh',
      authorRole: 'Managing Director, SkyIT Ventures',
      published: true,
      featured: false,
      readTimeMinutes: 5,
      tags: ['Solar Energy', 'SkyIT']
    });
    setTagInput('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({ ...post });
    setTagInput((post.tags || []).join(', '));
    setIsModalOpen(true);
  };

  // Generate Article & Newsletter via AI Agent
  const handleGenerateAiContent = async (customPrompt?: string) => {
    const promptToUse = customPrompt || aiTopic;
    setIsGeneratingAi(true);
    setNewsletterStatus(null);

    try {
      const res = await fetch('/api/admin/generate-ai-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: aiNiche,
          topic: promptToUse,
          authorName: 'Daniel Eweh',
          authorRole: 'Managing Director, SkyIT Ventures',
          includeNewsletter: true
        })
      });

      if (!res.ok) throw new Error('Failed to reach AI Agent endpoint');
      const data = await res.json();
      setAiResult(data);
    } catch (err: any) {
      console.error('AI Generation Error:', err);
      setFeedback({ type: 'error', message: 'Failed to generate AI blog & newsletter: ' + err.message });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Publish AI Generated Article to Firestore & Local State
  const handlePublishAiArticle = async (andSendNewsletter: boolean = false) => {
    if (!aiResult) return;

    setIsSaving(true);
    const postId = `post-${Date.now()}`;

    const newPost: BlogPost = {
      id: postId,
      title: aiResult.title,
      slug: aiResult.slug || `post-${Date.now()}`,
      category: aiResult.category || aiNiche,
      excerpt: aiResult.excerpt,
      content: aiResult.content,
      coverImage: aiResult.coverImage || 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=1200&q=80',
      authorName: 'Daniel Eweh',
      authorRole: 'Managing Director, SkyIT Ventures',
      authorAvatar: 'https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0122140096.firebasestorage.app/o/web%20images%2FIMG-20260723-WA0001.jpg?alt=media&token=30e9afa5-8d9c-4334-b742-386e47910f2f',
      published: true,
      featured: true,
      readTimeMinutes: aiResult.readTimeMinutes || 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: aiResult.tags || ['SkyIT', 'Clean Energy']
    };

    try {
      await setDoc(doc(db, 'blog_posts', postId), newPost);
    } catch (err) {
      console.warn('Firestore save notice:', err);
    }

    onPostsChange([newPost, ...posts]);
    setIsSaving(false);

    if (andSendNewsletter && aiResult.newsletter) {
      handleDispatchNewsletter();
    } else {
      setIsAiModalOpen(false);
      setFeedback({ type: 'success', message: '🤖 AI Article published live to SkyIT Blog!' });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  // Dispatch Newsletter
  const handleDispatchNewsletter = async () => {
    if (!aiResult?.newsletter) return;
    setIsDispatchingNewsletter(true);
    setNewsletterStatus(null);

    try {
      const res = await fetch('/api/admin/dispatch-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: aiResult.newsletter.subject,
          htmlContent: aiResult.newsletter.html
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNewsletterStatus(`✅ Newsletter broadcast sent successfully${data.offline ? ' (simulated mode)' : ''}!`);
        setTimeout(() => {
          setIsAiModalOpen(false);
          setFeedback({ type: 'success', message: '🤖 AI Article published & Newsletter broadcasted to subscribers!' });
          setTimeout(() => setFeedback(null), 3000);
        }, 1500);
      } else {
        setNewsletterStatus('⚠️ ' + (data.error || 'Failed to dispatch newsletter.'));
      }
    } catch (err: any) {
      setNewsletterStatus('⚠️ Error sending newsletter: ' + err.message);
    } finally {
      setIsDispatchingNewsletter(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim() || !formData.content?.trim()) {
      setFeedback({ type: 'error', message: 'Please fill in both article title and content.' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    const postId = editingPost ? editingPost.id : `post-${Date.now()}`;
    const slug = formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const tagsArray = tagInput.split(',').map(t => t.trim()).filter(Boolean);

    const updatedPost: BlogPost = {
      id: postId,
      title: formData.title || '',
      slug: slug || `post-${Date.now()}`,
      category: formData.category || 'Solar & Clean Energy',
      excerpt: formData.excerpt || formData.content.slice(0, 160) + '...',
      content: formData.content || '',
      coverImage: formData.coverImage || 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=1200&q=80',
      authorName: formData.authorName || 'Daniel Eweh',
      authorRole: formData.authorRole || 'Managing Director, SkyIT Ventures',
      authorAvatar: formData.authorAvatar || 'https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0122140096.firebasestorage.app/o/web%20images%2FIMG-20260723-WA0001.jpg?alt=media&token=30e9afa5-8d9c-4334-b742-386e47910f2f',
      published: formData.published ?? true,
      featured: formData.featured ?? false,
      readTimeMinutes: Number(formData.readTimeMinutes) || 5,
      createdAt: editingPost ? editingPost.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: tagsArray
    };

    try {
      await setDoc(doc(db, 'blog_posts', postId), updatedPost);
    } catch (err) {
      console.warn('Firestore save notice:', err);
    }

    let newPostsList: BlogPost[];
    if (editingPost) {
      newPostsList = posts.map(p => p.id === postId ? updatedPost : p);
    } else {
      newPostsList = [updatedPost, ...posts];
    }

    onPostsChange(newPostsList);
    setIsSaving(false);
    setIsModalOpen(false);
    setFeedback({ type: 'success', message: editingPost ? 'Article updated successfully!' : 'New article published successfully!' });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleTogglePublish = async (post: BlogPost) => {
    const updatedPost = { ...post, published: !post.published };
    try {
      await setDoc(doc(db, 'blog_posts', post.id), updatedPost);
    } catch (e) {
      console.warn('Firestore toggle notice:', e);
    }
    const updatedList = posts.map(p => p.id === post.id ? updatedPost : p);
    onPostsChange(updatedList);
  };

  const handleToggleFeatured = async (post: BlogPost) => {
    const updatedPost = { ...post, featured: !post.featured };
    try {
      await setDoc(doc(db, 'blog_posts', post.id), updatedPost);
    } catch (e) {
      console.warn('Firestore featured notice:', e);
    }
    const updatedList = posts.map(p => p.id === post.id ? updatedPost : p);
    onPostsChange(updatedList);
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this blog post?')) return;
    try {
      await deleteDoc(doc(db, 'blog_posts', postId));
    } catch (e) {
      console.warn('Firestore delete notice:', e);
    }
    const updatedList = posts.filter(p => p.id !== postId);
    onPostsChange(updatedList);
    setFeedback({ type: 'success', message: 'Article deleted.' });
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-2xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold font-display text-slate-900 flex items-center gap-2">
            <BookOpen size={18} className="text-brand shrink-0" />
            <span>Blog Articles &amp; Insights</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Publish and manage news, technical guides, and thought leadership articles for SkyIT.
          </p>
        </div>

        <div className="flex flex-col xs:flex-row sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto shrink-0">
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 hover:from-sky-500 hover:to-purple-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-sky-400/30 w-full sm:w-auto"
          >
            <Bot size={16} className="text-amber-300 animate-pulse shrink-0" />
            <span>AI Blog &amp; Newsletter Agent</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="bg-brand hover:bg-brand-dark text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
          >
            <Plus size={16} className="shrink-0" />
            <span>Manual Article</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {feedback.type === 'success' ? <Check size={14} className="shrink-0" /> : <AlertCircle size={14} className="shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* POSTS LIST VIEW (Default View when no editor/agent is active) */}
      {!isAiModalOpen && !isModalOpen && (
        <div className="space-y-4">
          
          {/* MOBILE CARD VIEW (Visible on small screens) */}
          <div className="block md:hidden space-y-3">
            {posts.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center text-slate-400">
                <Bot size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-slate-600 text-sm">No blog posts available yet.</p>
                <p className="text-xs text-slate-400 mt-1">Tap "AI Blog &amp; Newsletter Agent" to generate a research-backed post!</p>
              </div>
            ) : (
              posts.map(post => (
                <div key={post.id} className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-3 shadow-2xs">
                  <div className="flex items-start gap-3">
                    {post.coverImage && (
                      <img 
                        src={post.coverImage} 
                        alt="" 
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="space-y-1 flex-1 min-w-0">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-2 leading-snug">
                        {post.title}
                      </span>
                      <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-slate-400">
                        <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded">
                          {post.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500 font-medium truncate max-w-[120px]">
                      By {post.authorName}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleTogglePublish(post)}
                        className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-full cursor-pointer transition-colors ${
                          post.published 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {post.published ? <Eye size={11} /> : <EyeOff size={11} />}
                        <span>{post.published ? 'Published' : 'Draft'}</span>
                      </button>

                      <button
                        onClick={() => handleToggleFeatured(post)}
                        title="Toggle featured banner"
                        className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                          post.featured ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        <Sparkles size={14} fill={post.featured ? 'currentColor' : 'none'} />
                      </button>

                      <button
                        onClick={() => handleOpenEdit(post)}
                        className="p-1.5 bg-slate-100 hover:bg-brand hover:text-white text-slate-600 rounded-lg transition-colors cursor-pointer"
                        title="Edit Article"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="p-1.5 bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-600 rounded-lg transition-colors cursor-pointer"
                        title="Delete Article"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* DESKTOP TABLE VIEW (Visible on tablet/desktop screens) */}
          <div className="hidden md:block bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Article Details</th>
                    <th className="px-4 py-3.5">Category</th>
                    <th className="px-4 py-3.5">Author</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5 text-center">Featured</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {posts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                        <Bot size={36} className="mx-auto text-slate-300 mb-2" />
                        <p className="font-bold text-slate-600">No blog posts available yet.</p>
                        <p className="text-xs text-slate-400 mt-1">Click "AI Blog &amp; Newsletter Agent" above to generate a research-backed post in seconds!</p>
                      </td>
                    </tr>
                  ) : (
                    posts.map(post => (
                      <tr key={post.id} className="hover:bg-slate-50/70 transition-colors">
                        
                        {/* Title & Date */}
                        <td className="px-5 py-4 max-w-xs">
                          <div className="flex items-start gap-3">
                            {post.coverImage && (
                              <img 
                                src={post.coverImage} 
                                alt="" 
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-900 line-clamp-1 block text-xs">
                                {post.title}
                              </span>
                              <span className="text-[10.5px] text-slate-400 flex items-center gap-1">
                                <Calendar size={11} />
                                {new Date(post.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-4">
                          <span className="bg-slate-100 text-slate-700 text-[10.5px] font-bold px-2.5 py-1 rounded-md">
                            {post.category}
                          </span>
                        </td>

                        {/* Author */}
                        <td className="px-4 py-4 font-medium text-slate-700">
                          {post.authorName}
                        </td>

                        {/* Published Status */}
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => handleTogglePublish(post)}
                            title="Click to toggle publish status"
                            className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-full cursor-pointer transition-colors ${
                              post.published 
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            }`}
                          >
                            {post.published ? <Eye size={11} /> : <EyeOff size={11} />}
                            <span>{post.published ? 'Published' : 'Draft'}</span>
                          </button>
                        </td>

                        {/* Featured */}
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => handleToggleFeatured(post)}
                            title="Toggle featured banner"
                            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                              post.featured ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            <Sparkles size={14} fill={post.featured ? 'currentColor' : 'none'} />
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(post)}
                              className="p-1.5 bg-slate-100 hover:bg-brand hover:text-white text-slate-600 rounded-lg transition-colors cursor-pointer"
                              title="Edit Article"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(post.id)}
                              className="p-1.5 bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-600 rounded-lg transition-colors cursor-pointer"
                              title="Delete Article"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* FULL-PAGE VIEW 1: AI BLOG & NEWSLETTER GENERATOR AGENT WORKSPACE */}
      {isAiModalOpen && (
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg animate-fade-in space-y-5 sm:space-y-6 p-4 sm:p-8">
          
          {/* Top Workspace Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 sm:pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              >
                <span>← Back</span>
              </button>
              <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
                  <Bot size={18} className="text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold font-display text-sm sm:text-base text-slate-900 flex flex-wrap items-center gap-1.5">
                    <span>AI Blog &amp; Newsletter Agent</span>
                    <span className="bg-sky-100 text-sky-800 text-[9.5px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border border-sky-300">
                      Research Mode
                    </span>
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    Researches market trends, composes technical posts &amp; formats email newsletters.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-[11px] sm:text-xs text-slate-500 font-medium">
              Author: <strong className="text-slate-800">Daniel Eweh</strong> (MD, SkyIT)
            </div>
          </div>

          {/* Preset Prompts & Topic Selection Section */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <TrendingUp size={15} className="text-brand shrink-0" />
                <span>Select 1-Click Niche Brief or Enter Topic</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {presetPrompts.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setAiNiche(preset.category);
                    setAiTopic(preset.prompt);
                    handleGenerateAiContent(preset.prompt);
                  }}
                  disabled={isGeneratingAi}
                  className="text-left bg-white border border-slate-200 hover:border-brand/60 hover:bg-brand-light/20 p-3 rounded-xl transition-all cursor-pointer group space-y-1 shadow-2xs"
                >
                  <span className="font-bold text-xs text-slate-800 group-hover:text-brand block">
                    {preset.label}
                  </span>
                  <span className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {preset.prompt}
                  </span>
                </button>
              ))}
            </div>

            {/* Custom Topic Form Bar */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <select
                value={aiNiche}
                onChange={(e) => setAiNiche(e.target.value)}
                className="w-full sm:w-auto bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/30 shrink-0 shadow-2xs"
              >
                <option value="Solar & Clean Energy">Solar &amp; Clean Energy</option>
                <option value="Security & Surveillance">Security &amp; Surveillance</option>
                <option value="IT & Digital Transformation">IT &amp; Digital Transformation</option>
                <option value="Industry Insights">Industry Insights</option>
              </select>

              <input 
                type="text"
                placeholder="Enter topic e.g. Diesel cost vs 10KWH solar battery microgrids in Warri..."
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                className="w-full sm:flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/30 shadow-2xs"
              />

              <button
                onClick={() => handleGenerateAiContent()}
                disabled={isGeneratingAi}
                className="w-full sm:w-auto bg-brand hover:bg-brand-dark text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
              >
                {isGeneratingAi ? <RefreshCw size={15} className="animate-spin shrink-0" /> : <Sparkles size={15} className="shrink-0" />}
                <span>{isGeneratingAi ? 'Researching...' : 'Generate Article & Newsletter'}</span>
              </button>
            </div>
          </div>

          {/* GENERATION OUTPUT WORKSPACE */}
          {isGeneratingAi ? (
            <div className="p-8 sm:p-16 text-center space-y-4 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-xl">
              <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-2xl bg-brand/20 border border-brand/50 flex items-center justify-center text-amber-300 mx-auto animate-bounce">
                <Bot size={28} />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold font-display text-sm sm:text-base text-slate-100">
                  AI Agent is researching real-time data &amp; drafting your post...
                </h4>
                <p className="text-xs text-slate-400 max-w-lg mx-auto">
                  Pulling grid tariff developments, technical battery specs, and generating responsive newsletter HTML.
                </p>
              </div>
            </div>
          ) : aiResult ? (
            <div className="space-y-5 sm:space-y-6">
              
              {/* Real-time Sources Banner */}
              {aiResult.trendingSources && aiResult.trendingSources.length > 0 && (
                <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 sm:p-4 text-xs text-amber-900 space-y-1.5">
                  <span className="font-bold flex items-center gap-1.5 text-amber-900">
                    <Globe size={14} className="text-amber-700 shrink-0" />
                    <span>Real-Time Market Data Points Incorporated:</span>
                  </span>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11.5px] text-amber-800/90 pl-1 pt-1">
                    {aiResult.trendingSources.map((src, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                        <span>{src}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Workspace Preview Header Tabs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex flex-col xs:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setAiPreviewTab('blog')}
                    className={`text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 w-full sm:w-auto ${
                      aiPreviewTab === 'blog' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <FileText size={14} className="shrink-0" />
                    <span>Article Markdown Workspace</span>
                  </button>
                  <button
                    onClick={() => setAiPreviewTab('newsletter')}
                    className={`text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 w-full sm:w-auto ${
                      aiPreviewTab === 'newsletter' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Mail size={14} className="shrink-0" />
                    <span>Subscriber Newsletter HTML</span>
                  </button>
                </div>

                <div className="text-xs text-slate-500 font-semibold self-end sm:self-auto">
                  Read Time: <strong>{aiResult.readTimeMinutes} minutes</strong>
                </div>
              </div>

              {/* TAB 1: ARTICLE FULL WORKSPACE */}
              {aiPreviewTab === 'blog' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-8 space-y-4 sm:space-y-6 shadow-2xs">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span className="bg-brand-light text-brand text-[10.5px] font-bold uppercase tracking-wider px-3 py-1 rounded-md">
                        {aiResult.category}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-900 leading-tight">
                      {aiResult.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-700 font-medium italic border-l-4 border-brand pl-3.5 py-1.5 bg-slate-50 rounded-r-xl">
                      "{aiResult.excerpt}"
                    </p>
                  </div>

                  {aiResult.coverImage && (
                    <img 
                      src={aiResult.coverImage} 
                      alt="" 
                      className="w-full h-48 sm:h-72 object-cover rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs"
                      referrerPolicy="no-referrer"
                    />
                  )}

                  {/* Article Content Display */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-6 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line font-sans space-y-4">
                    {aiResult.content}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-400">Tags:</span>
                    {aiResult.tags?.map((t, idx) => (
                      <span key={idx} className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-200">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: NEWSLETTER FULL WORKSPACE */}
              {aiPreviewTab === 'newsletter' && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 text-xs text-slate-800 space-y-1 shadow-2xs">
                    <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">Email Broadcast Subject Line:</span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm block">{aiResult.newsletter?.subject}</span>
                  </div>

                  {/* Rendered HTML inside preview box */}
                  <div 
                    className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 text-xs shadow-inner min-h-[300px] sm:min-h-[400px] overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: aiResult.newsletter?.html || '<p>No newsletter generated.</p>' }}
                  />
                </div>
              )}

              {/* Dispatch Notification Status Banner */}
              {newsletterStatus && (
                <div className="p-3.5 sm:p-4 bg-sky-50 border border-sky-200 text-sky-900 rounded-2xl text-xs font-medium flex items-center justify-between">
                  <span>{newsletterStatus}</span>
                </div>
              )}

              {/* Bottom Action Footer */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-5 sm:pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => handleGenerateAiContent()}
                  disabled={isGeneratingAi || isDispatchingNewsletter}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw size={14} className="shrink-0" />
                  <span>Regenerate Draft Brief</span>
                </button>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handlePublishAiArticle(false)}
                    disabled={isSaving || isDispatchingNewsletter}
                    className="w-full sm:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Save size={15} className="shrink-0" />
                    <span>Publish Article Only</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePublishAiArticle(true)}
                    disabled={isSaving || isDispatchingNewsletter}
                    className="w-full sm:w-auto px-6 py-3 bg-brand hover:bg-brand-dark text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isDispatchingNewsletter ? <RefreshCw size={15} className="animate-spin shrink-0" /> : <Send size={15} className="shrink-0" />}
                    <span>Publish &amp; Send Newsletter</span>
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="p-8 sm:p-12 text-center space-y-3 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              <Bot size={36} className="text-slate-400 mx-auto" />
              <h4 className="font-bold text-xs sm:text-sm text-slate-800">Ready to draft industry content.</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Select a 1-click prompt above or enter a topic to trigger our research agent.
              </p>
            </div>
          )}

        </div>
      )}

      {/* FULL-PAGE VIEW 2: MANUAL ARTICLE EDITOR WORKSPACE */}
      {isModalOpen && (
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg animate-fade-in space-y-5 sm:space-y-6 p-4 sm:p-8">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-4 sm:pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>← Back</span>
              </button>
              <div className="h-6 w-px bg-slate-200"></div>
              <h3 className="font-bold font-display text-slate-900 text-sm sm:text-base">
                {editingPost ? 'Edit Blog Article' : 'Write Manual Article'}
              </h3>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4 sm:space-y-6">
            
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Article Title *</label>
              <input 
                type="text"
                required
                placeholder="e.g. 2026 Commercial Energy Audit: Battery Microgrids vs Diesel Generators"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand shadow-2xs"
              />
            </div>

            {/* Category & Read Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand shadow-2xs"
                >
                  <option value="Solar & Clean Energy">Solar &amp; Clean Energy</option>
                  <option value="Security & Surveillance">Security &amp; Surveillance</option>
                  <option value="IT & Digital Transformation">IT &amp; Digital Transformation</option>
                  <option value="Industry Insights">Industry Insights</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Estimated Read Time (minutes)</label>
                <input 
                  type="number"
                  min="1"
                  max="60"
                  value={formData.readTimeMinutes}
                  onChange={(e) => setFormData({ ...formData, readTimeMinutes: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand shadow-2xs"
                />
              </div>
            </div>

            {/* Author Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Author Name</label>
                <input 
                  type="text"
                  value={formData.authorName}
                  onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Author Title / Role</label>
                <input 
                  type="text"
                  value={formData.authorRole}
                  onChange={(e) => setFormData({ ...formData, authorRole: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand shadow-2xs"
                />
              </div>
            </div>

            {/* Cover Image URL */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Cover Image URL</label>
              <input 
                type="text"
                placeholder="https://images.unsplash.com/photo-..."
                value={formData.coverImage}
                onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand shadow-2xs"
              />
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Article Excerpt / Summary</label>
              <textarea 
                rows={2}
                placeholder="Crisp short summary highlighting key takeaways..."
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand shadow-2xs"
              />
            </div>

            {/* Full Article Content */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Article Body (Markdown supported) *</label>
              <textarea 
                rows={12}
                required
                placeholder="Write the comprehensive article here using markdown headers, bullet points, and technical specs..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand font-mono leading-relaxed shadow-2xs"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Search Tags (comma separated)</label>
              <input 
                type="text"
                placeholder="Solar, Microgrid, LiFePO4, Warri, Security"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand shadow-2xs"
              />
            </div>

            {/* Toggles */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 pt-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={formData.published}
                  onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                  className="rounded text-brand focus:ring-brand w-4 h-4"
                />
                <span>Publish Article Live Immediately</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="rounded text-brand focus:ring-brand w-4 h-4"
                />
                <span>Feature on Blog Hero Header</span>
              </label>
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-5 sm:pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto px-6 py-2.5 bg-brand hover:bg-brand-dark text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save size={15} className="shrink-0" />
                <span>{isSaving ? 'Saving Article...' : 'Save & Publish Article'}</span>
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
};
