import { useState, useEffect, useRef } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { FastAverageColor } from 'fast-average-color'
import { 
  Search, Plus, Image as ImageIcon, Download, 
  VenetianMask, LayoutDashboard, Trash2, Eye, Settings,
  MoreVertical, Menu, Link2, ExternalLink, RefreshCw, Pencil, Share2, Check, X, ChevronDown,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Globe2, FileText, Star
} from 'lucide-react'
import { useTheme } from './theme/themeContext.js'
import { getContrastRatio, styleSettingsToTheme } from './theme/themeCore.js'
import MacOSDock from './components/ui/mac-os-dock.tsx'
import {
  DEFAULT_STYLE_SETTINGS,
  cleanBookmarkTitle,
  getFaviconUrl,
  hasChromeApi,
  hexToRgba,
} from './lib/bookmarkUtils'

const fac = new FastAverageColor();
const DEFAULT_TABS = ['Home', 'Work', 'Personal'];
const ROOT_BOOKMARKS_BOARD_TITLE = 'Bookmarks Bar';
const TRASH_TITLE = '[Trash]';
const DEFAULT_UI_SETTINGS = {
  compactMode: false,
  groupRightTools: false,
  hideExtraBookmarks: false,
  shortenLongTitles: true,
  openLinksInNewTab: false,
  showBookmarkDescriptions: false,
  boardAlignment: 'start',
  iconOnlyMode: false,
  iconColumns: 4,
  showFavoritesDock: true,
  dockSize: 64,
};

