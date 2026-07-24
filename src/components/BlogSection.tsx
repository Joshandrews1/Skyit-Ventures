import React, { useState, useMemo } from 'react';
import { BlogPost } from '../types';
import { FormattedBlogContent } from './FormattedBlogContent';
import { 
  Search, 
  Calendar, 
  Clock, 
  User, 
  Tag, 
  Sparkles, 
  ArrowLeft, 
  Share2, 
  Check, 
  BookOpen, 
  ChevronRight, 
  Layers, 
  Filter,
  Newspaper
} from 'lucide-react';

interface BlogSectionProps {
  posts: BlogPost[];
  onSelectPost?: (post: BlogPost) => void;
  selectedPost?: BlogPost | null;
  onClearSelectedPost?: () => void;
}

const OFFICIAL_EXECUTIVE_PORTRAIT = "https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0122140096.firebasestorage.app/o/web%20images%2FIMG-20260723-WA0001.jpg?alt=media&token=30e9afa5-8d9c-4334-b742-386e47910f2f";

const resolveAuthorAvatar = (authorName?: string, authorAvatar?: string) => {
  if (!authorAvatar || authorAvatar.includes('unsplash.com') || !authorAvatar.startsWith('http')) {
    return OFFICIAL_EXECUTIVE_PORTRAIT;
  }
  return authorAvatar;
};

