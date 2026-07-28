import { useState, useEffect, useRef } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { FastAverageColor } from 'fast-average-color'
import { 
  Search, Plus, Image as ImageIcon, Download, 
  VenetianMask, LayoutDashboard, Trash2, Eye, Settings,
  MoreVertical, Link2, ExternalLink, RefreshCw, Pencil, Share2
} from 'lucide-react'

const fac = new FastAverageColor();

function App() {
  const [columns, setColumns] = useState({});
  const [columnOrder, setColumnOrder] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wallpaper, setWallpaper] = useState(null);
  
  // Dynamic Styles State
  const [styleSettings, setStyleSettings] = useState({
    primaryColor: '#8a2b34',
    boardColor: '#a18b8c',
    boardOpacity: 85,
    boardBlur: 24,
    isDarkBg: true
  });

  const fileInputRef = useRef(null);

  // Modals & Menus State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [categoryInput, setCategoryInput] = useState('');
  
  const [activeMenuBoardId, setActiveMenuBoardId] = useState(null);
  const [activeInlineAddBoardId, setActiveInlineAddBoardId] = useState(null);
  const [inlineInputValue, setInlineInputValue] = useState('');

  // Edit Bookmark State
  const [editingBookmarkId, setEditingBookmarkId] = useState(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [editUrlValue, setEditUrlValue] = useState('');

  // Feature States
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.board-menu-container') && !e.target.closest('.board-menu-trigger')) {
        setActiveMenuBoardId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load bookmarks and settings
  useEffect(() => {
    loadBookmarks();
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['wallpaper', 'styleSettings'], (result) => {
        if (result.wallpaper) setWallpaper(result.wallpaper);
        if (result.styleSettings) setStyleSettings(result.styleSettings);
      });
    }
  }, []);

  const saveStyleSettings = (newSettings) => {
    setStyleSettings(newSettings);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ styleSettings: newSettings });
    }
  };

  const loadBookmarks = () => {
    if (typeof chrome !== 'undefined' && chrome.bookmarks) {
      chrome.bookmarks.getTree((tree) => {
        const rootNodes = tree[0]?.children || [];
        const bookmarksBar = rootNodes.find(n => n.id === "1") || rootNodes[0];
        
        if (!bookmarksBar || !bookmarksBar.children) {
          setColumns({});
          setColumnOrder([]);
          setLoading(false);
          return;
        }

        const newColumns = {};
        const newColumnOrder = [];
        const defaultCol = { id: "1", title: "Bookmarks Bar", bookmarks: [] };

        bookmarksBar.children.forEach(node => {
          if (node.children) {
            newColumns[node.id] = {
              id: node.id,
              title: node.title,
              bookmarks: node.children.filter(child => !child.children)
            };
            newColumnOrder.push(node.id);
          } else {
            defaultCol.bookmarks.push(node);
          }
        });

        if (defaultCol.bookmarks.length > 0) {
          newColumns["1"] = defaultCol;
          newColumnOrder.unshift("1");
        }
        
        setColumns(newColumns);
        setColumnOrder(newColumnOrder);
        setLoading(false);
      });
    } else {
      setColumns({
        "mock-1": {
          id: "mock-1",
          title: "Bookmarks Bar",
          bookmarks: [
            { id: "b1", title: "chrome.bookmarks | API | Chrome", url: "https://developer.chrome.com" },
            { id: "b2", title: "https://chatgpt.com/", url: "https://chatgpt.com" },
            { id: "b3", title: "Google", url: "https://google.com" },
          ]
        },
        "mock-2": {
          id: "mock-2",
          title: "Sites",
          bookmarks: [
            { id: "b4", title: "Instagram", url: "https://instagram.com" },
          ]
        }
      });
      setColumnOrder(["mock-1", "mock-2"]);
      setLoading(false);
    }
  };

  const onDragEnd = (result) => {
    const { source, destination, draggableId, type } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === 'column') {
      const newOrder = Array.from(columnOrder);
      newOrder.splice(source.index, 1);
      newOrder.splice(destination.index, 0, draggableId);
      setColumnOrder(newOrder);
      
      if (typeof chrome !== 'undefined' && chrome.bookmarks) {
        chrome.bookmarks.move(draggableId, { parentId: "1", index: destination.index });
      }
      return;
    }

    // Bookmark drag logic
    const sourceCol = columns[source.droppableId];
    const destCol = columns[destination.droppableId];
    const sourceBookmarks = [...sourceCol.bookmarks];
    const destBookmarks = source.droppableId === destination.droppableId ? sourceBookmarks : [...destCol.bookmarks];

    const [removed] = sourceBookmarks.splice(source.index, 1);
    destBookmarks.splice(destination.index, 0, removed);

    setColumns({
      ...columns,
      [source.droppableId]: { ...sourceCol, bookmarks: sourceBookmarks },
      [destination.droppableId]: { ...destCol, bookmarks: destBookmarks },
    });

    if (typeof chrome !== 'undefined' && chrome.bookmarks) {
      chrome.bookmarks.move(draggableId, {
        parentId: destination.droppableId,
        index: destination.index
      });
    }
  };

  const handleAddCategoryConfirm = () => {
    if (categoryInput && categoryInput.trim()) {
      if (typeof chrome !== 'undefined' && chrome.bookmarks) {
        chrome.bookmarks.create({ parentId: "1", title: categoryInput }, (newFolder) => {
          setColumns({
            ...columns,
            [newFolder.id]: { id: newFolder.id, title: newFolder.title, bookmarks: [] }
          });
          setColumnOrder([...columnOrder, newFolder.id]);
        });
      } else {
        const id = "mock-" + Date.now();
        setColumns({
          ...columns,
          [id]: { id, title: categoryInput, bookmarks: [] }
        });
        setColumnOrder([...columnOrder, id]);
      }
    }
    setIsCategoryModalOpen(false);
  };

  const handleDeleteBoard = (id) => {
    if (id === "1") return;
    if (typeof chrome !== 'undefined' && chrome.bookmarks) {
      chrome.bookmarks.removeTree(id, () => {
        const newCols = { ...columns };
        delete newCols[id];
        setColumns(newCols);
        setColumnOrder(columnOrder.filter(colId => colId !== id));
      });
    } else {
      const newCols = { ...columns };
      delete newCols[id];
      setColumns(newCols);
      setColumnOrder(columnOrder.filter(colId => colId !== id));
    }
    setActiveMenuBoardId(null);
  };

  const handleInlineAddLink = (boardId) => {
    if (inlineInputValue && inlineInputValue.trim()) {
      let url = inlineInputValue.trim();
      if (!url.startsWith('http')) url = 'https://' + url;

      if (typeof chrome !== 'undefined' && chrome.bookmarks) {
        chrome.bookmarks.create({ parentId: boardId, url: url, title: url }, (newBm) => {
          setColumns({
            ...columns,
            [boardId]: { ...columns[boardId], bookmarks: [...columns[boardId].bookmarks, newBm] }
          });
        });
      } else {
        const newBm = { id: "bm-" + Date.now(), title: url, url };
        setColumns({
          ...columns,
          [boardId]: { ...columns[boardId], bookmarks: [...columns[boardId].bookmarks, newBm] }
        });
      }
    }
    setActiveInlineAddBoardId(null);
    setInlineInputValue('');
  };

  const handleDeleteBookmark = (boardId, bmId) => {
    if (typeof chrome !== 'undefined' && chrome.bookmarks) {
      chrome.bookmarks.remove(bmId, () => {
        setColumns({
          ...columns,
          [boardId]: {
            ...columns[boardId],
            bookmarks: columns[boardId].bookmarks.filter(b => b.id !== bmId)
          }
        });
      });
    } else {
      setColumns({
        ...columns,
        [boardId]: {
          ...columns[boardId],
          bookmarks: columns[boardId].bookmarks.filter(b => b.id !== bmId)
        }
      });
    }
  };

  const handleSaveEditBookmark = (boardId) => {
    if (editUrlValue.trim() && editTitleValue.trim()) {
      if (typeof chrome !== 'undefined' && chrome.bookmarks) {
        chrome.bookmarks.update(editingBookmarkId, { title: editTitleValue, url: editUrlValue }, (updatedBm) => {
          setColumns({
            ...columns,
            [boardId]: {
              ...columns[boardId],
              bookmarks: columns[boardId].bookmarks.map(b => b.id === editingBookmarkId ? updatedBm : b)
            }
          });
        });
      } else {
        setColumns({
          ...columns,
          [boardId]: {
            ...columns[boardId],
            bookmarks: columns[boardId].bookmarks.map(b => b.id === editingBookmarkId ? { ...b, title: editTitleValue, url: editUrlValue } : b)
          }
        });
      }
    }
    setEditingBookmarkId(null);
  };

  const handleWallpaperUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        setWallpaper(base64);
        
        fac.getColorAsync(base64)
          .then(color => {
            saveStyleSettings({
              ...styleSettings,
              primaryColor: color.hex,
              boardColor: color.isDark ? '#2A2C31' : '#FFFFFF',
              isDarkBg: color.isDark
            });
            if (typeof chrome !== 'undefined' && chrome.storage) {
              chrome.storage.local.set({ wallpaper: base64 });
            }
            // Auto open settings when a new wallpaper is uploaded
            setIsSettingsOpen(true);
          })
          .catch(e => console.error(e));
      };
      reader.readAsDataURL(file);
    }
  };

  const hexToRgba = (hex, opacity) => {
    if (!hex || hex.length !== 7) return `rgba(255, 255, 255, ${opacity / 100})`;
    let r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
  };

  if (loading) return null;

  // Dark mode class mappings for Modals
  const isDark = styleSettings.isDarkBg;

  // Filter columns based on search
  const displayColumns = Object.keys(columns).reduce((acc, colId) => {
    const col = columns[colId];
    acc[colId] = {
      ...col,
      bookmarks: col.bookmarks.filter(b => 
        (b.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (b.url || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    };
    return acc;
  }, {});
  const modalBg = isDark ? 'bg-[#1a1c1f]' : 'bg-[#ecebe6]';
  const modalText = isDark ? 'text-[#f8f9fa]' : 'text-[#1c2b36]';
  const modalSubText = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-[#212328]' : 'bg-white/60';
  const inputBorder = isDark ? 'border-white/5' : 'border-black/10';
  const modalBorder = isDark ? 'border-white/10' : 'border-white/50';

  return (
    <div 
      className="min-h-screen transition-all duration-500 overflow-hidden font-sans"
      style={{
        backgroundColor: wallpaper ? 'transparent' : '#111111',
        backgroundImage: wallpaper ? `url(${wallpaper})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="relative z-10 p-12 max-w-[1500px] mx-auto h-screen flex flex-col">
        {/* Top Navigation Tabs */}
        <div className="flex items-center gap-3 mb-8 h-12">
          <button 
            className="px-6 py-2.5 rounded-2xl shadow-lg font-bold text-sm transition-transform hover:scale-[1.02] border-[0.5px] border-white/20"
            style={{ backgroundColor: styleSettings.primaryColor, color: '#ffffff' }}
          >
            Home
          </button>
          <button 
            onClick={() => { setCategoryInput(''); setIsCategoryModalOpen(true); }}
            className="backdrop-blur-xl font-bold px-3.5 py-2.5 rounded-2xl shadow-lg transition-all border-[0.5px] hover:scale-[1.02]"
            style={{ backgroundColor: hexToRgba(styleSettings.boardColor, styleSettings.boardOpacity), color: isDark ? '#ffffff' : '#1a1a1a', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
          
          {isSearchOpen && (
            <div className="ml-4 flex-1 max-w-md animate-in fade-in slide-in-from-left-4 duration-300 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={16} strokeWidth={2.5} />
              </div>
              <input 
                type="text"
                autoFocus
                placeholder="Search bookmarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl outline-none text-sm font-semibold border-[0.5px] shadow-lg backdrop-blur-xl transition-all"
                style={{ 
                  backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.6)', 
                  color: isDark ? '#ffffff' : '#1a1a1a',
                  borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'
                }}
              />
            </div>
          )}
        </div>

        {/* Kanban Board Container (Now Draggable!) */}
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="all-columns" direction="horizontal" type="column">
            {(provided) => (
              <div 
                className="flex gap-6 overflow-x-auto pb-8 items-start flex-1 no-scrollbar"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {columnOrder.map((columnId, index) => {
                  const column = columns[columnId];
                  return (
                    <Draggable key={column.id} draggableId={column.id} index={index}>
                      {(provided, snapshot) => (
                        <div 
                          ref={provided.innerRef} 
                          {...provided.draggableProps} 
                          {...provided.dragHandleProps}
                          className={`w-[300px] shrink-0 flex flex-col gap-3 rounded-[24px] p-5 transition-all relative ${snapshot.isDragging ? 'shadow-2xl scale-105 z-50 ring-1 ring-white/30' : ''}`}
                          style={{ 
                            backgroundColor: hexToRgba(styleSettings.boardColor, styleSettings.boardOpacity),
                            backdropFilter: `blur(${styleSettings.boardBlur}px) saturate(150%)`,
                            WebkitBackdropFilter: `blur(${styleSettings.boardBlur}px) saturate(150%)`,
                            border: isDark ? '0.5px solid rgba(255,255,255,0.12)' : '0.5px solid rgba(0,0,0,0.08)',
                            boxShadow: snapshot.isDragging ? '0 24px 48px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.08)'
                          }}
                        >
                          <Droppable droppableId={column.id} type="bookmark">
                            {(provided) => (
                              <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-col min-h-[50px]">
                                
                                {/* Column Header & Actions */}
                                <div className="flex items-center justify-between mb-2">
                                  <div className="font-extrabold text-[15px] tracking-tight" style={{ color: isDark ? '#ffffff' : '#1e293b' }}>
                                    {column.title}
                                  </div>
                                  <div className="flex items-center gap-0.5">
                                    <button 
                                      onClick={() => {
                                        setActiveInlineAddBoardId(activeInlineAddBoardId === column.id ? null : column.id);
                                        setInlineInputValue('');
                                      }}
                                      className="p-1.5 rounded-lg transition-colors"
                                      style={{ color: isDark ? '#e2e8f0' : '#475569', backgroundColor: activeInlineAddBoardId === column.id ? hexToRgba(styleSettings.primaryColor, 30) : 'transparent' }}
                                    >
                                      <Link2 size={16} strokeWidth={2.5}/>
                                    </button>
                                    <button 
                                      onClick={() => setActiveMenuBoardId(activeMenuBoardId === column.id ? null : column.id)}
                                      className="board-menu-trigger p-1.5 rounded-lg hover:bg-black/10 transition-colors"
                                      style={{ color: isDark ? '#e2e8f0' : '#475569' }}
                                    >
                                      <MoreVertical size={16} strokeWidth={2.5}/>
                                    </button>
                                  </div>
                                </div>

                                <div className="h-px mb-3 w-full" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}></div>

                                {/* Dropdown Menu */}
                                {activeMenuBoardId === column.id && (
                                  <div className="board-menu-container absolute top-12 right-2 w-44 rounded-xl shadow-xl border flex flex-col p-1.5 z-50"
                                       style={{ backgroundColor: isDark ? '#222428' : '#f2ede9', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
                                    <button className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold ${isDark ? 'text-slate-200 hover:bg-white/5' : 'text-slate-700 hover:bg-black/5'}`}><ExternalLink size={14}/> Open All Links</button>
                                    <button className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold ${isDark ? 'text-slate-200 hover:bg-white/5' : 'text-slate-700 hover:bg-black/5'}`}><RefreshCw size={14}/> Fetch Titles</button>
                                    <button className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold ${isDark ? 'text-slate-200 hover:bg-white/5' : 'text-slate-700 hover:bg-black/5'}`}><Pencil size={14}/> Edit Board</button>
                                    <button className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold ${isDark ? 'text-slate-200 hover:bg-white/5' : 'text-slate-700 hover:bg-black/5'}`}><Share2 size={14}/> Share Board</button>
                                    <div className="h-px my-1 mx-2" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}></div>
                                    <button onClick={() => handleDeleteBoard(column.id)} className="flex items-center gap-2.5 px-3 py-2 hover:bg-[#ffe5e5]/10 text-[#d9304f] rounded-lg text-[13px] font-bold transition-colors"><Trash2 size={14}/> Delete Board</button>
                                  </div>
                                )}

                                  <div className="flex-1 flex flex-col gap-2 relative">
                                    {displayColumns[column.id].bookmarks.map((bookmark, index) => (
                                    <Draggable key={bookmark.id} draggableId={bookmark.id} index={index}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          className={`group relative flex items-center gap-3 py-2.5 px-3.5 rounded-[14px] transition-all border-[0.5px] ${
                                            snapshot.isDragging ? 'shadow-2xl z-50 scale-105' : 'shadow-sm hover:scale-[1.02]'
                                          }`}
                                          style={{ 
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.4)',
                                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                                            ...(snapshot.isDragging && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' })
                                          }}
                                        >
                                          {editingBookmarkId === bookmark.id ? (
                                            <div className="flex flex-col gap-1 w-full relative z-50">
                                              <input type="text" className="w-full bg-transparent border-b border-white/20 text-sm outline-none font-medium" value={editTitleValue} onChange={e => setEditTitleValue(e.target.value)} autoFocus />
                                              <input type="text" className="w-full bg-transparent border-b border-white/20 text-xs text-slate-400 outline-none" value={editUrlValue} onChange={e => setEditUrlValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveEditBookmark(column.id)} />
                                            </div>
                                          ) : (
                                            <>
                                              <img 
                                                src={`https://www.google.com/s2/favicons?domain=${bookmark.url ? new URL(bookmark.url).hostname : 'localhost'}&sz=32`}
                                                alt=""
                                                className="w-4 h-4 rounded-md shrink-0 bg-transparent drop-shadow-sm"
                                              />
                                              <a href={bookmark.url} className={`text-sm font-medium transition-colors truncate flex-1 ${isDark ? 'text-slate-200 hover:text-white' : 'text-[#334155] hover:text-black'}`}>
                                                {bookmark.title}
                                              </a>
                                              
                                              {/* Inline Hover Actions */}
                                              <div className={`absolute right-1 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity p-1 rounded-full`}
                                                   style={{ backgroundColor: hexToRgba(styleSettings.boardColor, 100) }}>
                                                <button 
                                                  onClick={(e) => { e.preventDefault(); setEditingBookmarkId(bookmark.id); setEditTitleValue(bookmark.title); setEditUrlValue(bookmark.url); }}
                                                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
                                                >
                                                  <Pencil size={12} strokeWidth={3} />
                                                </button>
                                                <button 
                                                  onClick={(e) => { e.preventDefault(); handleDeleteBookmark(column.id, bookmark.id); }}
                                                  className="p-1.5 rounded-full text-[#d9304f] hover:bg-[#d9304f]/20 transition-colors"
                                                >
                                                  <Trash2 size={12} strokeWidth={3} />
                                                </button>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}

                                  {/* Inline Add Link */}
                                  {activeInlineAddBoardId === column.id && (
                                    <div className="mt-1 p-2 border rounded-2xl flex flex-col gap-2 shadow-inner" style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)' }}>
                                      <input 
                                        type="text"
                                        autoFocus
                                        placeholder="https://example.com"
                                        className="w-full rounded-xl px-3 py-2 text-[13px] font-semibold outline-none"
                                        style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)', color: isDark ? 'white' : 'black' }}
                                        value={inlineInputValue}
                                        onChange={(e) => setInlineInputValue(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleInlineAddLink(column.id)}
                                      />
                                      <div className="flex gap-2">
                                        <button onClick={() => handleInlineAddLink(column.id)} className="flex-1 text-white py-1.5 rounded-xl text-[13px] font-bold shadow-sm hover:opacity-90" style={{ backgroundColor: styleSettings.primaryColor }}>Add</button>
                                        <button onClick={() => setActiveInlineAddBoardId(null)} className="flex-1 border text-[#d9304f] py-1.5 rounded-xl text-[13px] font-bold shadow-sm hover:bg-red-500/10" style={{ borderColor: isDark ? 'rgba(217,48,79,0.3)' : '#f0cdd4' }}>Cancel</button>
                                      </div>
                                    </div>
                                  )}
                                </div>

                              </div>
                            )}
                          </Droppable>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
                
                {/* Add New Column (Dashed Outline) */}
                <button 
                  onClick={() => { setCategoryInput(''); setIsCategoryModalOpen(true); }}
                  className="w-[300px] shrink-0 h-[72px] rounded-[24px] border-[1px] border-dashed flex items-center justify-center transition-all hover:scale-[1.02] gap-2 font-bold text-sm shadow-sm"
                  style={{ 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.2)',
                    borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                    color: isDark ? 'rgba(255,255,255,0.8)' : '#334155',
                    backdropFilter: 'blur(16px)'
                  }}
                >
                  <Plus size={18} strokeWidth={2.5} />
                  ADD BOARD
                </button>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed right-8 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-40">
        {[
          { icon: Search, id: 'search', onClick: () => { setIsSearchOpen(!isSearchOpen); if (isSearchOpen) setSearchQuery(''); } },
          { icon: Download, id: 'download', onClick: () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(columns));
            const dlAnchorElem = document.createElement('a');
            dlAnchorElem.setAttribute("href", dataStr);
            dlAnchorElem.setAttribute("download", "bookmarks_backup.json");
            dlAnchorElem.click();
          }},
          { icon: VenetianMask, id: 'incognito', onClick: () => alert('Incognito mode ready! (Depends on Chrome API)') },
          { icon: LayoutDashboard, id: 'dashboard', onClick: () => alert('Dashboard analytics coming soon!') },
          { icon: Trash2, id: 'trash', onClick: () => alert('Trash can for deleted items.') },
          { icon: Eye, id: 'view', onClick: () => {
            saveStyleSettings({...styleSettings, isDarkBg: !styleSettings.isDarkBg});
          }},
        ].map((btn) => (
          <button key={btn.id} onClick={btn.onClick} className="w-[42px] h-[42px] backdrop-blur-xl rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 border-[0.5px]" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)', color: isDark ? 'white' : '#334155', borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }}>
            <btn.icon size={18} strokeWidth={2.2} />
          </button>
        ))}
        {/* Settings Button */}
        <button onClick={() => setIsSettingsOpen(true)} className="w-[42px] h-[42px] rounded-full flex items-center justify-center shadow-xl hover:opacity-90 hover:scale-110 transition-all border-[0.5px] border-white/20" style={{ backgroundColor: styleSettings.primaryColor, color: '#ffffff' }}>
          <Settings size={18} strokeWidth={2.2} />
        </button>
      </div>

      <div className="fixed left-8 bottom-8 z-40">
        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleWallpaperUpload} />
        <button onClick={() => fileInputRef.current?.click()} className="w-[42px] h-[42px] backdrop-blur-xl rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 border-[0.5px]" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)', color: isDark ? 'white' : '#334155', borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }}>
          <ImageIcon size={18} strokeWidth={2.2} />
        </button>
      </div>

      {/* Settings Modal (Dark Mode Supported) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className={`${modalBg} ${modalBorder} w-full max-w-md rounded-3xl p-7 shadow-2xl border transition-colors`}>
            <h3 className={`text-xl font-extrabold ${modalText} mb-1`}>Adjust Wallpaper Style</h3>
            <p className={`text-[13px] font-medium ${modalSubText} mb-6`}>{isDark ? 'Dark theme' : 'Light theme'} on this device.</p>
            
            <div className="flex gap-4 mb-5">
              <div className={`${inputBg} ${inputBorder} flex-1 rounded-2xl p-3 border transition-colors`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-[13px] font-extrabold ${modalText}`}>Primary</span>
                </div>
                <div className="relative h-10 rounded-xl overflow-hidden border border-black/10">
                  <input type="color" className="absolute -top-2 -left-2 w-32 h-20 cursor-pointer" value={styleSettings.primaryColor} onChange={e => saveStyleSettings({...styleSettings, primaryColor: e.target.value})} />
                  <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: styleSettings.primaryColor }}></div>
                </div>
              </div>
              <div className={`${inputBg} ${inputBorder} flex-1 rounded-2xl p-3 border transition-colors`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-[13px] font-extrabold ${modalText}`}>Board</span>
                </div>
                <div className="relative h-10 rounded-xl overflow-hidden border border-black/10">
                  <input type="color" className="absolute -top-2 -left-2 w-32 h-20 cursor-pointer" value={styleSettings.boardColor} onChange={e => saveStyleSettings({...styleSettings, boardColor: e.target.value})} />
                  <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: styleSettings.boardColor }}></div>
                </div>
              </div>
            </div>

            <div className={`${inputBg} ${inputBorder} rounded-2xl p-4 border mb-6 flex flex-col gap-5 transition-colors`}>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-[13px] font-extrabold ${modalText}`}>Opacity</span>
                  <span className={`text-[13px] font-bold ${modalSubText}`}>{styleSettings.boardOpacity}%</span>
                </div>
                <input type="range" min="0" max="100" className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} value={styleSettings.boardOpacity} onChange={e => saveStyleSettings({...styleSettings, boardOpacity: parseInt(e.target.value)})} style={{ accentColor: styleSettings.primaryColor }} />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-[13px] font-extrabold ${modalText}`}>Blur Amount</span>
                  <span className={`text-[13px] font-bold ${modalSubText}`}>{styleSettings.boardBlur}px</span>
                </div>
                <input type="range" min="0" max="32" className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} value={styleSettings.boardBlur} onChange={e => saveStyleSettings({...styleSettings, boardBlur: parseInt(e.target.value)})} style={{ accentColor: styleSettings.primaryColor }} />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setIsSettingsOpen(false)} className={`px-5 py-2 rounded-xl font-bold text-[13px] transition-colors ${isDark ? 'text-slate-300 bg-white/10 hover:bg-white/20' : 'text-slate-600 bg-black/5 hover:bg-black/10'}`}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Board Modal (Not requested to change, but good to keep consistent) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className={`${modalBg} ${modalBorder} w-full max-w-md rounded-3xl p-8 shadow-2xl border`}>
            <h3 className={`text-lg font-extrabold ${modalText} mb-6`}>New Board</h3>
            <p className={`text-[13px] font-semibold ${modalSubText} mb-2`}>Enter folder name:</p>
            <input type="text" autoFocus className={`w-full bg-transparent border-2 rounded-xl px-4 py-2.5 outline-none font-semibold ${modalText} mb-6 text-[14px]`} style={{ borderColor: hexToRgba(styleSettings.primaryColor, 40) }} value={categoryInput} onChange={(e) => setCategoryInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddCategoryConfirm()} />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsCategoryModalOpen(false)} className={`px-6 py-2 rounded-xl font-bold text-[13px] ${isDark ? 'text-slate-300 bg-white/10' : 'text-slate-600 bg-black/5'}`}>Cancel</button>
              <button onClick={handleAddCategoryConfirm} className="px-8 py-2 rounded-xl font-bold text-white text-[13px]" style={{ backgroundColor: styleSettings.primaryColor }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