function App() {
  const {
    draftTheme,
    effectiveTheme,
    presetThemes,
    styleSettings: themeStyleSettings,
    updateDraftTheme,
    previewPreset,
    publishTheme,
    cancelThemeDraft,
    saveThemeDraft,
    resetTheme,
  } = useTheme();
  const [openDockApps, setOpenDockApps] = useState(['finder', 'safari']);
  const [favoriteBookmarkIds, setFavoriteBookmarkIds] = useState([]);
  const [columns, setColumns] = useState({});
  const [columnOrder, setColumnOrder] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wallpaper, setWallpaper] = useState(null);
  const [numCols, setNumCols] = useState(4);
  
  // Dynamic Styles State
  const [styleSettings, setStyleSettings] = useState(themeStyleSettings);

  const fileInputRef = useRef(null);
  const importFileInputRef = useRef(null);

  // Modals & Menus State
  const [activeAddBoardColIndex, setActiveAddBoardColIndex] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('general');
  const [isWallpaperStyleOpen, setIsWallpaperStyleOpen] = useState(false);
  const [isToolMenuOpen, setIsToolMenuOpen] = useState(false);
  const [isImportMenuOpen, setIsImportMenuOpen] = useState(false);
  const [categoryInput, setCategoryInput] = useState('');
  
  const [activeMenuBoardId, setActiveMenuBoardId] = useState(null);
  const [activeInlineAddBoardId, setActiveInlineAddBoardId] = useState(null);
  const [inlineInputValue, setInlineInputValue] = useState('');
  const [editingBoardId, setEditingBoardId] = useState(null);
  const [boardTitleValue, setBoardTitleValue] = useState('');

  // Edit Bookmark State
  const [editingBookmarkId, setEditingBookmarkId] = useState(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [editUrlValue, setEditUrlValue] = useState('');
  const [activeContextMenuId, setActiveContextMenuId] = useState(null);

  // Feature States
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [privacyBoardId, setPrivacyBoardId] = useState(null);

  const handleDockAppClick = (appId) => {
    setOpenDockApps(prev => 
      prev.includes(appId) 
        ? prev.filter(id => id !== appId)
        : [...prev, appId]
    );
  };

  const toggleFavorite = (bmId) => {
    setFavoriteBookmarkIds(prev => {
      const next = prev.includes(bmId) ? prev.filter(id => id !== bmId) : [...prev, bmId];
      if (hasChromeApi('storage')) {
        chrome.storage.local.set({ favoriteBookmarkIds: next });
      } else {
        window.localStorage.setItem('mock_favoriteBookmarkIds', JSON.stringify(next));
      }
      return next;
    });
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  useEffect(() => {
    setStyleSettings(themeStyleSettings);
  }, [themeStyleSettings]);
  
  // Navigation Tabs State
  const [activeTab, setActiveTab] = useState('Home');
  const [tabs, setTabs] = useState(DEFAULT_TABS);
  const [boardTabs, setBoardTabs] = useState({});
  const [tabFolderIds, setTabFolderIds] = useState({});
  const [isTabModalOpen, setIsTabModalOpen] = useState(false);
  const [activeTabMenu, setActiveTabMenu] = useState(null);
  const [hoveredTab, setHoveredTab] = useState(null);
  const [renamingTab, setRenamingTab] = useState(null);
  const [tabRenameInput, setTabRenameInput] = useState('');
  const [tabInput, setTabInput] = useState('');
  
  // 2D Board Layout State
  const [boardLayout2D, setBoardLayout2D] = useState({});
  const [uiSettings, setUiSettings] = useState(DEFAULT_UI_SETTINGS);
  const [isDraggingAny, setIsDraggingAny] = useState(false);

  // FAB Feature States
  const [isIncognito, setIsIncognito] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [bookmarksBarId, setBookmarksBarId] = useState("1");
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [trashBoardId, setTrashBoardId] = useState(null);
  const hasChromeBookmarks = () => typeof chrome !== 'undefined' && chrome.bookmarks;

  const cleanTitle = cleanBookmarkTitle;

  const getBookmarkHost = (url) => {
    try {
      return new URL(url).hostname.replace(/^www\./i, '');
    } catch {
      return url || '';
    }
  };

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

  const extractUrlsFromText = (text) => {
    const matches = text.match(/(?:https?:\/\/|chrome:\/\/|www\.)[^\s,;"'<>]+|[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s,;"'<>]*)?/gi) || [];
    return [...new Set(matches.map(item => {
      const url = item.trim().replace(/[).,\]]+$/, '');
      return /^(https?:|chrome:)/i.test(url) ? url : `https://${url}`;
    }).filter(url => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    }))];
  };

  const addImportedLinksBoard = (urls) => {
    if (urls.length === 0) {
      alert('No links found in this file.');
      return;
    }

    const title = 'Imported Links';
    const addBoardToUi = (folder, bookmarks) => {
      setColumns(prev => ({
        ...prev,
        [folder.id]: { id: folder.id, title: folder.title, bookmarks }
      }));
      setColumnOrder(prev => [...prev, folder.id]);

      const nextBoardTabs = { ...boardTabs, [folder.id]: activeTab };
      setBoardTabs(nextBoardTabs);
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ boardTabs: nextBoardTabs });
      }
    };

    if (hasChromeBookmarks()) {
      chrome.bookmarks.create({ parentId: tabFolderIds[activeTab] || bookmarksBarId, title }, (folder) => {
        const created = [];
        urls.forEach((url, index) => {
          chrome.bookmarks.create({ parentId: folder.id, url, title: cleanTitle(url), index }, (bookmark) => {
            created[index] = bookmark;
            if (created.filter(Boolean).length === urls.length) addBoardToUi(folder, created);
          });
        });
      });
    } else {
      const folder = { id: `import-${Date.now()}`, title };
      const bookmarks = urls.map((url, index) => ({ id: `${folder.id}-${index}`, title: cleanTitle(url), url }));
      addBoardToUi(folder, bookmarks);
    }
  };

  const handleImportBrowserBookmarks = () => {
    setIsImportMenuOpen(false);
    loadBookmarks(tabs);
  };

  const handleImportLinksFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      addImportedLinksBoard(extractUrlsFromText(event.target.result || ''));
      setIsImportMenuOpen(false);
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.board-menu-container') && !e.target.closest('.board-menu-trigger')) {
        setActiveMenuBoardId(null);
      }
      if (!e.target.closest('.tab-menu-container') && !e.target.closest('.tab-menu-trigger')) {
        setActiveTabMenu(null);
      }
      if (!e.target.closest('.import-menu-container') && !e.target.closest('.import-menu-trigger')) {
        setIsImportMenuOpen(false);
      }
      if (!e.target.closest('.context-menu-actions')) {
        setActiveContextMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') closeSearch();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Responsive Masonry Columns
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) setNumCols(2);
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
    if (hasChromeApi('storage')) {
      chrome.storage.local.get(['wallpaper', 'styleSettings', 'uiSettings', 'boardTabs', 'tabs', 'boardLayout2D', 'favoriteBookmarkIds'], (result) => {
        if (result.wallpaper) setWallpaper(result.wallpaper);
        if (result.styleSettings) setStyleSettings(result.styleSettings);
        if (result.uiSettings) setUiSettings({ ...DEFAULT_UI_SETTINGS, ...result.uiSettings });
        if (result.boardLayout2D) setBoardLayout2D(result.boardLayout2D);
        if (result.favoriteBookmarkIds) setFavoriteBookmarkIds(result.favoriteBookmarkIds);
        loadBookmarks(result.tabs || DEFAULT_TABS);
      });
    } else {
      const mockWallpaper = window.localStorage.getItem('mock_wallpaper');
      if (mockWallpaper) setWallpaper(JSON.parse(mockWallpaper));
      const mockStyleSettings = window.localStorage.getItem('mock_styleSettings');
      if (mockStyleSettings) setStyleSettings(JSON.parse(mockStyleSettings));
      const mockUiSettings = window.localStorage.getItem('mock_uiSettings');
      if (mockUiSettings) setUiSettings({ ...DEFAULT_UI_SETTINGS, ...JSON.parse(mockUiSettings) });
      const mockBoardTabs = window.localStorage.getItem('mock_boardTabs');
      if (mockBoardTabs) setBoardTabs(JSON.parse(mockBoardTabs));
      const mockTabs = window.localStorage.getItem('mock_tabs');
      if (mockTabs) setTabs(JSON.parse(mockTabs));
      const mockBoardLayout2D = window.localStorage.getItem('mock_boardLayout2D');
      if (mockBoardLayout2D) setBoardLayout2D(JSON.parse(mockBoardLayout2D));
      const mockFavoriteBookmarkIds = window.localStorage.getItem('mock_favoriteBookmarkIds');
      if (mockFavoriteBookmarkIds) setFavoriteBookmarkIds(JSON.parse(mockFavoriteBookmarkIds));
      loadBookmarks();
    }
    // Initial bootstrapping intentionally runs once; loadBookmarks closes over startup defaults.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveStyleSettings = (newSettings) => {
    setStyleSettings(newSettings);
    publishTheme(styleSettingsToTheme(newSettings, effectiveTheme));
    if (hasChromeApi('storage')) {
      chrome.storage.local.set({ styleSettings: newSettings });
    }
  };

  const saveUiSettings = (patch) => {
    const nextSettings = { ...uiSettings, ...patch };
    setUiSettings(nextSettings);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ uiSettings: nextSettings });
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
      window.localStorage.setItem('mock_uiSettings', JSON.stringify(uiSettings));
      if (wallpaper) window.localStorage.setItem('mock_wallpaper', JSON.stringify(wallpaper));
    }
  }, [boardTabs, tabs, boardLayout2D, styleSettings, uiSettings, wallpaper, loading]);

  const loadBookmarks = (savedTabs = DEFAULT_TABS) => {
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

        const createFolder = (parentId, title) => new Promise(resolve => {
          chrome.bookmarks.create({ parentId, title }, resolve);
        });
        const moveNode = (id, parentId, index) => new Promise(resolve => {
          const moveDetails = { parentId };
          if (index !== undefined) moveDetails.index = index;
          chrome.bookmarks.move(id, moveDetails, resolve);
        });

        (async () => {
          const tabNames = [...new Set([...DEFAULT_TABS, ...savedTabs].map(tab => tab.trim()).filter(Boolean))];
          const topFolders = [...(bookmarksBar.children || [])];
          const tabFolders = {};

          for (const tab of tabNames) {
            let folder = topFolders.find(node => node.children && node.title === tab);
            if (!folder) {
              folder = await createFolder(bookmarksBar.id, tab);
              folder.children = [];
              topFolders.push(folder);
            }
            tabFolders[tab] = folder;
          }

          const homeFolder = tabFolders.Home || tabFolders[tabNames[0]];
          const legacyBoards = topFolders.filter(node =>
            node.children &&
            node.title !== TRASH_TITLE &&
            !tabNames.includes(node.title)
          );
          for (const board of legacyBoards) {
            await moveNode(board.id, homeFolder.id);
            homeFolder.children = [...(homeFolder.children || []), board];
          }

          const rootBookmarks = topFolders.filter(node => !node.children);
          if (rootBookmarks.length > 0) {
            let rootBoard = (homeFolder.children || []).find(node => node.children && node.title === ROOT_BOOKMARKS_BOARD_TITLE);
            if (!rootBoard) {
              rootBoard = await createFolder(homeFolder.id, ROOT_BOOKMARKS_BOARD_TITLE);
              rootBoard.children = [];
              homeFolder.children = [rootBoard, ...(homeFolder.children || [])];
            }
            for (const bookmark of rootBookmarks) {
              await moveNode(bookmark.id, rootBoard.id);
              rootBoard.children = [...(rootBoard.children || []), bookmark];
            }
          }

          for (const tabFolder of Object.values(tabFolders)) {
            const directBookmarks = (tabFolder.children || []).filter(node => !node.children);
            if (directBookmarks.length === 0) continue;
            let rootBoard = (tabFolder.children || []).find(node => node.children && node.title === ROOT_BOOKMARKS_BOARD_TITLE);
            if (!rootBoard) {
              rootBoard = await createFolder(tabFolder.id, ROOT_BOOKMARKS_BOARD_TITLE);
              rootBoard.children = [];
              tabFolder.children = [rootBoard, ...(tabFolder.children || [])];
            }
            for (const bookmark of directBookmarks) {
              await moveNode(bookmark.id, rootBoard.id);
              rootBoard.children = [...(rootBoard.children || []), bookmark];
            }
          }

          chrome.bookmarks.getSubTree(bookmarksBar.id, ([freshBar]) => {
            const freshChildren = freshBar?.children || [];
            const freshTabFolders = {};
            const nextColumns = {};
            const nextColumnOrder = [];
            const nextBoardTabs = {};
            let foundTrashId = null;

            freshChildren.forEach(node => {
              if (node.children && tabNames.includes(node.title)) {
                freshTabFolders[node.title] = node.id;
                (node.children || []).forEach(board => {
                  if (!board.children) return;
                  nextColumns[board.id] = {
                    id: board.id,
                    title: board.title,
                    bookmarks: (board.children || []).filter(child => !child.children)
                  };
                  nextColumnOrder.push(board.id);
                  nextBoardTabs[board.id] = node.title;
                });
              } else if (node.children && node.title === TRASH_TITLE) {
                foundTrashId = node.id;
                nextColumns[node.id] = {
                  id: node.id,
                  title: node.title,
                  bookmarks: (node.children || []).filter(child => !child.children)
                };
              }
            });

            setTabs(tabNames);
            setTabFolderIds(freshTabFolders);
            setBoardTabs(nextBoardTabs);
            setColumns(nextColumns);
            setColumnOrder(nextColumnOrder);
            setTrashBoardId(foundTrashId);
            if (!tabNames.includes(activeTab)) setActiveTab(tabNames[0] || 'Home');
            chrome.storage?.local.set({ tabs: tabNames, boardTabs: nextBoardTabs });
            setLoading(false);
          });
        })();
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
    setIsDraggingAny(false);
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
          const activeParentId = tabFolderIds[activeTab] || bookmarksBarId;
          flatLayout.forEach((id) => {
             chrome.bookmarks.move(id, { parentId: activeParentId, index: flatLayout.indexOf(id) });
          });
        }
      }
      return;
    }

    // Bookmark drag logic
    const sourceCol = columns[source.droppableId];

    if (destination.droppableId === 'favorites-dock') {
      const bmId = draggableId;
      if (!favoriteBookmarkIds.includes(bmId)) {
        toggleFavorite(bmId);
      }
      return;
    }

    const destCol = columns[destination.droppableId];
    if (!sourceCol || !destCol) return;
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
      const title = tabInput.trim();
      const applyNewTab = (folderId = null) => {
        const newTabs = [...tabs, title];
        setTabs(newTabs);
        if (folderId) setTabFolderIds(prev => ({ ...prev, [title]: folderId }));
        if (hasChromeApi('storage')) {
          chrome.storage.local.set({ tabs: newTabs });
        }
        setActiveTab(title);
      };

      if (hasChromeApi('bookmarks')) {
        chrome.bookmarks.create({ parentId: bookmarksBarId, title }, (newFolder) => {
          applyNewTab(newFolder.id);
        });
      } else {
        applyNewTab();
      }
    }
    setTabInput('');
    setIsTabModalOpen(false);
  };

  const saveTabs = (nextTabs) => {
    setTabs(nextTabs);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ tabs: nextTabs });
    }
  };

  const handleStartRenameTab = (tab) => {
    setRenamingTab(tab);
    setTabRenameInput(tab);
    setActiveTabMenu(null);
  };

  const handleRenameTab = () => {
    const nextTitle = tabRenameInput.trim();
    if (!renamingTab || !nextTitle || tabs.includes(nextTitle)) {
      setRenamingTab(null);
      return;
    }
    const nextTabs = tabs.map(tab => tab === renamingTab ? nextTitle : tab);
    const nextBoardTabs = Object.fromEntries(
      Object.entries(boardTabs).map(([boardId, tab]) => [boardId, tab === renamingTab ? nextTitle : tab])
    );
    const nextTabFolderIds = { ...tabFolderIds, [nextTitle]: tabFolderIds[renamingTab] };
    delete nextTabFolderIds[renamingTab];
    const nextBoardLayout2D = { ...boardLayout2D, [nextTitle]: boardLayout2D[renamingTab] };
    delete nextBoardLayout2D[renamingTab];

    saveTabs(nextTabs);
    setBoardTabs(nextBoardTabs);
    setTabFolderIds(nextTabFolderIds);
    setBoardLayout2D(nextBoardLayout2D);
    if (activeTab === renamingTab) setActiveTab(nextTitle);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ boardTabs: nextBoardTabs, boardLayout2D: nextBoardLayout2D });
    }
    if (hasChromeBookmarks() && tabFolderIds[renamingTab]) {
      chrome.bookmarks.update(tabFolderIds[renamingTab], { title: nextTitle });
    }
    setRenamingTab(null);
  };

  const handleShareTab = async (tab) => {
    const boardCount = columnOrder.filter(id => (boardTabs[id] || 'Home') === tab).length;
    const text = `${tab} page - ${boardCount} boards`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt('Copy page info', text);
    }
    setActiveTabMenu(null);
  };

  const handleDeleteTab = (tab) => {
    if (tabs.length <= 1) return;
    if (!window.confirm(`Delete "${tab}" page and its boards?`)) return;
    const nextTabs = tabs.filter(item => item !== tab);
    const nextBoardTabs = { ...boardTabs };
    Object.entries(nextBoardTabs).forEach(([boardId, boardTab]) => {
      if (boardTab === tab) delete nextBoardTabs[boardId];
    });
    const nextTabFolderIds = { ...tabFolderIds };
    const deletedFolderId = nextTabFolderIds[tab];
    delete nextTabFolderIds[tab];
    const nextBoardLayout2D = { ...boardLayout2D };
    delete nextBoardLayout2D[tab];

    saveTabs(nextTabs);
    setBoardTabs(nextBoardTabs);
    setTabFolderIds(nextTabFolderIds);
    setBoardLayout2D(nextBoardLayout2D);
    setActiveTab(activeTab === tab ? nextTabs[0] : activeTab);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ boardTabs: nextBoardTabs, boardLayout2D: nextBoardLayout2D });
    }
    if (hasChromeBookmarks() && deletedFolderId) {
      chrome.bookmarks.removeTree(deletedFolderId, () => loadBookmarks(nextTabs));
    }
    setActiveTabMenu(null);
  };

  const handleFaviconError = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = '/favicon.svg';
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
        chrome.bookmarks.create({ parentId: tabFolderIds[activeTab] || bookmarksBarId, title: categoryInput }, (newFolder) => {
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
        const newBoardTabs = { ...boardTabs };
        delete newBoardTabs[id];
        setBoardTabs(newBoardTabs);
        chrome.storage?.local.set({ boardTabs: newBoardTabs });
      });
    } else {
      const newCols = { ...columns };
      delete newCols[id];
      setColumns(newCols);
      setColumnOrder(columnOrder.filter(colId => colId !== id));
      const newBoardTabs = { ...boardTabs };
      delete newBoardTabs[id];
      setBoardTabs(newBoardTabs);
    }
    setActiveMenuBoardId(null);
  };

  const handleOpenAllLinks = (boardId) => {
    const bookmarks = columns[boardId]?.bookmarks || [];
    bookmarks.forEach((bookmark) => {
      if (!bookmark.url) return;
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.create({ url: bookmark.url, active: false });
      } else {
        window.open(bookmark.url, '_blank', 'noopener,noreferrer');
      }
    });
    setActiveMenuBoardId(null);
  };

  const handleFetchTitles = async (boardId) => {
    const bookmarks = columns[boardId]?.bookmarks || [];
    const updates = await Promise.all(bookmarks.map(async (bookmark) => {
      if (!bookmark.url) return bookmark;
      let nextTitle = cleanTitle(bookmark.url);
      try {
        const response = await fetch(bookmark.url, { signal: AbortSignal.timeout(3500) });
        const html = await response.text();
        const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (match?.[1]) nextTitle = match[1].replace(/\s+/g, ' ').trim();
      } catch {
        // Network/CORS can fail in dev; URL-derived title is the safe fallback.
      }
      if (hasChromeBookmarks()) chrome.bookmarks.update(bookmark.id, { title: nextTitle });
      return { ...bookmark, title: nextTitle };
    }));
    setColumns({
      ...columns,
      [boardId]: { ...columns[boardId], bookmarks: updates }
    });
    setActiveMenuBoardId(null);
  };

  const handleStartEditBoard = (boardId) => {
    setEditingBoardId(boardId);
    setBoardTitleValue(columns[boardId]?.title || '');
    setActiveMenuBoardId(null);
  };

  const handleSaveBoardTitle = () => {
    const nextTitle = boardTitleValue.trim();
    if (!editingBoardId || !nextTitle) {
      setEditingBoardId(null);
      return;
    }
    setColumns({
      ...columns,
      [editingBoardId]: { ...columns[editingBoardId], title: nextTitle }
    });
    if (hasChromeBookmarks()) chrome.bookmarks.update(editingBoardId, { title: nextTitle });
    setEditingBoardId(null);
  };

  const handleShareBoard = async (boardId) => {
    const board = columns[boardId];
    const text = `${board.title} - ${board.bookmarks.length} bookmarks\n${board.bookmarks.map(b => b.url).filter(Boolean).join('\n')}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt('Copy board info', text);
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
      const nextUrl = editUrlValue.trim().startsWith('http') ? editUrlValue.trim() : `https://${editUrlValue.trim()}`;
      if (hasChromeApi('bookmarks')) {
        chrome.bookmarks.update(editingBookmarkId, { title: editTitleValue.trim(), url: nextUrl }, (updatedBm) => {
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
            bookmarks: columns[boardId].bookmarks.map(b => b.id === editingBookmarkId ? { ...b, title: editTitleValue.trim(), url: nextUrl } : b)
          }
        });
      }
    }
    setEditingBookmarkId(null);
  };

  const handleWallpaperUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please choose a valid image file.');
        e.target.value = '';
        return;
      }
      if (file.size > 4 * 1024 * 1024) {
        alert('Wallpaper must be 4 MB or smaller.');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        if (typeof base64 !== 'string' || base64.length > 6_000_000) {
          alert('Wallpaper is too large after encoding.');
          e.target.value = '';
          return;
        }
        setWallpaper(base64);
        
        fac.getColorAsync(base64)
          .then(color => {
            const nextStyleSettings = {
              ...styleSettings,
              primaryColor: color.hex,
              boardColor: color.isDark ? '#2A2C31' : '#FFFFFF',
              isDarkBg: color.isDark
            };
            saveStyleSettings(nextStyleSettings);
            publishTheme({
              ...styleSettingsToTheme(nextStyleSettings, effectiveTheme),
              background: { ...effectiveTheme.background, type: 'image', image: base64 },
            });
            if (hasChromeApi('storage')) {
              chrome.storage.local.set({ wallpaper: base64 });
            }
            setIsWallpaperStyleOpen(true);
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

  const mixHex = (hex, fallback, amount = 50) => {
    if (!hex || hex.length !== 7) return fallback;
    const target = fallback.replace('#', '');
    const source = hex.replace('#', '');
    const mix = (i) => {
      const a = parseInt(source.slice(i, i + 2), 16);
      const b = parseInt(target.slice(i, i + 2), 16);
      return Math.round((a * amount + b * (100 - amount)) / 100).toString(16).padStart(2, '0');
    };
    return `#${mix(0)}${mix(2)}${mix(4)}`;
  };

  if (loading) return null;

  // Dark mode class mappings for Modals
  const isDark = styleSettings.isDarkBg;

  // Filter columns based on search
  const displayColumns = Object.keys(columns).reduce((acc, colId) => {
    const col = columns[colId];
    let visibleBookmarks = isSearchOpen && searchQuery.trim()
      ? col.bookmarks.filter(b =>
          (b.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (b.url || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
      : col.bookmarks;
    if (uiSettings.hideExtraBookmarks && visibleBookmarks.length > 8) {
      visibleBookmarks = visibleBookmarks.slice(0, 8);
    }
    acc[colId] = {
      ...col,
      bookmarks: visibleBookmarks
    };
    return acc;
  }, {});
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const searchMatches = normalizedSearchQuery
    ? Object.values(columns).flatMap(board =>
        board.bookmarks
          .filter(bookmark =>
            (bookmark.title || '').toLowerCase().includes(normalizedSearchQuery) ||
            (bookmark.url || '').toLowerCase().includes(normalizedSearchQuery)
          )
          .map(bookmark => ({ ...bookmark, boardTitle: board.title }))
      )
    : [];
  const searchResultCount = searchMatches.length;
  const modalText = isDark ? 'text-[#f8f9fa]' : 'text-[#1c2b36]';
  const modalSubText = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-black/20' : 'bg-white/40';
  const inputBorder = isDark ? 'border-white/5' : 'border-black/10';
  const themedMenuBg = isDark ? hexToRgba(styleSettings.primaryColor, 88) : hexToRgba(styleSettings.boardColor, 96);
  const themedMenuBorder = isDark ? hexToRgba(styleSettings.primaryColor, 100) : 'rgba(0,0,0,0.08)';
  const inactiveTabBg = isDark
    ? mixHex(styleSettings.primaryColor, '#22070a', 42)
    : mixHex(styleSettings.primaryColor, '#f5f1ee', 18);
  const toolbarButtons = [
    { icon: Search, id: 'search', title: 'Search bookmarks', isActive: isSearchOpen, onClick: () => setIsSearchOpen(true) },
    { icon: Download, id: 'download', title: 'Import bookmarks', isActive: isImportMenuOpen, onClick: () => setIsImportMenuOpen(!isImportMenuOpen) },
    { icon: VenetianMask, id: 'incognito', title: isIncognito ? 'Disable incognito open' : 'Open bookmarks incognito', isActive: isIncognito, onClick: () => setIsIncognito(!isIncognito) },
    { icon: LayoutDashboard, id: 'dashboard', title: 'Open dashboard', onClick: () => setIsDashboardOpen(true) },
    { icon: Trash2, id: 'trash', title: 'Open trash', onClick: () => setIsTrashOpen(true) },
    { icon: Eye, id: 'view', title: isPrivacyMode ? 'Disable privacy view' : 'Enable privacy view', isActive: isPrivacyMode, onClick: () => {
      setIsPrivacyMode(!isPrivacyMode);
      setPrivacyBoardId(null);
    } },
  ];
  const primaryToolbarButton = toolbarButtons[0];
  const expandableToolbarButtons = toolbarButtons.slice(1);
  const boardAlignmentOptions = [
    { value: 'start', label: 'Left', icon: AlignLeft, justifyContent: 'start' },
    { value: 'center', label: 'Center', icon: AlignCenter, justifyContent: 'center' },
    { value: 'end', label: 'Right', icon: AlignRight, justifyContent: 'end' },
    { value: 'space-between', label: 'Spread', icon: AlignJustify, justifyContent: 'space-between' },
  ];
  const boardJustifyContent = boardAlignmentOptions.find(option => option.value === uiSettings.boardAlignment)?.justifyContent || 'start';
  const boardGapPx = uiSettings.compactMode ? 16 : 24;
  const boardAreaWidth = (numCols * 220) + (Math.max(numCols - 1, 0) * boardGapPx);
  const isMobileLayout = typeof window !== 'undefined' && window.innerWidth < 640;
  const trashBookmarks = trashBoardId && columns[trashBoardId] ? columns[trashBoardId].bookmarks : [];

  const openSearchUrl = (url) => {
    if (!url) return;
    closeSearch();
    if (uiSettings.openLinksInNewTab) {
      window.open(url, '_blank', 'noreferrer');
    } else {
      window.location.href = url;
    }
  };

  const handleBrowserSearch = () => {
    const text = searchQuery.trim();
    if (!text) return;
    closeSearch();
    if (typeof chrome !== 'undefined' && chrome.search?.query) {
      chrome.search.query({ text, disposition: uiSettings.openLinksInNewTab ? 'NEW_TAB' : 'CURRENT_TAB' });
      return;
    }
    openSearchUrl(`https://www.google.com/search?q=${encodeURIComponent(text)}`);
  };

  const renderToolButton = (btn, motionStyle = {}) => (
    <div
      key={btn.id}
      className={`${btn.id === 'download' ? 'import-menu-container' : ''} relative transition-all duration-300 ease-out`}
      style={motionStyle}
    >
      <button
        onClick={() => {
          btn.onClick();
        }}
        title={btn.title}
        className={`h-11 w-11 backdrop-blur-xl rounded-full flex items-center justify-center shadow-lg transition-all border sm:h-[50px] sm:w-[50px] ${btn.id === 'download' ? 'import-menu-trigger' : ''} ${btn.isActive ? 'scale-105' : 'hover:scale-105'}`}
        style={{
          backgroundColor: btn.isActive ? styleSettings.primaryColor : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)'),
          color: btn.isActive ? '#ffffff' : (isDark ? 'white' : '#334155'),
          borderColor: btn.isActive ? 'rgba(255,255,255,0.55)' : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'),
          outlineColor: btn.isActive ? styleSettings.primaryColor : 'transparent'
        }}
      >
        <btn.icon size={19} strokeWidth={2.2} />
      </button>
      {btn.id === 'download' && isImportMenuOpen && (
        <div
          className="absolute right-[58px] top-1/2 z-[90] w-[min(16rem,calc(100vw-5rem))] -translate-y-1/2 rounded-[10px] border p-1.5 shadow-2xl sm:right-[62px] sm:w-64"
          style={{
            backgroundColor: themedMenuBg,
            borderColor: themedMenuBorder,
            backdropFilter: 'blur(18px) saturate(150%)',
            WebkitBackdropFilter: 'blur(18px) saturate(150%)'
          }}
        >
          <button
            onClick={handleImportBrowserBookmarks}
            className={`flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-left text-[13px] font-semibold ${isDark ? 'text-slate-100 hover:bg-white/10' : 'text-slate-800 hover:bg-black/5'}`}
          >
            <Globe2 size={16} strokeWidth={2.1} />
            Import Browser Bookmarks
          </button>
          <div className="my-1 h-px" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)' }} />
          <button
            onClick={() => importFileInputRef.current?.click()}
            className={`flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-left text-[13px] font-semibold ${isDark ? 'text-slate-100 hover:bg-white/10' : 'text-slate-800 hover:bg-black/5'}`}
          >
            <FileText size={16} strokeWidth={2.1} />
            Import Links from Text/File
          </button>
        </div>
      )}
    </div>
  );

  const SettingToggle = ({ id, title, description }) => (
    <button
      onClick={() => saveUiSettings({ [id]: !uiSettings[id] })}
      className={`flex w-full items-center justify-between gap-4 rounded-[8px] px-2 py-2.5 text-left transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
      aria-pressed={uiSettings[id]}
    >
      <div className="min-w-0">
        <div className={`text-[13px] font-semibold leading-5 ${modalText}`}>{title}</div>
        <div className={`text-[11px] leading-4 ${modalSubText}`}>{description}</div>
      </div>
      <span
        className="h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors"
        style={{ backgroundColor: uiSettings[id] ? styleSettings.primaryColor : (isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.16)') }}
      >
        <span className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${uiSettings[id] ? 'translate-x-5' : 'translate-x-0'}`} />
      </span>
    </button>
  );

  const AlignmentSetting = ({ settingKey, title, description }) => (
    <div className="flex w-full flex-col gap-3 rounded-[8px] px-2 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <div className={`text-[13px] font-semibold leading-5 ${modalText}`}>{title}</div>
        <div className={`text-[11px] leading-4 ${modalSubText}`}>{description}</div>
      </div>
      <div
        className="grid h-10 w-fit shrink-0 grid-cols-4 overflow-hidden rounded-[8px] border"
        style={{ borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)' }}
      >
        {boardAlignmentOptions.map(({ value, label, icon: Icon }) => {
          const isActive = uiSettings[settingKey] === value;
          return (
            <button
              key={value}
              type="button"
              title={label}
              aria-label={`Align boards ${label.toLowerCase()}`}
              aria-pressed={isActive}
              onClick={() => saveUiSettings({ [settingKey]: value })}
              className="grid h-10 w-10 place-items-center border-r last:border-r-0 transition-colors"
              style={{
                backgroundColor: isActive ? styleSettings.primaryColor : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.55)'),
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                color: isActive ? '#ffffff' : (isDark ? 'rgba(255,255,255,0.74)' : 'rgba(30,41,59,0.72)')
              }}
            >
              <Icon size={16} strokeWidth={2.2} />
            </button>
          );
        })}
      </div>
    </div>
  );

  const contrastRatio = getContrastRatio(draftTheme.colors.textPrimary, draftTheme.colors.surface);
  const appBackgroundImage = wallpaper ? `url(${wallpaper})` : effectiveTheme.background.gradient;
  const appBackgroundSize = wallpaper
    ? (styleSettings.wallpaperFit === 'fill' ? '100% 100%' : (styleSettings.wallpaperFit || 'cover'))
    : (effectiveTheme.background.type === 'pattern' ? '18px 18px' : 'cover');

  const SettingsTabButton = ({ id, children }) => (
    <button
      type="button"
      data-testid={`settings-${id}-tab`}
      onClick={() => setSettingsTab(id)}
      className="rounded-[8px] px-3 py-2 text-[12px] font-semibold transition-colors"
      style={{
        backgroundColor: settingsTab === id ? styleSettings.primaryColor : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
        color: settingsTab === id ? '#ffffff' : (isDark ? '#dbe3ee' : '#334155'),
      }}
    >
      {children}
    </button>
  );

  const ColorField = ({ label, value, onChange }) => (
    <label className={`${inputBg} ${inputBorder} flex items-center justify-between gap-3 rounded-[8px] border px-3 py-2`}>
      <span className={`text-[12px] font-semibold ${modalText}`}>{label}</span>
      <span className="flex items-center gap-2">
        <span className={`text-[11px] font-medium ${modalSubText}`}>{value}</span>
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
        />
      </span>
    </label>
  );

  const RangeField = ({ label, value, min, max, suffix = '', onChange }) => (
    <label className={`${inputBg} ${inputBorder} block rounded-[8px] border px-3 py-2`}>
      <span className="mb-2 flex items-center justify-between">
        <span className={`text-[12px] font-semibold ${modalText}`}>{label}</span>
        <span className={`text-[11px] font-medium ${modalSubText}`}>{value}{suffix}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={`h-1.5 w-full cursor-pointer appearance-none rounded-lg ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}
        style={{ accentColor: styleSettings.primaryColor }}
      />
    </label>
  );

  const publishDraftTheme = () => {
    publishTheme(draftTheme);
    saveUiSettings({
      compactMode: draftTheme.layout.density === 'compact',
      boardAlignment: draftTheme.layout.boardAlignment,
      showBookmarkDescriptions: draftTheme.cards.showDescriptions,
      shortenLongTitles: draftTheme.cards.shortenLongTitles,
      hideExtraBookmarks: draftTheme.cards.hideExtraBookmarks,
    });
  };

  const ThemeStudio = () => (
    <div className="space-y-4" data-testid="theme-studio">
      <div className={`${inputBg} ${inputBorder} rounded-[10px] border p-3`}>
        <div className={`mx-2 mb-3 border-b pb-2 text-[11px] font-semibold uppercase tracking-wide ${modalSubText} ${isDark ? 'border-white/10' : 'border-black/10'}`}>Presets</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {presetThemes.map(theme => (
            <button
              key={theme.id}
              type="button"
              data-testid={`theme-preset-${theme.id}`}
              onClick={() => previewPreset(theme)}
              className="rounded-[8px] border p-2 text-left transition-transform hover:-translate-y-0.5"
              style={{
                background: theme.background.gradient,
                borderColor: draftTheme.id === theme.id ? styleSettings.primaryColor : (isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)'),
                color: theme.colors.textPrimary,
              }}
            >
              <span className="block truncate text-[12px] font-bold">{theme.name}</span>
              <span className="mt-2 flex gap-1">
                {[theme.colors.primary, theme.colors.surface, theme.colors.background].map(color => (
                  <span key={color} className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: color }} />
                ))}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className={`${inputBg} ${inputBorder} rounded-[10px] border p-3`}>
        <div className={`mx-2 mb-3 border-b pb-2 text-[11px] font-semibold uppercase tracking-wide ${modalSubText} ${isDark ? 'border-white/10' : 'border-black/10'}`}>Colors</div>
        <div className="grid gap-2 sm:grid-cols-2">
          <ColorField label="Primary" value={draftTheme.colors.primary} onChange={(primary) => updateDraftTheme({ colors: { primary, focus: primary } })} />
          <ColorField label="Surface" value={draftTheme.colors.surface} onChange={(surface) => updateDraftTheme({ colors: { surface } })} />
          <ColorField label="Text" value={draftTheme.colors.textPrimary} onChange={(textPrimary) => updateDraftTheme({ colors: { textPrimary } })} />
          <ColorField label="Border" value={draftTheme.colors.border} onChange={(border) => updateDraftTheme({ colors: { border } })} />
        </div>
        <div className={`mt-3 rounded-[8px] px-3 py-2 text-[12px] font-semibold ${contrastRatio >= 4.5 ? 'text-green-500' : 'text-amber-500'}`}>
          Surface/text contrast: {contrastRatio}:1 {contrastRatio >= 4.5 ? 'passes AA' : 'needs stronger contrast'}
        </div>
      </div>

      <div className={`${inputBg} ${inputBorder} rounded-[10px] border p-3`}>
        <div className={`mx-2 mb-3 border-b pb-2 text-[11px] font-semibold uppercase tracking-wide ${modalSubText} ${isDark ? 'border-white/10' : 'border-black/10'}`}>Effects</div>
        <div className="grid gap-2 sm:grid-cols-2">
          <RangeField label="Board opacity" value={draftTheme.effects.boardOpacity} min={35} max={100} suffix="%" onChange={(boardOpacity) => updateDraftTheme({ effects: { boardOpacity } })} />
          <RangeField label="Board blur" value={draftTheme.effects.boardBlur} min={0} max={32} suffix="px" onChange={(boardBlur) => updateDraftTheme({ effects: { boardBlur } })} />
          <RangeField label="Card radius" value={draftTheme.layout.cardRadius} min={4} max={18} suffix="px" onChange={(cardRadius) => updateDraftTheme({ layout: { cardRadius } })} />
          <RangeField label="Card padding" value={draftTheme.layout.cardPadding} min={8} max={22} suffix="px" onChange={(cardPadding) => updateDraftTheme({ layout: { cardPadding } })} />
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={cancelThemeDraft} className={`rounded-[8px] px-4 py-2 text-[12px] font-semibold ${isDark ? 'bg-white/10 text-slate-200' : 'bg-black/5 text-slate-700'}`}>Cancel</button>
        <button type="button" onClick={saveThemeDraft} className={`rounded-[8px] px-4 py-2 text-[12px] font-semibold ${isDark ? 'bg-white/10 text-slate-200' : 'bg-black/5 text-slate-700'}`}>Save Draft</button>
        <button type="button" onClick={resetTheme} className="rounded-[8px] px-4 py-2 text-[12px] font-semibold text-red-500 hover:bg-red-500/10">Reset</button>
        <button type="button" data-testid="save-theme" onClick={publishDraftTheme} className="rounded-[8px] px-4 py-2 text-[12px] font-semibold text-white" style={{ backgroundColor: styleSettings.primaryColor }}>Save Theme</button>
      </div>
    </div>
  );

  const LayoutStudio = () => (
    <div className={`${inputBg} ${inputBorder} rounded-[10px] border p-3`}>
      <div className={`mx-2 mb-1 border-b pb-2 text-[11px] font-semibold uppercase tracking-wide ${modalSubText} ${isDark ? 'border-white/10' : 'border-black/10'}`}>Layout</div>
      <SettingToggle id="iconOnlyMode" title="Icon-only mode" description="Display bookmarks as a compact grid of icons without titles." />
      {uiSettings.iconOnlyMode && (
        <div className="mx-2 mb-2 flex items-center justify-between rounded-[8px] px-2 py-1.5">
          <span className={`text-[13px] font-semibold leading-5 ${modalText}`}>Icons per row</span>
          <div className="flex rounded-[8px] border p-0.5" style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
            {[3, 4].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => saveUiSettings({ iconColumns: num })}
                className={`w-8 rounded-[6px] py-1 text-[12px] font-semibold transition-all ${uiSettings.iconColumns === num ? 'shadow-sm' : 'opacity-60'}`}
                style={{
                  backgroundColor: uiSettings.iconColumns === num ? styleSettings.primaryColor : 'transparent',
                  color: uiSettings.iconColumns === num ? '#ffffff' : (isDark ? '#e2e8f0' : '#475569')
                }}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      )}
      <SettingToggle id="compactMode" title="Compact mode" description="Reduce spacing to show more bookmarks." />
      <SettingToggle id="hideExtraBookmarks" title="Hide extra bookmarks in long boards" description="Show the first 8 bookmarks in dense boards." />
      <SettingToggle id="shortenLongTitles" title="Shorten long titles" description="Show bookmark titles on one line with ellipsis." />
      <AlignmentSetting settingKey="boardAlignment" title="Board alignment" description="Place boards left, center, right, or spread across the page." />
      <div className={`mx-2 my-2 h-px ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
      <SettingToggle id="showFavoritesDock" title="Show Favorites Dock" description="Display the macOS style dock at the bottom." />
      <div className={`mx-2 flex flex-col gap-2 rounded-[8px] py-2 ${uiSettings.showFavoritesDock ? 'opacity-100' : 'pointer-events-none opacity-50'}`}>
        <div className="flex items-center justify-between">
          <span className={`text-[13px] font-semibold leading-5 ${modalText}`}>Dock Size</span>
          <span className={`text-[12px] font-medium ${isDark ? 'text-white/60' : 'text-black/50'}`}>{uiSettings.dockSize}px</span>
        </div>
        <input
          type="range"
          min="40"
          max="104"
          step="16"
          value={uiSettings.dockSize}
          onChange={(event) => saveUiSettings({ dockSize: Number(event.target.value) })}
          className={`h-1.5 w-full cursor-pointer appearance-none rounded-full ${isDark ? 'bg-white/10' : 'bg-black/10'}`}
          style={{ accentColor: styleSettings.primaryColor }}
        />
      </div>
    </div>
  );

  const AccessibilityStudio = () => (
    <div className={`${inputBg} ${inputBorder} rounded-[10px] border p-3`}>
      <div className={`mx-2 mb-3 border-b pb-2 text-[11px] font-semibold uppercase tracking-wide ${modalSubText} ${isDark ? 'border-white/10' : 'border-black/10'}`}>Accessibility</div>
      {[
        ['reducedMotion', 'Reduced motion', 'Disable heavy transitions and preview motion.'],
        ['highContrast', 'High contrast', 'Prefer stronger text and surface separation.'],
        ['strongFocus', 'Strong focus outlines', 'Make keyboard focus easier to see.'],
      ].map(([key, title, description]) => (
        <button
          key={key}
          type="button"
          onClick={() => updateDraftTheme({ accessibility: { [key]: !draftTheme.accessibility[key] } })}
          className="flex w-full items-center justify-between gap-4 rounded-[8px] px-2 py-2.5 text-left transition-colors hover:bg-white/10"
          aria-pressed={draftTheme.accessibility[key]}
        >
          <span className="min-w-0">
            <span className={`block text-[13px] font-semibold leading-5 ${modalText}`}>{title}</span>
            <span className={`block text-[11px] leading-4 ${modalSubText}`}>{description}</span>
          </span>
          <span className="h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors" style={{ backgroundColor: draftTheme.accessibility[key] ? styleSettings.primaryColor : (isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.16)') }}>
            <span className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${draftTheme.accessibility[key] ? 'translate-x-5' : 'translate-x-0'}`} />
          </span>
        </button>
      ))}
      <div className="mt-3 flex justify-end">
        <button type="button" onClick={publishDraftTheme} className="rounded-[8px] px-4 py-2 text-[12px] font-semibold text-white" style={{ backgroundColor: styleSettings.primaryColor }}>Save Accessibility</button>
      </div>
    </div>
  );

  return (
    <DragDropContext onDragStart={() => setIsDraggingAny(true)} onDragEnd={onDragEnd}>
    <div 
      className="min-h-screen transition-all duration-500 overflow-hidden font-sans"
      style={{
        backgroundColor: effectiveTheme.colors.background,
        backgroundImage: appBackgroundImage,
        backgroundSize: appBackgroundSize,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="relative z-10 flex h-screen w-full flex-col overflow-hidden px-3 pb-3 pt-2 sm:px-10 sm:pb-10 sm:pt-2 lg:px-12 lg:pb-12">
        <div
          className="shrink-0"
          style={{
            width: isMobileLayout ? '100%' : (boardJustifyContent === 'space-between' ? '100%' : `min(100%, ${boardAreaWidth}px)`),
            alignSelf: isMobileLayout ? 'stretch' : (boardJustifyContent === 'center' ? 'center' : (boardJustifyContent === 'end' ? 'flex-end' : 'stretch'))
          }}
        >
        {/* Top Navigation Tabs */}
        <div
          className="relative z-50 mb-2 flex h-12 shrink-0 items-center gap-2 overflow-x-auto overflow-y-visible no-scrollbar sm:mb-3 sm:gap-2.5"
          style={{ justifyContent: isMobileLayout ? 'flex-start' : (boardJustifyContent === 'space-between' ? 'space-between' : 'flex-start') }}
        >
          {tabs.map(tab => (
            <div
              key={tab}
              className="tab-menu-container relative shrink-0"
              onMouseEnter={() => setHoveredTab(tab)}
              onMouseLeave={() => setHoveredTab(null)}
            >
              {renamingTab === tab ? (
                <input
                  autoFocus
                  value={tabRenameInput}
                  onChange={(e) => setTabRenameInput(e.target.value)}
                  onBlur={handleRenameTab}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameTab();
                    if (e.key === 'Escape') setRenamingTab(null);
                  }}
                  className="w-[120px] rounded-[10px] border px-3 py-2 text-[13px] font-semibold outline-none"
                  style={{
                    backgroundColor: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.85)',
                    color: isDark ? '#ffffff' : '#1a1a1a',
                    borderColor: styleSettings.primaryColor
                  }}
                />
              ) : (
                <div
                  className={`page-tab flex overflow-hidden rounded-[10px] border transition-all ${
                    activeTab === tab ? 'shadow-md' : 'shadow-sm hover:scale-[1.02]'
                  }`}
                  style={{
                    backgroundColor: activeTab === tab ? styleSettings.primaryColor : inactiveTabBg,
                    borderColor: activeTab === tab ? styleSettings.primaryColor : (isDark ? mixHex(styleSettings.primaryColor, '#ffffff', 62) : 'rgba(0,0,0,0.12)')
                  }}
                >
                  <button
                    onClick={() => setActiveTab(tab)}
                    className="max-w-[104px] truncate px-3.5 py-2 text-[12px] font-semibold sm:max-w-[116px] sm:px-4 sm:text-[13px]"
                    style={{ color: activeTab === tab ? '#ffffff' : (isDark ? '#e2e8f0' : '#475569') }}
                  >
                    {tab}
                  </button>
                  <button
                    onClick={() => setActiveTabMenu(activeTabMenu === tab ? null : tab)}
                    data-open={activeTabMenu === tab}
                    className={`tab-menu-trigger tab-menu-button grid place-items-center overflow-hidden border-l transition-all ${hoveredTab === tab || activeTabMenu === tab ? 'is-visible' : ''}`}
                    style={{
                      color: activeTab === tab ? '#ffffff' : (isDark ? '#e2e8f0' : '#475569'),
                      borderColor: activeTab === tab ? 'rgba(255,255,255,0.25)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)')
                    }}
                    aria-label={`Open ${tab} page menu`}
                  >
                    <ChevronDown size={14} strokeWidth={2.4} />
                  </button>
                </div>
              )}
              {activeTabMenu === tab && (
                <div
                  className="absolute left-10 top-11 z-50 w-44 rounded-xl border p-1.5 shadow-2xl"
                  style={{
                    backgroundColor: themedMenuBg,
                    borderColor: themedMenuBorder,
                    backdropFilter: 'blur(16px) saturate(150%)',
                    WebkitBackdropFilter: 'blur(16px) saturate(150%)'
                  }}
                >
                  <button onClick={() => handleStartRenameTab(tab)} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold ${isDark ? 'text-slate-200 hover:bg-white/10' : 'text-slate-700 hover:bg-black/5'}`}>
                    <Pencil size={14} /> Rename
                  </button>
                  <button onClick={() => handleShareTab(tab)} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold ${isDark ? 'text-slate-200 hover:bg-white/10' : 'text-slate-700 hover:bg-black/5'}`}>
                    <Share2 size={14} /> Share Page
                  </button>
                  <div className="my-1 h-px" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }} />
                  <button onClick={() => handleDeleteTab(tab)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-red-400 hover:bg-red-500/10">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}
            </div>
          ))}
          {!isTabModalOpen ? (
            <button 
              onClick={() => { setTabInput(''); setIsTabModalOpen(true); }}
              className="rounded-[10px] border px-3 py-2.5 font-semibold shadow-lg transition-all hover:scale-[1.02] sm:px-3.5"
              style={{ backgroundColor: inactiveTabBg, color: isDark ? '#ffffff' : '#1a1a1a', borderColor: isDark ? mixHex(styleSettings.primaryColor, '#ffffff', 62) : 'rgba(0,0,0,0.12)' }}
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
                className="shrink-0 px-2.5 py-1.5 rounded-[6px] font-semibold text-[11px] hover:scale-105 active:scale-95 transition-all shadow-sm"
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
          
        </div>
        <div
          className="mb-4 h-[2px] w-full shrink-0 rounded-full sm:mb-7"
          style={{
            background: isDark
              ? `linear-gradient(90deg, ${hexToRgba(styleSettings.primaryColor, 95)}, rgba(255,255,255,0.24) 55%, rgba(255,255,255,0.06))`
              : 'linear-gradient(90deg, rgba(0,0,0,0.22), rgba(0,0,0,0.12) 55%, rgba(0,0,0,0.04))',
            boxShadow: isDark ? `0 1px 10px ${hexToRgba(styleSettings.primaryColor, 28)}` : '0 1px 8px rgba(0,0,0,0.08)'
          }}
        />
        </div>

        {/* Kanban Board Container (Now Draggable!) */}
          <div
            data-testid="board-canvas"
            className={`grid w-full ${uiSettings.compactMode ? 'gap-2.5 sm:gap-4' : 'gap-3 sm:gap-6'} flex-1 items-start overflow-hidden pb-24 sm:pb-8 min-h-0 no-scrollbar`}
            style={{ gridTemplateColumns: isMobileLayout ? 'repeat(2, minmax(0, 1fr))' : `repeat(${numCols}, 220px)`, justifyContent: isMobileLayout ? 'start' : boardJustifyContent }}
          >
            {(() => {
              const { layout } = getActiveLayoutInfo();
              return layout.map((colIds, colIndex) => (
              <Droppable key={colIndex} droppableId={`masonry-col-${colIndex}`} direction="vertical" type="board">
                {(laneProvided, _laneSnapshot) => (
                  <div 
                    className="group flex w-full min-w-0 flex-col gap-3 items-start rounded-xl transition-colors sm:w-[220px] sm:min-w-[220px] sm:gap-4"
                    {...laneProvided.droppableProps}
                    ref={laneProvided.innerRef}
                  >
                    {colIds.map((columnId, mapIndex) => {
                        const column = columns[columnId];
                        if (!column) return null;
                        const isPrivacyHidden = isPrivacyMode && privacyBoardId !== column.id;
                        return (
                          <Draggable key={column.id} draggableId={column.id} index={mapIndex}>
                            {(boardProvided, boardSnapshot) => (
                              <div 
                                ref={boardProvided.innerRef} 
                                {...boardProvided.draggableProps} 
                                data-testid="board-card"
                                onMouseEnter={() => isPrivacyMode && setPrivacyBoardId(column.id)}
                                onMouseLeave={() => isPrivacyMode && setPrivacyBoardId(null)}
                                className={`group/board w-full max-h-[calc(100vh-180px)] shrink-0 select-none flex flex-col sm:w-[220px] sm:max-h-[800px] ${uiSettings.compactMode ? 'gap-1 px-1.5 py-1.5 sm:gap-1.5 sm:px-3 sm:py-3' : 'gap-1 px-1.5 py-1.5 sm:gap-2.5 sm:px-3.5 sm:pt-3.5 sm:pb-1.5'} rounded-[10px] transition-shadow relative ${boardSnapshot.isDragging ? 'shadow-2xl z-50 cursor-grabbing opacity-95' : ''} ${activeMenuBoardId === column.id ? 'z-[70]' : ''}`}
                                style={{ 
                                  ...boardProvided.draggableProps.style,
                                  backgroundColor: hexToRgba(styleSettings.boardColor, isMobileLayout ? Math.min(styleSettings.boardOpacity, 72) : styleSettings.boardOpacity),
                                  border: boardSnapshot.isDragging ? '0.5px solid transparent' : (isDark ? '0.5px solid rgba(255,255,255,0.12)' : '0.5px solid rgba(0,0,0,0.08)'),
                                  borderRadius: 'var(--radius-card)',
                                  boxShadow: boardSnapshot.isDragging ? '0 24px 48px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.08)'
                                }}
                              >
                                <div
                                  aria-hidden="true"
                                  className="pointer-events-none absolute inset-0 rounded-[10px]"
                                  style={{
                                    borderRadius: 'var(--radius-card)',
                                    backdropFilter: isDraggingAny ? 'none' : `blur(${isMobileLayout ? Math.min(styleSettings.boardBlur, 10) : styleSettings.boardBlur}px) saturate(150%)`,
                                    WebkitBackdropFilter: isDraggingAny ? 'none' : `blur(${isMobileLayout ? Math.min(styleSettings.boardBlur, 10) : styleSettings.boardBlur}px) saturate(150%)`
                                  }}
                                />
                                <Droppable droppableId={column.id} type="bookmark">
                                  {(bookmarkDropProvided, _bookmarkDropSnapshot) => (
                                    <div
                                      ref={bookmarkDropProvided.innerRef}
                                      {...bookmarkDropProvided.droppableProps}
                                      className="relative z-10 flex flex-col min-h-[50px] overflow-y-auto overflow-x-hidden no-scrollbar flex-1 rounded-lg transition-colors"
                                    >
                                      
                                      {/* Column Header & Actions */}
                                      <div className={`flex min-h-7 items-center justify-between gap-1 ${uiSettings.compactMode ? 'mb-0.5' : 'mb-1'} sm:min-h-0 sm:gap-2 sm:mb-2`}>
                                        <div
                                          {...boardProvided.dragHandleProps}
                                          className="flex min-w-0 flex-1 cursor-grab touch-none select-none items-center gap-1.5 rounded-md active:cursor-grabbing"
                                          title="Hold and drag board"
                                          aria-label={`Drag board ${column.title}`}
                                        >
                                          {editingBoardId === column.id ? (
                                            <input
                                              autoFocus
                                              value={boardTitleValue}
                                              onChange={(e) => setBoardTitleValue(e.target.value)}
                                              onBlur={handleSaveBoardTitle}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveBoardTitle();
                                                if (e.key === 'Escape') setEditingBoardId(null);
                                              }}
                                              onMouseDown={(e) => e.stopPropagation()}
                                              className="min-w-0 flex-1 rounded-md bg-white/10 px-2 py-1 text-[14px] font-semibold outline-none"
                                              style={{ color: isDark ? '#ffffff' : '#1e293b' }}
                                            />
                                          ) : (
                                            <div className="min-w-0 truncate text-[11px] font-medium leading-4 sm:text-[15px] sm:font-semibold select-none" style={{ color: isDark ? '#ffffff' : '#1e293b' }}>
                                              {column.title}
                                            </div>
                                          )}
                                        </div>
                                        <div className={`flex shrink-0 items-center gap-0.5 opacity-70 transition-opacity duration-200 sm:opacity-0 sm:group-hover/board:opacity-100 ${(activeInlineAddBoardId === column.id || activeMenuBoardId === column.id) ? '!opacity-100' : ''}`}>
                                          <button 
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onClick={() => {
                                              setActiveInlineAddBoardId(activeInlineAddBoardId === column.id ? null : column.id);
                                              setInlineInputValue('');
                                            }}
                                            className="rounded-lg p-1 transition-colors sm:p-1.5"
                                            style={{ color: isDark ? '#e2e8f0' : '#475569', backgroundColor: activeInlineAddBoardId === column.id ? hexToRgba(styleSettings.primaryColor, 30) : 'transparent' }}
                                          >
                                            <Link2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.5}/>
                                          </button>
                                          <button 
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onClick={() => setActiveMenuBoardId(activeMenuBoardId === column.id ? null : column.id)}
                                            className="board-menu-trigger rounded-lg p-1 transition-colors hover:bg-black/10 sm:p-1.5"
                                            style={{ color: isDark ? '#e2e8f0' : '#475569' }}
                                          >
                                            <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.5}/>
                                          </button>
                                        </div>
                                      </div>

                                      <div className={`${uiSettings.compactMode ? 'mb-0.5 sm:mb-2' : 'mb-1 sm:mb-3'} h-px w-full`} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}></div>

                                        <div 
                                          className={`flex-1 ${uiSettings.iconOnlyMode ? 'grid content-start gap-1 sm:gap-2' : `flex flex-col ${uiSettings.compactMode ? 'gap-0' : 'gap-0.5'}`} relative`}
                                          style={uiSettings.iconOnlyMode ? { gridTemplateColumns: `repeat(${uiSettings.iconColumns || 4}, minmax(0, 1fr))` } : {}}
                                        >
                                          {displayColumns[column.id].bookmarks.map((bookmark, idx) => (
                                          <Draggable key={bookmark.id} draggableId={bookmark.id} index={idx} isDragDisabled={editingBookmarkId === bookmark.id}>
                                            {(bookmarkProvided, bookmarkSnapshot) => (
                                              <div
                                                ref={bookmarkProvided.innerRef}
                                                {...bookmarkProvided.draggableProps}
                                                {...bookmarkProvided.dragHandleProps}
                                                className={`group/bookmark relative flex touch-none items-center gap-1 px-0.5 py-0.5 sm:gap-2 ${uiSettings.compactMode ? 'sm:py-1 sm:px-1.5' : 'sm:py-1.5 sm:px-2'} rounded-lg select-none transition-colors ${
                                                  bookmarkSnapshot.isDragging ? 'z-50 shadow-xl bg-white/15 dark:bg-white/15 cursor-grabbing' : 'cursor-grab hover:bg-black/5 active:cursor-grabbing dark:hover:bg-white/10'
                                                } ${uiSettings.iconOnlyMode ? 'justify-self-center p-2 sm:p-2.5' : ''}`}
                                                title={uiSettings.iconOnlyMode ? cleanTitle(bookmark.title) : undefined}
                                                onContextMenu={(e) => {
                                                  if (uiSettings.iconOnlyMode) {
                                                    e.preventDefault();
                                                    setActiveContextMenuId(activeContextMenuId === bookmark.id ? null : bookmark.id);
                                                  }
                                                }}
                                              >
                                                {editingBookmarkId === bookmark.id ? (
                                                  <div
                                                    className="w-full relative z-50 rounded-lg p-2 shadow-inner"
                                                    style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.45)' }}
                                                  >
                                                    <input
                                                      type="text"
                                                      className={`mb-1 w-full rounded-md px-2 py-1 text-[12px] font-semibold outline-none ${isDark ? 'bg-white/10 text-white placeholder:text-white/40' : 'bg-white/60 text-slate-900 placeholder:text-slate-500'}`}
                                                      value={editTitleValue}
                                                      onChange={e => setEditTitleValue(e.target.value)}
                                                      onKeyDown={(e) => e.key === 'Enter' && handleSaveEditBookmark(column.id)}
                                                      autoFocus
                                                    />
                                                    <div className="flex items-center gap-1.5">
                                                      <input
                                                        type="text"
                                                        className={`min-w-0 flex-1 rounded-md px-2 py-1 text-[11px] outline-none ${isDark ? 'bg-white/10 text-white/70 placeholder:text-white/35' : 'bg-white/60 text-slate-600 placeholder:text-slate-400'}`}
                                                        value={editUrlValue}
                                                        onChange={e => setEditUrlValue(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEditBookmark(column.id)}
                                                      />
                                                      <button
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={() => handleSaveEditBookmark(column.id)}
                                                        className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-white shadow-sm"
                                                        style={{ backgroundColor: styleSettings.primaryColor }}
                                                        title="Save"
                                                      >
                                                        <Check size={14} strokeWidth={2.5} />
                                                      </button>
                                                      <button
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={() => setEditingBookmarkId(null)}
                                                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${isDark ? 'bg-white/10 text-white/70 hover:text-white' : 'bg-black/5 text-slate-500 hover:text-slate-900'}`}
                                                        title="Cancel"
                                                      >
                                                        <X size={14} strokeWidth={2.5} />
                                                      </button>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <>
                                                    <img 
                                                      src={getFaviconUrl(bookmark.url, 64)}
                                                      onError={handleFaviconError}
                                                      alt=""
                                                      draggable={false}
                                                      className={`${uiSettings.iconOnlyMode ? (uiSettings.iconColumns === 3 ? 'h-8 w-8 sm:h-10 sm:w-10' : 'h-6 w-6 sm:h-7 sm:w-7') : 'h-4 w-4 sm:h-[20px] sm:w-[20px]'} shrink-0 rounded-[4px] object-contain transition-transform duration-200 group-hover/bookmark:scale-110`}
                                                    />
                                                    {uiSettings.iconOnlyMode && (
                                                      <a 
                                                        href={bookmark.url}
                                                        className="absolute inset-0 z-10"
                                                        target={uiSettings.openLinksInNewTab ? '_blank' : undefined}
                                                        rel={uiSettings.openLinksInNewTab ? 'noreferrer' : undefined}
                                                        draggable={false}
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
                                                      />
                                                    )}
                                                    {!uiSettings.iconOnlyMode && (
                                                      <a 
                                                        href={bookmark.url} 
                                                        draggable={false}
                                                        target={uiSettings.openLinksInNewTab ? '_blank' : undefined}
                                                        rel={uiSettings.openLinksInNewTab ? 'noreferrer' : undefined}
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
                                                        className={`text-[10.5px] font-[400] transition-all flex-1 min-w-0 sm:text-[13px] sm:group-hover/bookmark:pr-14 ${isDark ? 'text-white/80 hover:text-white' : 'text-slate-700 hover:text-black'}`}
                                                      >
                                                        <span className={uiSettings.shortenLongTitles ? 'block truncate' : 'block break-words leading-snug'}>
                                                          {cleanTitle(bookmark.title)}
                                                        </span>
                                                        {uiSettings.showBookmarkDescriptions && (
                                                          <span className={`block truncate text-[10px] leading-3 ${isDark ? 'text-white/45' : 'text-slate-500'}`}>
                                                            {getBookmarkHost(bookmark.url)}
                                                          </span>
                                                        )}
                                                      </a>
                                                    )}
                                                    
                                                    {/* Inline Actions */}
                                                    <div className={`absolute ${uiSettings.iconOnlyMode ? 'inset-x-0 -bottom-1.5 justify-center z-20 gap-1 context-menu-actions transition-all duration-200' : 'right-2 gap-2 opacity-0 group-hover/bookmark:opacity-100 transition-opacity pointer-events-none group-hover/bookmark:pointer-events-auto'} ${uiSettings.iconOnlyMode ? (activeContextMenuId === bookmark.id ? 'flex opacity-100 scale-100 pointer-events-auto' : 'flex opacity-0 scale-95 pointer-events-none') : 'flex'} items-center`}>
                                                      <button 
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveContextMenuId(null); toggleFavorite(bookmark.id); }}
                                                        className={`transition-colors ${favoriteBookmarkIds.includes(bookmark.id) ? 'text-yellow-400 hover:text-yellow-500' : (isDark || uiSettings.iconOnlyMode ? 'hover:text-white text-slate-300' : 'hover:text-slate-900 text-slate-500')} ${uiSettings.iconOnlyMode ? 'bg-black/80 shadow-md rounded-full p-1 border border-white/10' : ''}`}
                                                      >
                                                        <Star size={uiSettings.iconOnlyMode ? 10 : 14} strokeWidth={uiSettings.iconOnlyMode ? 2.5 : 2} fill={favoriteBookmarkIds.includes(bookmark.id) ? 'currentColor' : 'none'} />
                                                      </button>
                                                      <button 
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveContextMenuId(null); setEditingBookmarkId(bookmark.id); setEditTitleValue(bookmark.title || ''); setEditUrlValue(bookmark.url || ''); }}
                                                        className={`transition-colors ${isDark || uiSettings.iconOnlyMode ? 'hover:text-white text-slate-300' : 'hover:text-slate-900 text-slate-500'} ${uiSettings.iconOnlyMode ? 'bg-black/80 shadow-md rounded-full p-1 border border-white/10' : ''}`}
                                                      >
                                                        <Pencil size={uiSettings.iconOnlyMode ? 10 : 14} strokeWidth={uiSettings.iconOnlyMode ? 2.5 : 2} />
                                                      </button>
                                                      <button 
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveContextMenuId(null); handleDeleteBookmark(column.id, bookmark.id); }}
                                                        className={`text-red-400/90 hover:text-red-500 transition-colors ${uiSettings.iconOnlyMode ? 'bg-black/80 shadow-md rounded-full p-1 border border-white/10' : ''}`}
                                                      >
                                                        <Trash2 size={uiSettings.iconOnlyMode ? 10 : 14} strokeWidth={uiSettings.iconOnlyMode ? 2.5 : 2} />
                                                      </button>
                                                    </div>
                                                  </>
                                                )}
                                              </div>
                                            )}
                                          </Draggable>
                                        ))}
                                        {bookmarkDropProvided.placeholder}

                                        {uiSettings.hideExtraBookmarks && columns[column.id].bookmarks.length > displayColumns[column.id].bookmarks.length && (
                                          <div className={`px-2 py-1 text-[11px] font-semibold ${isDark ? 'text-white/45' : 'text-slate-500'}`}>
                                            +{columns[column.id].bookmarks.length - displayColumns[column.id].bookmarks.length} hidden
                                          </div>
                                        )}

                                        {/* Inline Add Link */}
                                        {activeInlineAddBoardId === column.id && (
                                          <div
                                            className="mt-1 flex w-full items-center gap-1.5 rounded-lg p-1.5 shadow-inner"
                                            style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.45)' }}
                                          >
                                            <input 
                                              type="text"
                                              autoFocus
                                              placeholder="Type URL..."
                                              className={`min-w-0 flex-1 rounded-md px-2.5 py-1.5 text-[12px] font-medium outline-none ${isDark ? 'bg-white/10 text-white placeholder:text-white/35' : 'bg-white/60 text-slate-900 placeholder:text-slate-500'}`}
                                              value={inlineInputValue}
                                              onChange={(e) => setInlineInputValue(e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleInlineAddLink(column.id);
                                                if (e.key === 'Escape') setActiveInlineAddBoardId(null);
                                              }}
                                            />
                                            <button 
                                              onClick={() => handleInlineAddLink(column.id)} 
                                              className="shrink-0 rounded-md px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90" 
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
                                {activeMenuBoardId === column.id && (
                                  <div
                                    className="board-menu-container absolute right-2 top-12 z-[90] w-44 rounded-xl border p-1.5 shadow-2xl"
                                    style={{
                                      backgroundColor: themedMenuBg,
                                      borderColor: themedMenuBorder,
                                      backdropFilter: 'blur(18px) saturate(150%)',
                                      WebkitBackdropFilter: 'blur(18px) saturate(150%)'
                                    }}
                                  >
                                    <button onClick={() => handleOpenAllLinks(column.id)} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold ${isDark ? 'text-slate-200 hover:bg-white/10' : 'text-slate-700 hover:bg-black/5'}`}><ExternalLink size={14}/> Open All Links</button>
                                    <button onClick={() => handleFetchTitles(column.id)} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold ${isDark ? 'text-slate-200 hover:bg-white/10' : 'text-slate-700 hover:bg-black/5'}`}><RefreshCw size={14}/> Fetch Titles</button>
                                    <button onClick={() => handleStartEditBoard(column.id)} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold ${isDark ? 'text-slate-200 hover:bg-white/10' : 'text-slate-700 hover:bg-black/5'}`}><Pencil size={14}/> Edit Board</button>
                                    <button onClick={() => handleShareBoard(column.id)} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold ${isDark ? 'text-slate-200 hover:bg-white/10' : 'text-slate-700 hover:bg-black/5'}`}><Share2 size={14}/> Share Board</button>
                                    <div className="my-1 h-px" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }} />
                                    <button onClick={() => handleDeleteBoard(column.id)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-red-400 transition-colors hover:bg-red-500/10"><Trash2 size={14}/> Delete Board</button>
                                  </div>
                                )}
                                {isPrivacyHidden && (
                                  <div
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-0 z-20 rounded-[10px]"
                                    style={{
                                      backgroundColor: hexToRgba(styleSettings.boardColor, isDark ? 18 : 24),
                                      backdropFilter: 'blur(8px) saturate(115%)',
                                      WebkitBackdropFilter: 'blur(8px) saturate(115%)',
                                      border: isDark ? '0.5px solid rgba(255,255,255,0.10)' : '0.5px solid rgba(0,0,0,0.06)',
                                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)'
                                    }}
                                  />
                                )}
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                    {laneProvided.placeholder}
                    {/* Render the ADD BOARD button for EVERY column */}
                    <div className="mt-1 w-full shrink-0 sm:mt-2 sm:w-[220px]">
                      {activeAddBoardColIndex !== colIndex ? (
                        <button 
                          onClick={() => { setCategoryInput(''); setActiveAddBoardColIndex(colIndex); }}
                          className="flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed py-2 text-[10.5px] font-semibold opacity-75 transition-all hover:bg-black/5 focus:opacity-100 dark:hover:bg-white/5 sm:gap-2 sm:border-[1.5px] sm:py-4 sm:text-[13px] sm:opacity-0 sm:group-hover:opacity-100 sm:hover:opacity-100"
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
                            className="shrink-0 px-3 py-1.5 rounded-[8px] font-semibold text-[12px] hover:scale-105 active:scale-95 transition-all shadow-sm text-white"
                            style={{ backgroundColor: styleSettings.primaryColor }}
                          >
                            Add
                          </button>
                          <button 
                            onClick={() => setActiveAddBoardColIndex(null)} 
                            className={`shrink-0 w-[28px] h-[28px] flex items-center justify-center rounded-[8px] hover:scale-105 active:scale-95 transition-all shadow-sm ${isDark ? 'bg-white/10 text-white/70 hover:text-white border border-white/10' : 'bg-black/5 text-slate-600 hover:text-slate-900 border border-black/5'}`}
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
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-3 z-40 flex flex-col gap-2.5 sm:bottom-8 sm:right-8 sm:gap-3">
        <input
          ref={importFileInputRef}
          type="file"
          accept=".txt,.csv,.md,text/plain,text/csv"
          className="hidden"
          onChange={handleImportLinksFile}
        />
        {uiSettings.groupRightTools ? (
          <>
            {renderToolButton(primaryToolbarButton)}
            <div
              className={`flex flex-col gap-3 transition-all duration-[360ms] ease-out ${
                isToolMenuOpen
                  ? 'max-h-[330px]'
                  : 'pointer-events-none max-h-0'
              }`}
              style={{
                transitionProperty: 'max-height',
              }}
            >
              {expandableToolbarButtons.map((btn, index) => renderToolButton(btn, {
                opacity: isToolMenuOpen ? 1 : 0,
                transform: isToolMenuOpen ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.86)',
                transitionDelay: isToolMenuOpen ? `${index * 35}ms` : `${(expandableToolbarButtons.length - index - 1) * 20}ms`,
              }))}
            </div>
          </>
        ) : (
          toolbarButtons.map(btn => renderToolButton(btn))
        )}
        {uiSettings.groupRightTools && (
          <div className="relative">
            <button
              onClick={() => {
                setIsToolMenuOpen(!isToolMenuOpen);
                setIsImportMenuOpen(false);
              }}
              title={isToolMenuOpen ? 'Close tools' : 'More tools'}
              className="relative h-11 w-11 backdrop-blur-xl rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ease-out hover:scale-105 border-[0.5px] sm:h-[50px] sm:w-[50px]"
              style={{
                backgroundColor: isToolMenuOpen ? '#ef4444' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)'),
                color: isToolMenuOpen ? '#ffffff' : (isDark ? 'white' : '#334155'),
                borderColor: isToolMenuOpen ? 'rgba(255,255,255,0.3)' : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)')
              }}
            >
              <Menu
                size={20}
                strokeWidth={2.2}
                className={`absolute transition-all duration-300 ease-out ${isToolMenuOpen ? 'rotate-90 scale-75 opacity-0' : 'rotate-0 scale-100 opacity-100'}`}
              />
              <X
                size={20}
                strokeWidth={2.2}
                className={`absolute transition-all duration-300 ease-out ${isToolMenuOpen ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-75 opacity-0'}`}
              />
            </button>
          </div>
        )}
        {/* Settings Button */}
        <button onClick={() => setIsSettingsOpen(true)} title="Settings" className="h-11 w-11 rounded-full flex items-center justify-center shadow-xl hover:opacity-90 hover:scale-105 transition-all border-[0.5px] border-white/20 sm:h-[50px] sm:w-[50px]" style={{ backgroundColor: styleSettings.primaryColor, color: '#ffffff' }}>
          <Settings size={19} strokeWidth={2.2} />
        </button>
      </div>

      <div className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 z-40 sm:bottom-8 sm:left-8">
        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleWallpaperUpload} />
        <button onClick={() => fileInputRef.current?.click()} className="h-11 w-11 backdrop-blur-xl rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 border-[0.5px] sm:h-[44px] sm:w-[44px]" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)', color: isDark ? 'white' : '#334155', borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }}>
          <ImageIcon size={19} strokeWidth={2.2} />
        </button>
      </div>

      {isSearchOpen && (
        <div
          className="fixed inset-0 z-[95] flex items-start justify-center bg-black/35 px-4 pt-[18vh] backdrop-blur-md sm:items-center sm:pt-0"
          onMouseDown={closeSearch}
        >
          <div
            className="w-full max-w-[560px] rounded-[10px] border p-2 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              backgroundColor: isDark ? hexToRgba(styleSettings.boardColor, 92) : hexToRgba(styleSettings.boardColor, 96),
              borderColor: isDark ? hexToRgba(styleSettings.primaryColor, 55) : 'rgba(0,0,0,0.10)',
              backdropFilter: `blur(${Math.max(styleSettings.boardBlur, 16)}px) saturate(160%)`,
              WebkitBackdropFilter: `blur(${Math.max(styleSettings.boardBlur, 16)}px) saturate(160%)`
            }}
          >
            <div className="flex items-center gap-2">
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-[8px] ${isDark ? 'bg-white/10 text-white/80' : 'bg-black/5 text-slate-600'}`}>
                <Search size={18} strokeWidth={2.3} />
              </div>
              <input
                autoFocus
                type="search"
                placeholder="Search bookmarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleBrowserSearch();
                  if (e.key === 'Escape') closeSearch();
                }}
                className="min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none placeholder:text-current placeholder:opacity-45"
                style={{ color: isDark ? '#ffffff' : '#1e293b' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-[8px] transition-colors ${isDark ? 'text-white/70 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-black/5 hover:text-slate-900'}`}
                  title="Clear search"
                >
                  <X size={17} strokeWidth={2.4} />
                </button>
              )}
            </div>
            <div className={`px-12 pb-1 pt-1.5 text-[11px] font-medium ${modalSubText}`}>
              {searchQuery ? `${searchResultCount} bookmark${searchResultCount === 1 ? '' : 's'} found` : 'Type title or URL to filter your boards'}
            </div>
            {normalizedSearchQuery && (
              <div className="mt-1 overflow-hidden rounded-[8px]">
                {searchMatches.slice(0, 5).map(bookmark => (
                  <button
                    key={bookmark.id}
                    onClick={() => openSearchUrl(bookmark.url)}
                    className={`flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                  >
                    <img
                      src={getFaviconUrl(bookmark.url)}
                      onError={(e) => handleFaviconError(e, bookmark.url)}
                      alt=""
                      className="h-5 w-5 shrink-0 rounded-[4px]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[13px] font-medium ${modalText}`}>{cleanTitle(bookmark.title)}</span>
                      <span className={`block truncate text-[10.5px] ${modalSubText}`}>{bookmark.boardTitle} - {getBookmarkHost(bookmark.url)}</span>
                    </span>
                  </button>
                ))}
                <button
                  onClick={handleBrowserSearch}
                  className={`flex w-full items-center gap-2.5 border-t px-2.5 py-2.5 text-left transition-colors ${isDark ? 'border-white/10 text-white hover:bg-white/10' : 'border-black/10 text-slate-800 hover:bg-black/5'}`}
                >
                  <Globe2 size={18} strokeWidth={2.1} className="shrink-0" />
                  <span className="min-w-0 truncate text-[13px] font-semibold">Search web for "{searchQuery.trim()}"</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* General Settings Modal */}
      {isSettingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            className="flex max-h-[calc(100dvh-1rem)] w-full max-w-[560px] flex-col rounded-[10px] border p-4 shadow-2xl transition-colors sm:max-h-[calc(100dvh-2rem)] sm:p-5"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: isDark ? hexToRgba(styleSettings.boardColor, Math.min(styleSettings.boardOpacity + 8, 94)) : hexToRgba(styleSettings.boardColor, 96),
              borderColor: isDark ? hexToRgba(styleSettings.primaryColor, 55) : 'rgba(0,0,0,0.1)',
              backdropFilter: `blur(${Math.max(styleSettings.boardBlur, 14)}px) saturate(150%)`,
              WebkitBackdropFilter: `blur(${Math.max(styleSettings.boardBlur, 14)}px) saturate(150%)`
            }}
          >
            <div className="mb-4 flex shrink-0 items-center justify-between">
              <h3 className={`text-[22px] font-semibold leading-none ${modalText}`}>Settings</h3>
              <button onClick={() => setIsSettingsOpen(false)} className={`grid h-8 w-8 place-items-center rounded-[8px] transition-colors ${isDark ? 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white' : 'bg-black/5 text-slate-500 hover:bg-black/10 hover:text-slate-900'}`}>
                <X size={18} strokeWidth={2.4} />
              </button>
            </div>
            <div className="mb-4 flex shrink-0 flex-wrap gap-2">
              <SettingsTabButton id="general">General</SettingsTabButton>
              <SettingsTabButton id="theme">Theme</SettingsTabButton>
              <SettingsTabButton id="layout">Layout</SettingsTabButton>
              <SettingsTabButton id="accessibility">Accessibility</SettingsTabButton>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))] no-scrollbar">
              {settingsTab === 'general' && (
                <div className="space-y-4">
                  <div className={`${inputBg} ${inputBorder} rounded-[10px] border p-3`}>
                    <div className={`mx-2 mb-1 border-b pb-2 text-[11px] font-semibold uppercase tracking-wide ${modalSubText} ${isDark ? 'border-white/10' : 'border-black/10'}`}>Appearance</div>
                    <SettingToggle id="groupRightTools" title="Group right-side tools" description="Keep Search and Settings visible, and place other tools in one menu." />
                    <SettingToggle id="showBookmarkDescriptions" title="Show bookmark descriptions" description="Display each bookmark domain below its title." />
                  </div>

                  <div className={`${inputBg} ${inputBorder} rounded-[10px] border p-3`}>
                    <div className={`mx-2 mb-1 border-b pb-2 text-[11px] font-semibold uppercase tracking-wide ${modalSubText} ${isDark ? 'border-white/10' : 'border-black/10'}`}>Behavior</div>
                    <SettingToggle id="openLinksInNewTab" title="Open links in new tab" description="Open bookmarks in a new browser tab." />
                  </div>
                </div>
              )}
              {settingsTab === 'theme' && <ThemeStudio />}
              {settingsTab === 'layout' && <LayoutStudio />}
              {settingsTab === 'accessibility' && <AccessibilityStudio />}
            </div>
          </div>
        </div>
      )}

      {/* Wallpaper Style Modal */}
      {isWallpaperStyleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div 
            className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[10px] p-4 shadow-2xl transition-all no-scrollbar sm:p-7"
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
                  <span className={`text-[13px] font-medium ${modalText}`}>Wallpaper Fit</span>
                </div>
                <div className="flex rounded-lg overflow-hidden border border-black/10">
                  {['cover', 'contain', 'fill'].map((fit) => (
                    <button
                      key={fit}
                      onClick={() => saveStyleSettings({...styleSettings, wallpaperFit: fit})}
                      className={`flex-1 py-1.5 text-[12px] font-medium transition-colors ${(styleSettings.wallpaperFit || 'cover') === fit ? 'shadow-sm' : 'opacity-70'}`}
                      style={{ 
                        backgroundColor: (styleSettings.wallpaperFit || 'cover') === fit ? styleSettings.primaryColor : 'transparent',
                        color: (styleSettings.wallpaperFit || 'cover') === fit ? '#ffffff' : (isDark ? '#e2e8f0' : '#475569') 
                      }}
                    >
                      {fit.charAt(0).toUpperCase() + fit.slice(1)}
                    </button>
                  ))}
                </div>
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
              <button onClick={() => setIsWallpaperStyleOpen(false)} className={`px-5 py-2 rounded-xl font-medium text-[13px] transition-colors ${isDark ? 'text-slate-300 bg-white/10 hover:bg-white/20' : 'text-slate-600 bg-black/5 hover:bg-black/10'}`}>Close</button>
            </div>
          </div>
        </div>
      )}



      {/* Dashboard Modal */}
      {isDashboardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div 
            className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[10px] p-4 shadow-2xl transition-all no-scrollbar sm:p-8"
            style={{ 
              backgroundColor: hexToRgba(styleSettings.boardColor, styleSettings.boardOpacity),
              backdropFilter: `blur(${styleSettings.boardBlur}px) saturate(150%)`,
              WebkitBackdropFilter: `blur(${styleSettings.boardBlur}px) saturate(150%)`,
              border: isDark ? '0.5px solid rgba(255,255,255,0.12)' : '0.5px solid rgba(0,0,0,0.08)'
            }}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-xl font-semibold ${modalText}`}>Analytics Dashboard</h3>
              <LayoutDashboard size={24} className={modalText} opacity={0.5} />
            </div>
            
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div className={`${inputBg} ${inputBorder} p-5 rounded-2xl border flex flex-col items-center justify-center`}>
                <span className={`text-[13px] font-semibold ${modalSubText} mb-1`}>Total Bookmarks</span>
                <span className={`text-3xl font-semibold ${modalText}`} style={{ color: styleSettings.primaryColor }}>{getTotalBookmarks()}</span>
              </div>
              <div className={`${inputBg} ${inputBorder} p-5 rounded-2xl border flex flex-col items-center justify-center`}>
                <span className={`text-[13px] font-semibold ${modalSubText} mb-1`}>Total Boards</span>
                <span className={`text-3xl font-semibold ${modalText}`} style={{ color: styleSettings.primaryColor }}>{getTotalBoards()}</span>
              </div>
            </div>

            <div className={`${inputBg} ${inputBorder} p-5 rounded-2xl border mb-8 flex items-center justify-between`}>
              <div className="flex flex-col">
                <span className={`text-[12px] font-semibold ${modalSubText} mb-1`}>Most Populated Board</span>
                <span className={`text-[15px] font-semibold ${modalText}`}>{getMostPopulatedBoard().name}</span>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white" style={{ backgroundColor: styleSettings.primaryColor }}>
                {getMostPopulatedBoard().count}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setIsDashboardOpen(false)} className={`px-5 py-2.5 w-full rounded-xl font-semibold text-[13px] transition-colors ${isDark ? 'text-slate-300 bg-white/10 hover:bg-white/20' : 'text-slate-600 bg-black/5 hover:bg-black/10'}`}>Close Dashboard</button>
            </div>
          </div>
        </div>
      )}

      {/* Trash Modal */}
      {isTrashOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setIsTrashOpen(false)}
        >
          <div
            className="flex max-h-[calc(100dvh-2rem)] w-full max-w-[520px] flex-col rounded-[10px] border p-4 shadow-2xl transition-colors sm:p-5"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: isDark ? hexToRgba(styleSettings.boardColor, Math.min(styleSettings.boardOpacity + 10, 96)) : hexToRgba(styleSettings.boardColor, 96),
              borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
              backdropFilter: `blur(${Math.max(styleSettings.boardBlur, 14)}px) saturate(150%)`,
              WebkitBackdropFilter: `blur(${Math.max(styleSettings.boardBlur, 14)}px) saturate(150%)`
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className={`text-[20px] font-semibold leading-none ${modalText}`}>Trash</h3>
              <button
                onClick={handleEmptyTrash}
                disabled={trashBookmarks.length === 0}
                className="grid h-9 w-9 place-items-center rounded-[8px] text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-35"
                title="Empty trash"
              >
                <Trash2 size={19} strokeWidth={2.2} />
              </button>
            </div>
            
            <div className="mb-5 flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto pr-1 no-scrollbar">
              {trashBookmarks.length > 0 ? (
                trashBookmarks.map(bm => (
                  <div key={bm.id} className={`${inputBg} ${inputBorder} flex items-center justify-between rounded-[8px] border px-3 py-2.5`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      <img src={getFaviconUrl(bm.url, 32)} onError={handleFaviconError} className="w-5 h-5 rounded shrink-0" alt=""/>
                      <span className={`text-[13px] font-semibold truncate ${modalText}`}>{bm.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => handleRestoreBookmark(bm.id)} className="p-1.5 hover:bg-green-500/10 text-green-600 rounded-lg transition-colors" title="Restore"><RefreshCw size={14}/></button>
                      <button onClick={() => handlePermanentDeleteBookmark(bm.id)} className="p-1.5 hover:bg-red-500/10 text-red-600 rounded-lg transition-colors" title="Delete permanently"><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))
              ) : (
                <div className={`grid min-h-[120px] place-items-center text-[13px] font-medium ${modalSubText}`}>Trash is empty.</div>
              )}
            </div>

            <div className="flex justify-end shrink-0">
              <button onClick={() => setIsTrashOpen(false)} className={`rounded-[8px] px-4 py-2 text-[13px] font-semibold transition-colors ${isDark ? 'bg-white/10 text-slate-200 hover:bg-white/15' : 'bg-black/5 text-slate-700 hover:bg-black/10'}`}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* MacOS Dock */}
      {uiSettings.showFavoritesDock && (
      <Droppable droppableId="favorites-dock" direction="horizontal" isDropDisabled={false}>
        {(provided, snapshot) => {
          // Compute favorite apps dynamically
          const favoriteApps = favoriteBookmarkIds.map(id => {
            for (const col of Object.values(columns)) {
              const bm = col.bookmarks.find(b => b.id === id);
              if (bm) {
                return {
                  id: bm.id,
                  name: bm.title,
                  icon: getFaviconUrl(bm.url, 128)
                };
              }
            }
            return null;
          }).filter(Boolean);

          if (favoriteApps.length === 0 && !snapshot.isDraggingOver) {
            return (
              <div ref={provided.innerRef} {...provided.droppableProps} className="hidden">
                 {provided.placeholder}
              </div>
            );
          }

          return (
            <div 
              ref={provided.innerRef} 
              {...provided.droppableProps}
              className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 transition-transform ${snapshot.isDraggingOver ? 'scale-105' : 'scale-100'}`}
            >
              <MacOSDock
                apps={favoriteApps}
                size={uiSettings.dockSize}
                onAppClick={(appId) => {
                  const app = favoriteApps.find(a => a.id === appId);
                  if (app) {
                    const originalCol = Object.values(columns).find(c => c.bookmarks.some(b => b.id === appId));
                    const originalBm = originalCol?.bookmarks.find(b => b.id === appId);
                    if (originalBm) {
                      window.open(originalBm.url, uiSettings.openLinksInNewTab ? '_blank' : '_self');
                    }
                  }
                  handleDockAppClick(appId);
                }}
                openApps={openDockApps}
              />
              <div className="hidden">{provided.placeholder}</div>
            </div>
          );
        }}
      </Droppable>
      )}
    </div>
    </DragDropContext>
  )
}

export default App
