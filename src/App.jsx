import { useState, useEffect, useRef } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { FastAverageColor } from 'fast-average-color'
import { 
  Search, Plus, Image as ImageIcon, Download, 
  VenetianMask, LayoutDashboard, Trash2, Eye, Settings,
  MoreVertical, Link2, ExternalLink, RefreshCw, Pencil, Share2
} from 'lucide-react'
import {
  DEFAULT_STYLE_SETTINGS,
  cleanBookmarkTitle,
  getFaviconUrl,
  hasChromeApi,
  hexToRgba,
} from './lib/bookmarkUtils'

const fac = new FastAverageColor();

function App() {
  const [columns, setColumns] = useState({});
  const [columnOrder, setColumnOrder] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wallpaper, setWallpaper] = useState(null);
  const [numCols, setNumCols] = useState(4);
  
  // Dynamic Styles State
  const [styleSettings, setStyleSettings] = useState(DEFAULT_STYLE_SETTINGS);

  const fileInputRef = useRef(null);

  // Modals & Menus State
  const [activeAddBoardColIndex, setActiveAddBoardColIndex] = useState(null);
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
  
  // Navigation Tabs State
  const [activeTab, setActiveTab] = useState('Home');
  const [tabs, setTabs] = useState(['Home', 'Work', 'Personal']);
  const [boardTabs, setBoardTabs] = useState({});
  const [isTabModalOpen, setIsTabModalOpen] = useState(false);
  const [tabInput, setTabInput] = useState('');
  
  // 2D Board Layout State
  const [boardLayout2D, setBoardLayout2D] = useState({});

  // FAB Feature States
  const [isIncognito, setIsIncognito] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [bookmarksBarId, setBookmarksBarId] = useState("1");
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [trashBoardId, setTrashBoardId] = useState(null);

  const cleanTitle = cleanBookmarkTitle;

  // Stats calculation
  const getTotalBookmarks = () => Object.values(columns).reduce((acc, col) => acc + col.bookmarks.length, 0);
  const getTotalBoards = () => Object.keys(columns).length;
  const getMostPopulatedBoard = () => {
    let max = 0;
    let name = '-';
    Object.values(columns).forEach(col => {
      if (col.bookmarks.length > max) {
        max = col.bookmarks.length;
        name = col.title;
      }
    });
    return { name, count: max };
  };

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

  // Responsive Masonry Columns
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) setNumCols(1);
      else if (width < 900) setNumCols(2);
      else if (width < 1200) setNumCols(3);
      else if (width < 1600) setNumCols(4);
      else setNumCols(5);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load bookmarks and settings
  useEffect(() => {
    loadBookmarks();
    if (hasChromeApi('storage')) {
      chrome.storage.local.get(['wallpaper', 'styleSettings', 'boardTabs', 'tabs', 'boardLayout2D'], (result) => {
        if (result.wallpaper) setWallpaper(result.wallpaper);
        if (result.styleSettings) setStyleSettings(result.styleSettings);
        if (result.boardTabs) setBoardTabs(result.boardTabs);
        if (result.tabs) setTabs(result.tabs);
        if (result.boardLayout2D) setBoardLayout2D(result.boardLayout2D);
      });
    } else {
      const mockWallpaper = window.localStorage.getItem('mock_wallpaper');
      if (mockWallpaper) setWallpaper(JSON.parse(mockWallpaper));
      const mockStyleSettings = window.localStorage.getItem('mock_styleSettings');
      if (mockStyleSettings) setStyleSettings(JSON.parse(mockStyleSettings));
      const mockBoardTabs = window.localStorage.getItem('mock_boardTabs');
      if (mockBoardTabs) setBoardTabs(JSON.parse(mockBoardTabs));
      const mockTabs = window.localStorage.getItem('mock_tabs');
      if (mockTabs) setTabs(JSON.parse(mockTabs));
      const mockBoardLayout2D = window.localStorage.getItem('mock_boardLayout2D');
      if (mockBoardLayout2D) setBoardLayout2D(JSON.parse(mockBoardLayout2D));
    }
  }, []);

  const saveStyleSettings = (newSettings) => {
    setStyleSettings(newSettings);
    if (hasChromeApi('storage')) {
      chrome.storage.local.set({ styleSettings: newSettings });
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!hasChromeApi('bookmarks')) {
      if (Object.keys(columns).length > 0) {
        window.localStorage.setItem('mock_columns', JSON.stringify(columns));
        window.localStorage.setItem('mock_columnOrder', JSON.stringify(columnOrder));
      }
    }
  }, [columns, columnOrder, loading]);

  useEffect(() => {
    if (loading) return;
    if (!hasChromeApi('storage')) {
      window.localStorage.setItem('mock_boardTabs', JSON.stringify(boardTabs));
      window.localStorage.setItem('mock_tabs', JSON.stringify(tabs));
      window.localStorage.setItem('mock_boardLayout2D', JSON.stringify(boardLayout2D));
      window.localStorage.setItem('mock_styleSettings', JSON.stringify(styleSettings));
      if (wallpaper) window.localStorage.setItem('mock_wallpaper', JSON.stringify(wallpaper));
    }
  }, [boardTabs, tabs, boardLayout2D, styleSettings, wallpaper, loading]);

  const loadBookmarks = () => {
    if (hasChromeApi('bookmarks')) {
      chrome.bookmarks.getTree((tree) => {
        const rootNodes = tree[0]?.children || [];
        const bookmarksBar = rootNodes.find(n => n.id === "1") || rootNodes[0];
        
        if (!bookmarksBar || !bookmarksBar.children) {
          setColumns({});
          setColumnOrder([]);
          setLoading(false);
          return;
        }
        setBookmarksBarId(bookmarksBar.id);

        const newColumns = {};
        const newColumnOrder = [];
        const defaultCol = { id: "1", title: "Bookmarks Bar", bookmarks: [] };
        let foundTrashId = null;

        bookmarksBar.children.forEach(node => {
          if (node.children) {
            if (node.title === "[Trash]") {
              foundTrashId = node.id;
              newColumns[node.id] = {
                id: node.id,
                title: node.title,
                bookmarks: node.children.filter(child => !child.children)
              };
            } else {
              newColumns[node.id] = {
                id: node.id,
                title: node.title,
                bookmarks: node.children.filter(child => !child.children)
              };
              newColumnOrder.push(node.id);
            }
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
        setTrashBoardId(foundTrashId);
        setLoading(false);
      });
    } else {
      const mockColumnsStr = window.localStorage.getItem('mock_columns');
      const mockColumnOrderStr = window.localStorage.getItem('mock_columnOrder');
      if (mockColumnsStr && mockColumnOrderStr) {
        setColumns(JSON.parse(mockColumnsStr));
        setColumnOrder(JSON.parse(mockColumnOrderStr));
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
      }
      setLoading(false);
    }
  };

  const getActiveLayoutInfo = () => {
    const activeIds = columnOrder.filter(id => (boardTabs[id] || 'Home') === activeTab);
    let layout;
    
    if (boardLayout2D[activeTab] && boardLayout2D[activeTab][numCols]) {
      const savedLayout = boardLayout2D[activeTab][numCols];
      layout = savedLayout.map(col => col.filter(id => activeIds.includes(id)));
      const renderedIds = new Set(layout.flat());
      const missingIds = activeIds.filter(id => !renderedIds.has(id));
      missingIds.forEach(id => {
        let minCol = 0;
        for (let i = 1; i < numCols; i++) {
          if (layout[i].length < layout[minCol].length) minCol = i;
        }
        layout[minCol].push(id);
      });
    } else {
      layout = Array.from({ length: numCols }, () => []);
      activeIds.forEach((id, index) => {
        layout[index % numCols].push(id);
      });
    }

    return { layout };
  };

  const onDragEnd = (result) => {
    const { source, destination, draggableId, type } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === 'board') {
      const sourceDroppable = source.droppableId;
      const destDroppable = destination.droppableId;
      
      if (sourceDroppable.startsWith('masonry-col-') && destDroppable.startsWith('masonry-col-')) {
        const sourceColIndex = parseInt(sourceDroppable.split('-')[2]);
        const destColIndex = parseInt(destDroppable.split('-')[2]);
        
        const { layout } = getActiveLayoutInfo();
        
        // Move item
        const [movedBoard] = layout[sourceColIndex].splice(source.index, 1);
        layout[destColIndex].splice(destination.index, 0, movedBoard);
        
        const newBoardLayout2D = {
          ...boardLayout2D,
          [activeTab]: {
            ...(boardLayout2D[activeTab] || {}),
            [numCols]: layout
          }
        };
        setBoardLayout2D(newBoardLayout2D);
        if (hasChromeApi('storage')) {
          chrome.storage.local.set({ boardLayout2D: newBoardLayout2D });
        }
        
        // Flatten and update global order for fallback
        const flatLayout = layout.flat();
        const newGlobalOrder = [...columnOrder];
        let visibleIdx = 0;
        for (let i = 0; i < newGlobalOrder.length; i++) {
           if ((boardTabs[newGlobalOrder[i]] || 'Home') === activeTab) {
              newGlobalOrder[i] = flatLayout[visibleIdx++];
           }
        }
        setColumnOrder(newGlobalOrder);
        
        if (hasChromeApi('bookmarks')) {
          flatLayout.forEach((id) => {
             chrome.bookmarks.move(id, { parentId: "1", index: newGlobalOrder.indexOf(id) });
          });
        }
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

    if (hasChromeApi('bookmarks')) {
      chrome.bookmarks.move(draggableId, {
        parentId: destination.droppableId,
        index: destination.index
      });
    }
  };

  const handleAddTabConfirm = () => {
    if (tabInput && tabInput.trim() && !tabs.includes(tabInput.trim())) {
      const newTabs = [...tabs, tabInput.trim()];
      setTabs(newTabs);
      if (hasChromeApi('storage')) {
        chrome.storage.local.set({ tabs: newTabs });
      }
      setActiveTab(tabInput.trim());
    }
    setTabInput('');
    setIsTabModalOpen(false);
  };

  const handleAddCategoryConfirm = () => {
    if (categoryInput && categoryInput.trim()) {
      const processNewBoard = (newFolderId, newFolderTitle) => {
        setColumns(prev => ({
          ...prev,
          [newFolderId]: { id: newFolderId, title: newFolderTitle, bookmarks: [] }
        }));
        setColumnOrder(prev => [...prev, newFolderId]);
        
        const newBoardTabs = { ...boardTabs, [newFolderId]: activeTab };
        setBoardTabs(newBoardTabs);
        if (hasChromeApi('storage')) {
          chrome.storage.local.set({ boardTabs: newBoardTabs });
        }

        if (activeAddBoardColIndex !== null) {
          const { layout } = getActiveLayoutInfo();
          layout[activeAddBoardColIndex].push(newFolderId);
          
          const newBoardLayout2D = {
            ...boardLayout2D,
            [activeTab]: {
              ...(boardLayout2D[activeTab] || {}),
              [numCols]: layout
            }
          };
          setBoardLayout2D(newBoardLayout2D);
          if (hasChromeApi('storage')) {
            chrome.storage.local.set({ boardLayout2D: newBoardLayout2D });
          }
        }
      };

      if (hasChromeApi('bookmarks')) {
        chrome.bookmarks.create({ parentId: bookmarksBarId, title: categoryInput }, (newFolder) => {
          processNewBoard(newFolder.id, newFolder.title);
        });
      } else {
        const id = "mock-" + Date.now();
        processNewBoard(id, categoryInput);
      }
    }
    setActiveAddBoardColIndex(null);
  };

  const handleDeleteBoard = (id) => {
    if (id === "1") return;
    if (hasChromeApi('bookmarks')) {
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

      if (hasChromeApi('bookmarks')) {
        chrome.bookmarks.create({ parentId: boardId, url: url, title: cleanTitle(url) }, (newBm) => {
          setColumns({
            ...columns,
            [boardId]: { ...columns[boardId], bookmarks: [...columns[boardId].bookmarks, newBm] }
          });
        });
      } else {
        const newBm = { id: "bm-" + Date.now(), title: cleanTitle(url), url };
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
    const bm = columns[boardId].bookmarks.find(b => b.id === bmId);
    
    if (trashBoardId) {
      if (hasChromeApi('bookmarks')) {
        chrome.bookmarks.move(bmId, { parentId: trashBoardId }, () => {
          setColumns({
            ...columns,
            [boardId]: { ...columns[boardId], bookmarks: columns[boardId].bookmarks.filter(b => b.id !== bmId) },
            [trashBoardId]: { ...columns[trashBoardId], bookmarks: [...columns[trashBoardId].bookmarks, bm] }
          });
        });
      } else {
        setColumns({
          ...columns,
          [boardId]: { ...columns[boardId], bookmarks: columns[boardId].bookmarks.filter(b => b.id !== bmId) },
          [trashBoardId]: { ...columns[trashBoardId], bookmarks: [...columns[trashBoardId].bookmarks, bm] }
        });
      }
    } else {
      if (hasChromeApi('bookmarks')) {
        chrome.bookmarks.create({ parentId: "1", title: "[Trash]" }, (newFolder) => {
          setTrashBoardId(newFolder.id);
          chrome.bookmarks.move(bmId, { parentId: newFolder.id }, () => {
            setColumns({
              ...columns,
              [boardId]: { ...columns[boardId], bookmarks: columns[boardId].bookmarks.filter(b => b.id !== bmId) },
              [newFolder.id]: { id: newFolder.id, title: "[Trash]", bookmarks: [bm] }
            });
          });
        });
      } else {
         const newTrashId = "trash-" + Date.now();
         setTrashBoardId(newTrashId);
         setColumns({
            ...columns,
            [boardId]: { ...columns[boardId], bookmarks: columns[boardId].bookmarks.filter(b => b.id !== bmId) },
            [newTrashId]: { id: newTrashId, title: "[Trash]", bookmarks: [bm] }
         });
      }
    }
  };

  const handleRestoreBookmark = (bmId) => {
    const bm = columns[trashBoardId].bookmarks.find(b => b.id === bmId);
    if (hasChromeApi('bookmarks')) {
      chrome.bookmarks.move(bmId, { parentId: "1" }, () => {
        setColumns({
          ...columns,
          [trashBoardId]: { ...columns[trashBoardId], bookmarks: columns[trashBoardId].bookmarks.filter(b => b.id !== bmId) },
          ["1"]: columns["1"] ? { ...columns["1"], bookmarks: [...columns["1"].bookmarks, bm] } : { id: "1", title: "Bookmarks Bar", bookmarks: [bm] }
        });
        if (!columnOrder.includes("1")) setColumnOrder(["1", ...columnOrder]);
      });
    } else {
        setColumns({
          ...columns,
          [trashBoardId]: { ...columns[trashBoardId], bookmarks: columns[trashBoardId].bookmarks.filter(b => b.id !== bmId) },
          ["1"]: columns["1"] ? { ...columns["1"], bookmarks: [...columns["1"].bookmarks, bm] } : { id: "1", title: "Bookmarks Bar", bookmarks: [bm] }
        });
        if (!columnOrder.includes("1")) setColumnOrder(["1", ...columnOrder]);
    }
  };

  const handlePermanentDeleteBookmark = (bmId) => {
    if (hasChromeApi('bookmarks')) {
      chrome.bookmarks.remove(bmId, () => {
        setColumns({
          ...columns,
          [trashBoardId]: { ...columns[trashBoardId], bookmarks: columns[trashBoardId].bookmarks.filter(b => b.id !== bmId) }
        });
      });
    } else {
        setColumns({
          ...columns,
          [trashBoardId]: { ...columns[trashBoardId], bookmarks: columns[trashBoardId].bookmarks.filter(b => b.id !== bmId) }
        });
    }
  };

  const handleEmptyTrash = () => {
    if (!trashBoardId || !columns[trashBoardId] || columns[trashBoardId].bookmarks.length === 0) return;
    if (hasChromeApi('bookmarks')) {
      chrome.bookmarks.removeTree(trashBoardId, () => {
        const newCols = { ...columns };
        delete newCols[trashBoardId];
        setColumns(newCols);
        setTrashBoardId(null);
      });
    } else {
      const newCols = { ...columns };
      delete newCols[trashBoardId];
      setColumns(newCols);
      setTrashBoardId(null);
    }
  };

  const handleSaveEditBookmark = (boardId) => {
    if (editUrlValue.trim() && editTitleValue.trim()) {
      if (hasChromeApi('bookmarks')) {
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
            if (hasChromeApi('storage')) {
              chrome.storage.local.set({ wallpaper: base64 });
            }
            // Auto open settings when a new wallpaper is uploaded
            setIsSettingsOpen(true);
          })
          .catch(() => {
            saveStyleSettings({
              ...styleSettings,
              boardColor: DEFAULT_STYLE_SETTINGS.boardColor,
            });
            setIsSettingsOpen(true);
          });
      };
      reader.readAsDataURL(file);
    }
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
  const inputBg = isDark ? 'bg-black/20' : 'bg-white/40';
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
        <div className="flex items-center gap-3 mb-8 h-12 shrink-0 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-[10px] font-semibold text-[13px] transition-all border ${
                activeTab === tab 
                  ? 'shadow-md scale-100'
                  : 'shadow-sm hover:scale-[1.02]'
              }`}
              style={{ 
                backgroundColor: activeTab === tab ? styleSettings.primaryColor : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                color: activeTab === tab ? '#ffffff' : (isDark ? '#e2e8f0' : '#475569'),
                borderColor: activeTab === tab ? styleSettings.primaryColor : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)')
              }}
            >
              {tab}
            </button>
          ))}
          {!isTabModalOpen ? (
            <button 
              onClick={() => { setTabInput(''); setIsTabModalOpen(true); }}
              className="backdrop-blur-xl font-bold px-3.5 py-2.5 rounded-[10px] shadow-lg transition-all border-[0.5px] hover:scale-[1.02]"
              style={{ backgroundColor: hexToRgba(styleSettings.boardColor, styleSettings.boardOpacity), color: isDark ? '#ffffff' : '#1a1a1a', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          ) : (
            <div 
              className="flex items-center gap-2 p-1.5 rounded-[10px] border shadow-sm transition-all"
              style={{ 
                backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.7)', 
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                backdropFilter: 'blur(16px)'
              }}
            >
              <input 
                type="text" 
                autoFocus 
                placeholder="New Page Name..." 
                className="w-[120px] bg-transparent pl-2 text-[13px] font-medium outline-none"
                style={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)' }}
                value={tabInput} 
                onChange={(e) => setTabInput(e.target.value)} 
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTabConfirm();
                  if (e.key === 'Escape') setIsTabModalOpen(false);
                }} 
              />
              <button 
                onClick={handleAddTabConfirm} 
                className="shrink-0 px-2.5 py-1.5 rounded-[6px] font-bold text-[11px] hover:scale-105 active:scale-95 transition-all shadow-sm"
                style={{ backgroundColor: styleSettings.primaryColor, color: 'white' }}
              >
                Add
              </button>
              <button 
                onClick={() => setIsTabModalOpen(false)} 
                className="shrink-0 w-[24px] h-[24px] flex items-center justify-center rounded-[6px] hover:scale-105 active:scale-95 transition-all shadow-sm"
                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: isDark ? '#f87171' : '#ef4444' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
          )}
          
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
          <div data-testid="board-layout" className="flex gap-6 overflow-y-auto pb-8 items-start flex-1 min-h-0 no-scrollbar pr-8">
            {(() => {
              const { layout } = getActiveLayoutInfo();
              return layout.map((colIds, colIndex) => (
              <Droppable key={colIndex} droppableId={`masonry-col-${colIndex}`} direction="vertical" type="board">
                {(provided) => (
                  <div 
                    className="group flex flex-col gap-6 items-start shrink-0 min-w-[220px]"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {colIds.map((columnId, mapIndex) => {
                        const column = columns[columnId];
                        if (!column) return null;
                        return (
                          <Draggable key={column.id} draggableId={column.id} index={mapIndex}>
                            {(provided, snapshot) => (
                              <div 
                                ref={provided.innerRef} 
                                {...provided.draggableProps} 
                                data-testid="bookmark-board"
                                className={`group/board w-[220px] max-h-[800px] shrink-0 flex flex-col gap-2.5 rounded-[10px] px-3.5 pt-3.5 pb-1.5 transition-all relative ${snapshot.isDragging ? 'shadow-2xl scale-105 z-50 ring-1 ring-white/30' : ''}`}
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
                                    <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-col min-h-[50px] overflow-y-auto overflow-x-hidden no-scrollbar flex-1">
                                      
                                      {/* Column Header & Actions */}
                                      <div className="flex items-center justify-between mb-2 cursor-grab active:cursor-grabbing" {...provided.dragHandleProps}>
                                        <div className="font-extrabold text-[15px] tracking-tight" style={{ color: isDark ? '#ffffff' : '#1e293b' }}>
                                          {column.title}
                                        </div>
                                        <div className={`flex items-center gap-0.5 transition-opacity duration-200 ${(activeInlineAddBoardId === column.id || activeMenuBoardId === column.id) ? 'opacity-100' : 'opacity-0 group-hover/board:opacity-100'}`}>
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

                                        <div className="flex-1 flex flex-col gap-0.5 relative">
                                          {displayColumns[column.id].bookmarks.map((bookmark, idx) => (
                                          <Draggable key={bookmark.id} draggableId={bookmark.id} index={idx}>
                                            {(provided, snapshot) => (
                                              <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className={`group relative flex items-center gap-2 py-1.5 px-2.5 rounded-lg transition-all ${
                                                  snapshot.isDragging ? 'z-50 scale-105 shadow-xl bg-black/10 dark:bg-white/10 ring-1 ring-black/5 dark:ring-white/10' : 'hover:bg-black/5 dark:hover:bg-white/10'
                                                }`}
                                              >
                                                {editingBookmarkId === bookmark.id ? (
                                                  <div className="flex flex-col gap-1 w-full relative z-50">
                                                    <input type="text" className="w-full bg-transparent border-b border-white/20 text-sm outline-none font-medium" value={editTitleValue} onChange={e => setEditTitleValue(e.target.value)} autoFocus />
                                                    <input type="text" className="w-full bg-transparent border-b border-white/20 text-xs text-slate-400 outline-none" value={editUrlValue} onChange={e => setEditUrlValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveEditBookmark(column.id)} />
                                                  </div>
                                                ) : (
                                                  <>
                                                    <img 
                                                      src={getFaviconUrl(bookmark.url, 64)}
                                                      alt=""
                                                      className="w-[20px] h-[20px] rounded-[4px] shrink-0 bg-transparent object-contain"
                                                    />
                                                    <a 
                                                      href={bookmark.url} 
                                                      onClick={(e) => {
                                                        if (isIncognito) {
                                                          e.preventDefault();
                                                          if (hasChromeApi('windows')) {
                                                            chrome.windows.create({ url: bookmark.url, incognito: true });
                                                          } else {
                                                            alert('Incognito mode requires Chrome Extension API. Opening normally in new tab.');
                                                            window.open(bookmark.url, '_blank');
                                                          }
                                                        }
                                                      }}
                                                      className={`text-[13px] font-[400] transition-all truncate flex-1 min-w-0 tracking-wide group-hover:pr-14 ${isDark ? 'text-white/80 hover:text-white' : 'text-slate-700 hover:text-black'}`}
                                                    >
                                                      {cleanTitle(bookmark.title)}
                                                    </a>
                                                    
                                                    {/* Inline Hover Actions */}
                                                    <div className={`absolute right-2 opacity-0 group-hover:opacity-100 flex items-center gap-2.5 transition-opacity`}>
                                                      <button 
                                                        onClick={(e) => { e.preventDefault(); setEditingBookmarkId(bookmark.id); setEditTitleValue(bookmark.title); setEditUrlValue(bookmark.url); }}
                                                        className={`text-slate-400/80 transition-colors ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}
                                                      >
                                                        <Pencil size={14} strokeWidth={2} />
                                                      </button>
                                                      <button 
                                                        onClick={(e) => { e.preventDefault(); handleDeleteBookmark(column.id, bookmark.id); }}
                                                        className="text-red-400/80 hover:text-red-500 transition-colors"
                                                      >
                                                        <Trash2 size={14} strokeWidth={2} />
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
                                          <div className="mt-1 relative flex items-center w-full">
                                            <input 
                                              type="text"
                                              autoFocus
                                              placeholder="Type URL..."
                                              className="w-full rounded-xl pl-3 pr-14 py-2 text-[13px] font-medium outline-none border border-transparent focus:border-white/20 transition-all shadow-inner"
                                              style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)', color: isDark ? 'white' : 'black' }}
                                              value={inlineInputValue}
                                              onChange={(e) => setInlineInputValue(e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleInlineAddLink(column.id);
                                                if (e.key === 'Escape') setActiveInlineAddBoardId(null);
                                              }}
                                            />
                                            <button 
                                              onClick={() => handleInlineAddLink(column.id)} 
                                              className="absolute right-1.5 px-3 py-1 text-white rounded-lg text-[11px] font-bold shadow-sm hover:scale-105 active:scale-95 transition-all" 
                                              style={{ backgroundColor: styleSettings.primaryColor }}
                                            >
                                              Add
                                            </button>
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
                    {/* Render the ADD BOARD button for EVERY column */}
                    <div className="mt-2 w-[220px] shrink-0">
                      {activeAddBoardColIndex !== colIndex ? (
                        <button 
                          onClick={() => { setCategoryInput(''); setActiveAddBoardColIndex(colIndex); }}
                          className="w-full py-4 rounded-[10px] border-[1.5px] border-dashed flex items-center justify-center transition-all hover:bg-black/5 dark:hover:bg-white/5 gap-2 font-semibold text-[13px] opacity-0 group-hover:opacity-100 focus:opacity-100 hover:opacity-100"
                          style={{ 
                            borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                            color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                          }}
                        >
                          <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center">
                            <Plus size={10} strokeWidth={2.5} />
                          </div>
                          ADD BOARD
                        </button>
                      ) : (
                        <div 
                          className="w-full flex items-center gap-2 p-1.5 rounded-[10px] border shadow-sm transition-all" 
                          style={{ 
                            backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.7)', 
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                            backdropFilter: 'blur(16px)'
                          }}
                        >
                          <input 
                            type="text" 
                            autoFocus 
                            placeholder="Enter board name..." 
                            className="flex-1 min-w-0 bg-transparent pl-2 text-[13px] font-medium outline-none"
                            style={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)' }}
                            value={categoryInput} 
                            onChange={(e) => setCategoryInput(e.target.value)} 
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddCategoryConfirm();
                              if (e.key === 'Escape') setActiveAddBoardColIndex(null);
                            }} 
                          />
                          <button 
                            onClick={handleAddCategoryConfirm} 
                            className="shrink-0 px-3 py-1.5 rounded-[8px] font-bold text-[12px] hover:scale-105 active:scale-95 transition-all shadow-sm"
                            style={{ backgroundColor: '#e2d5bd', color: '#1e293b' }}
                          >
                            Add
                          </button>
                          <button 
                            onClick={() => setActiveAddBoardColIndex(null)} 
                            className="shrink-0 w-[28px] h-[28px] flex items-center justify-center rounded-[8px] hover:scale-105 active:scale-95 transition-all shadow-sm"
                            style={{ backgroundColor: '#4a2525', color: '#f76b6b', border: '1px solid rgba(255,255,255,0.05)' }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Droppable>
              ));
            })()}
          </div>
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
          { icon: VenetianMask, id: 'incognito', isActive: isIncognito, onClick: () => setIsIncognito(!isIncognito) },
          { icon: LayoutDashboard, id: 'dashboard', onClick: () => setIsDashboardOpen(true) },
          { icon: Trash2, id: 'trash', onClick: () => setIsTrashOpen(true) },
          { icon: Eye, id: 'view', onClick: () => {
            saveStyleSettings({...styleSettings, isDarkBg: !styleSettings.isDarkBg});
          }},
        ].map((btn) => (
          <button key={btn.id} onClick={btn.onClick} className={`w-[44px] h-[44px] backdrop-blur-xl rounded-full flex items-center justify-center shadow-lg transition-all border-[0.5px] ${btn.isActive ? 'ring-2 ring-offset-2 ring-offset-transparent scale-110' : 'hover:scale-110'}`} style={{ 
            backgroundColor: btn.isActive ? styleSettings.primaryColor : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)'), 
            color: btn.isActive ? '#ffffff' : (isDark ? 'white' : '#334155'), 
            borderColor: btn.isActive ? 'rgba(255,255,255,0.3)' : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'),
            outlineColor: btn.isActive ? styleSettings.primaryColor : 'transparent'
          }}>
            <btn.icon size={20} strokeWidth={2.2} />
          </button>
        ))}
        {/* Settings Button */}
        <button onClick={() => setIsSettingsOpen(true)} className="w-[44px] h-[44px] rounded-full flex items-center justify-center shadow-xl hover:opacity-90 hover:scale-110 transition-all border-[0.5px] border-white/20" style={{ backgroundColor: styleSettings.primaryColor, color: '#ffffff' }}>
          <Settings size={20} strokeWidth={2.2} />
        </button>
      </div>

      <div className="fixed left-8 bottom-8 z-40">
        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleWallpaperUpload} />
        <button onClick={() => fileInputRef.current?.click()} className="w-[44px] h-[44px] backdrop-blur-xl rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 border-[0.5px]" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)', color: isDark ? 'white' : '#334155', borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }}>
          <ImageIcon size={20} strokeWidth={2.2} />
        </button>
      </div>

      {/* Settings Modal (Dark Mode Supported) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div 
            className="w-full max-w-md rounded-3xl p-7 shadow-2xl transition-all"
            style={{ 
              backgroundColor: hexToRgba(styleSettings.boardColor, styleSettings.boardOpacity),
              backdropFilter: `blur(${styleSettings.boardBlur}px) saturate(150%)`,
              WebkitBackdropFilter: `blur(${styleSettings.boardBlur}px) saturate(150%)`,
              border: isDark ? '0.5px solid rgba(255,255,255,0.12)' : '0.5px solid rgba(0,0,0,0.08)'
            }}
          >
            <h3 className={`text-xl font-semibold ${modalText} mb-1`}>Adjust Wallpaper Style</h3>
            <p className={`text-[13px] ${modalSubText} mb-6`}>{isDark ? 'Dark theme' : 'Light theme'} on this device.</p>
            
            <div className="flex gap-4 mb-5">
              <div className={`${inputBg} ${inputBorder} flex-1 rounded-2xl p-3 border transition-colors`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-[13px] font-medium ${modalText}`}>Primary</span>
                </div>
                <div className="relative h-10 rounded-xl overflow-hidden border border-black/10 shadow-inner">
                  <input type="color" className="absolute -top-2 -left-2 w-32 h-20 cursor-pointer" value={styleSettings.primaryColor} onChange={e => saveStyleSettings({...styleSettings, primaryColor: e.target.value})} />
                  <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: styleSettings.primaryColor }}></div>
                </div>
              </div>
              <div className={`${inputBg} ${inputBorder} flex-1 rounded-2xl p-3 border transition-colors`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-[13px] font-medium ${modalText}`}>Board</span>
                </div>
                <div className="relative h-10 rounded-xl overflow-hidden border border-black/10 shadow-inner">
                  <input type="color" className="absolute -top-2 -left-2 w-32 h-20 cursor-pointer" value={styleSettings.boardColor} onChange={e => saveStyleSettings({...styleSettings, boardColor: e.target.value})} />
                  <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: styleSettings.boardColor }}></div>
                </div>
              </div>
            </div>

            <div className={`${inputBg} ${inputBorder} rounded-2xl p-4 border mb-6 flex flex-col gap-5 transition-colors`}>
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className={`text-[13px] font-medium ${modalText}`}>Opacity</span>
                  <span className={`text-[13px] font-medium ${modalSubText}`}>{styleSettings.boardOpacity}%</span>
                </div>
                <input type="range" min="0" max="100" className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} value={styleSettings.boardOpacity} onChange={e => saveStyleSettings({...styleSettings, boardOpacity: parseInt(e.target.value)})} style={{ accentColor: styleSettings.primaryColor }} />
              </div>
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className={`text-[13px] font-medium ${modalText}`}>Blur Amount</span>
                  <span className={`text-[13px] font-medium ${modalSubText}`}>{styleSettings.boardBlur}px</span>
                </div>
                <input type="range" min="0" max="32" className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} value={styleSettings.boardBlur} onChange={e => saveStyleSettings({...styleSettings, boardBlur: parseInt(e.target.value)})} style={{ accentColor: styleSettings.primaryColor }} />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setIsSettingsOpen(false)} className={`px-5 py-2 rounded-xl font-medium text-[13px] transition-colors ${isDark ? 'text-slate-300 bg-white/10 hover:bg-white/20' : 'text-slate-600 bg-black/5 hover:bg-black/10'}`}>Close</button>
            </div>
          </div>
        </div>
      )}



      {/* Dashboard Modal */}
      {isDashboardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div 
            className="w-full max-w-md rounded-3xl p-8 shadow-2xl transition-all"
            style={{ 
              backgroundColor: hexToRgba(styleSettings.boardColor, styleSettings.boardOpacity),
              backdropFilter: `blur(${styleSettings.boardBlur}px) saturate(150%)`,
              WebkitBackdropFilter: `blur(${styleSettings.boardBlur}px) saturate(150%)`,
              border: isDark ? '0.5px solid rgba(255,255,255,0.12)' : '0.5px solid rgba(0,0,0,0.08)'
            }}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-xl font-extrabold ${modalText}`}>Analytics Dashboard</h3>
              <LayoutDashboard size={24} className={modalText} opacity={0.5} />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className={`${inputBg} ${inputBorder} p-5 rounded-2xl border flex flex-col items-center justify-center`}>
                <span className={`text-[13px] font-bold ${modalSubText} mb-1`}>Total Bookmarks</span>
                <span className={`text-3xl font-extrabold ${modalText}`} style={{ color: styleSettings.primaryColor }}>{getTotalBookmarks()}</span>
              </div>
              <div className={`${inputBg} ${inputBorder} p-5 rounded-2xl border flex flex-col items-center justify-center`}>
                <span className={`text-[13px] font-bold ${modalSubText} mb-1`}>Total Boards</span>
                <span className={`text-3xl font-extrabold ${modalText}`} style={{ color: styleSettings.primaryColor }}>{getTotalBoards()}</span>
              </div>
            </div>

            <div className={`${inputBg} ${inputBorder} p-5 rounded-2xl border mb-8 flex items-center justify-between`}>
              <div className="flex flex-col">
                <span className={`text-[12px] font-bold ${modalSubText} mb-1`}>Most Populated Board</span>
                <span className={`text-[15px] font-extrabold ${modalText}`}>{getMostPopulatedBoard().name}</span>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white" style={{ backgroundColor: styleSettings.primaryColor }}>
                {getMostPopulatedBoard().count}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setIsDashboardOpen(false)} className={`px-5 py-2.5 w-full rounded-xl font-bold text-[13px] transition-colors ${isDark ? 'text-slate-300 bg-white/10 hover:bg-white/20' : 'text-slate-600 bg-black/5 hover:bg-black/10'}`}>Close Dashboard</button>
            </div>
          </div>
        </div>
      )}

      {/* Trash Modal */}
      {isTrashOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className={`${modalBg} ${modalBorder} w-full max-w-lg rounded-3xl p-8 shadow-2xl border transition-colors flex flex-col max-h-[80vh]`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-xl font-extrabold ${modalText}`}>Trash</h3>
              <Trash2 size={24} className="text-[#d9304f]" opacity={0.8} />
            </div>
            
            <div className="flex-1 overflow-y-auto mb-6 pr-2 no-scrollbar flex flex-col gap-2">
              {trashBoardId && columns[trashBoardId] && columns[trashBoardId].bookmarks.length > 0 ? (
                columns[trashBoardId].bookmarks.map(bm => (
                  <div key={bm.id} className={`${inputBg} ${inputBorder} p-3 rounded-xl border flex items-center justify-between`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      <img src={getFaviconUrl(bm.url, 32)} className="w-5 h-5 rounded shrink-0" alt=""/>
                      <span className={`text-[13px] font-semibold truncate ${modalText}`}>{bm.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => handleRestoreBookmark(bm.id)} className="p-1.5 hover:bg-green-500/10 text-green-600 rounded-lg transition-colors" title="Restore"><RefreshCw size={14}/></button>
                      <button onClick={() => handlePermanentDeleteBookmark(bm.id)} className="p-1.5 hover:bg-red-500/10 text-red-600 rounded-lg transition-colors" title="Delete permanently"><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))
              ) : (
                <div className={`text-center py-10 text-[13px] font-semibold ${modalSubText}`}>Trash is empty.</div>
              )}
            </div>

            <div className="flex justify-between gap-2 shrink-0 mt-auto">
              <button onClick={handleEmptyTrash} className="px-5 py-2.5 rounded-xl font-bold text-[13px] transition-colors text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20">Empty Trash</button>
              <button onClick={() => setIsTrashOpen(false)} className={`px-5 py-2.5 rounded-xl font-bold text-[13px] transition-colors ${isDark ? 'text-slate-300 bg-white/10 hover:bg-white/20' : 'text-slate-600 bg-black/5 hover:bg-black/10'}`}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