export const BlogSection: React.FC<BlogSectionProps> = ({
  posts,
  onSelectPost,
  selectedPost,
  onClearSelectedPost
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [activePostLocal, setActivePostLocal] = useState<BlogPost | null>(selectedPost || null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Synchronize prop state if provided
  const currentPost = selectedPost !== undefined ? selectedPost : activePostLocal;

  const categories = ['All', 'Solar & Clean Energy', 'Security & Surveillance', 'IT & Digital Transformation', 'Industry Insights'];

  // Filter published posts
  const publishedPosts = useMemo(() => {
    return posts.filter(post => post.published !== false);
  }, [posts]);

  // Search & category filter
  const filteredPosts = useMemo(() => {
    return publishedPosts.filter(post => {
      const matchesCategory = activeCategory === 'All' || post.category === activeCategory;
      const matchesSearch = !searchQuery.trim() || 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (post.tags && post.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
      return matchesCategory && matchesSearch;
    });
  }, [publishedPosts, activeCategory, searchQuery]);

  const featuredPost = useMemo(() => {
    return publishedPosts.find(p => p.featured) || publishedPosts[0];
  }, [publishedPosts]);

  const handleOpenPost = (post: BlogPost) => {
    if (onSelectPost) {
      onSelectPost(post);
    } else {
      setActivePostLocal(post);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClosePost = () => {
    if (onClearSelectedPost) {
      onClearSelectedPost();
    } else {
      setActivePostLocal(null);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // ----------------------------------------------------
  // SINGLE ARTICLE DETAIL VIEW
  // ----------------------------------------------------
  if (currentPost) {
    const relatedPosts = publishedPosts.filter(p => p.id !== currentPost.id && (p.category === currentPost.category || p.featured)).slice(0, 3);

    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in text-slate-700 pb-12">
        
        {/* Back Button & Navigation */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <button
            onClick={handleClosePost}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-brand bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-2xs transition-all hover:border-brand cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Back to All Articles</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
          >
            {copiedLink ? <Check size={13} className="text-emerald-600" /> : <Share2 size={13} />}
            <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
          </button>
        </div>

        {/* Article Header & Title */}
        <article className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-xs space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-brand-light text-brand text-[10.5px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-brand/20">
                {currentPost.category}
              </span>
              {currentPost.featured && (
                <span className="bg-amber-100 text-amber-800 text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles size={11} className="text-amber-600" />
                  <span>Featured Post</span>
                </span>
              )}
            </div>

            <h1 className="font-display font-black text-2xl sm:text-4xl text-slate-900 tracking-tight leading-tight">
              {currentPost.title}
            </h1>

            {/* Author Meta Bar */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <img 
                  src={resolveAuthorAvatar(currentPost.authorName, currentPost.authorAvatar)} 
                  alt={currentPost.authorName} 
                  className="w-7 h-7 rounded-full object-cover border border-slate-200"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <span className="font-bold text-slate-850 block leading-none">{currentPost.authorName}</span>
                  <span className="text-[10px] text-slate-400">{currentPost.authorRole || 'SkyIT Engineering'}</span>
                </div>
              </div>

              <span className="text-slate-300">•</span>

              <div className="flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400" />
                <span>{new Date(currentPost.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>

              {currentPost.readTimeMinutes && (
                <>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} className="text-slate-400" />
                    <span>{currentPost.readTimeMinutes} min read</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Cover Image */}
          {currentPost.coverImage && (
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 shadow-xs">
              <img 
                src={currentPost.coverImage} 
                alt={currentPost.title} 
                className="w-full aspect-[16/9] object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          {/* Excerpt Lead */}
          <p className="text-sm sm:text-base text-slate-700 font-semibold leading-relaxed border-l-4 border-brand pl-4 bg-slate-50/80 py-3 rounded-r-xl">
            {currentPost.excerpt}
          </p>

          {/* Article Full Body */}
          <FormattedBlogContent content={currentPost.content} className="pt-2 text-xs sm:text-sm text-slate-700 leading-relaxed space-y-4" />

          {/* Tags */}
          {currentPost.tags && currentPost.tags.length > 0 && (
            <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <Tag size={13} className="text-slate-400" />
              {currentPost.tags.map((tag, idx) => (
                <span key={idx} className="bg-slate-100 text-slate-600 text-[11px] font-medium px-2.5 py-0.5 rounded-lg">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </article>

        {/* Related Articles Section */}
        {relatedPosts.length > 0 && (
          <div className="space-y-4 pt-4">
            <h3 className="font-display font-bold text-lg text-slate-900">
              Related SkyIT Insights
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedPosts.map(post => (
                <div 
                  key={post.id} 
                  onClick={() => handleOpenPost(post)}
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-brand bg-brand-light px-2 py-0.5 rounded-md">
                      {post.category}
                    </span>
                    <h4 className="font-bold text-xs text-slate-900 group-hover:text-brand transition-colors line-clamp-2">
                      {post.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {post.excerpt}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-2">
                    <span>{post.authorName}</span>
                    <span className="flex items-center text-brand font-semibold gap-0.5 group-hover:translate-x-1 transition-transform">
                      Read <ChevronRight size={10} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    );
  }

  // ----------------------------------------------------
  // BLOG MAIN CATALOG / LIST VIEW
  // ----------------------------------------------------
  return (
    <div className="space-y-10 animate-fade-in text-slate-700">
      
      {/* 1. Blog Header Banner */}
      <section className="relative overflow-hidden bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 bg-brand-light text-brand px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
            <Newspaper size={12} className="text-brand" />
            <span>SkyIT Knowledge Hub</span>
          </div>

          <h1 className="font-display font-black text-2xl sm:text-4xl text-slate-900 tracking-tight leading-tight">
            Engineering Insights &amp; <span className="text-brand">Clean Tech</span> Trends
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Articles, guides, and corporate insights from Managing Director Daniel Eweh and the SkyIT engineering team on solar microgrids, CCTV security, and digital transformation.
          </p>
        </div>

        {/* Search & Category Filter Control */}
        <div className="mt-8 space-y-4 pt-6 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="Search articles by title, topic, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Filter size={13} className="text-slate-400 mr-1 hidden sm:inline" />
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-brand text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Featured Article Banner (Show if no search query & 'All' category selected) */}
      {!searchQuery && activeCategory === 'All' && featuredPost && (
        <section className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white border border-slate-800 rounded-3xl overflow-hidden shadow-md group">
          <div className="grid md:grid-cols-12 items-center">
            
            <div className="md:col-span-7 p-6 sm:p-10 space-y-4">
              <div className="flex items-center gap-2">
                <span className="bg-brand text-white text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-md">
                  Featured Article
                </span>
                <span className="text-[11px] text-amber-300 font-semibold">
                  {featuredPost.category}
                </span>
              </div>

              <h2 
                onClick={() => handleOpenPost(featuredPost)}
                className="font-display font-black text-xl sm:text-3xl text-white hover:text-amber-300 transition-colors cursor-pointer leading-tight"
              >
                {featuredPost.title}
              </h2>

              <p className="text-xs sm:text-sm text-slate-100 line-clamp-3 leading-relaxed font-normal">
                {featuredPost.excerpt}
              </p>

              <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img 
                    src={resolveAuthorAvatar(featuredPost.authorName, featuredPost.authorAvatar)} 
                    alt={featuredPost.authorName} 
                    className="w-8 h-8 rounded-full object-cover border border-sky-400/50 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate">{featuredPost.authorName}</span>
                    <span className="text-[10px] text-slate-200 font-medium block truncate max-w-[200px] sm:max-w-xs">{featuredPost.authorRole}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenPost(featuredPost)}
                  className="bg-brand hover:bg-brand-dark text-white text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span className="whitespace-nowrap">Read Article</span>
                  <ChevronRight size={14} className="shrink-0" />
                </button>
              </div>
            </div>

            {featuredPost.coverImage && (
              <div className="md:col-span-5 h-full min-h-[220px] relative overflow-hidden">
                <img 
                  src={featuredPost.coverImage} 
                  alt={featuredPost.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/40 to-transparent md:block hidden"></div>
              </div>
            )}

          </div>
        </section>
      )}

      {/* 3. Article Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-slate-900">
            {activeCategory === 'All' ? 'Latest Articles' : `${activeCategory} Articles`}
          </h2>
          <span className="text-xs text-slate-500">
            {filteredPosts.length} {filteredPosts.length === 1 ? 'article' : 'articles'} found
          </span>
        </div>

        {filteredPosts.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center space-y-3">
            <BookOpen size={36} className="text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">No articles match your query</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try searching with a different keyword or resetting the category filter.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map(post => (
              <article 
                key={post.id}
                onClick={() => handleOpenPost(post)}
                className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all duration-300 group flex flex-col justify-between cursor-pointer hover:-translate-y-0.5"
              >
                <div>
                  {/* Cover Image */}
                  <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                    {post.coverImage ? (
                      <img 
                        src={post.coverImage} 
                        alt={post.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                        <BookOpen size={32} />
                      </div>
                    )}
                    <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-0.5 rounded-md border border-slate-700/50">
                      {post.category}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-2.5">
                    <div className="flex items-center gap-2 text-[10.5px] text-slate-400">
                      <Calendar size={12} />
                      <span>{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      {post.readTimeMinutes && (
                        <>
                          <span>•</span>
                          <span>{post.readTimeMinutes} min read</span>
                        </>
                      )}
                    </div>

                    <h3 className="font-display font-bold text-sm text-slate-900 group-hover:text-brand transition-colors line-clamp-2 leading-snug">
                      {post.title}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                      {post.excerpt}
                    </p>
                  </div>
                </div>

                {/* Card Footer Meta */}
                <div className="px-5 pb-5 pt-2 border-t border-slate-100/80 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <img 
                      src={resolveAuthorAvatar(post.authorName, post.authorAvatar)} 
                      alt={post.authorName} 
                      className="w-5.5 h-5.5 rounded-full object-cover border border-slate-200 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <span className="font-semibold text-slate-700 text-[11px] truncate">
                      {post.authorName}
                    </span>
                  </div>
                  <span className="text-brand font-bold text-[11px] flex items-center gap-0.5 group-hover:translate-x-1 transition-transform whitespace-nowrap shrink-0">
                    Read Article <ChevronRight size={12} className="shrink-0" />
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

    </div>
  );
};
