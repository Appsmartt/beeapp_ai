'use client';

import { useState } from 'react';
import {
  MessageCircle,
  Users,
  SquarePen,
  Plus,
  Lock,
  Megaphone,
  CheckCircle,
} from 'lucide-react';
import { MOCK_CHATS, ChatItem } from '@/mocks/chats';
import { MOCK_COMMUNITIES, CommunityItem } from '@/mocks/communities';
import { MOCK_STATUSES, StatusItem } from '@/mocks/statuses';
import ChatConversation from './ChatConversation';
import ChatProfile from './ChatProfile';
import CommunityScreen from './CommunityScreen';
import CommunityProfile from './CommunityProfile';
import StatusViewer from './StatusViewer';
import CreateStatusModal from './CreateStatusModal';
import CreateCategoryModal from './modals/CreateCategoryModal';
import CreateCommunityModal from './modals/CreateCommunityModal';
import AiSettingsScreen from './modals/AiSettingsScreen';
import AiCatalogModal from './modals/AiCatalogModal';

export default function ChatModule() {
  const [activeTab, setActiveTab] = useState<'chats' | 'communities'>('chats');
  const [chats, setChats] = useState<ChatItem[]>(MOCK_CHATS);
  const [communities, setCommunities] = useState<CommunityItem[]>(MOCK_COMMUNITIES);
  const [statuses, setStatuses] = useState<StatusItem[]>(MOCK_STATUSES);
  
  // Navigation State
  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null);
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityItem | null>(null);
  const [viewingProfile, setViewingProfile] = useState<'chat' | 'community' | null>(null);
  const [activeStatus, setActiveStatus] = useState<StatusItem | null>(null);

  // Modals & Menus
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [createCommunityOpen, setCreateCommunityOpen] = useState(false);
  const [createStatusOpen, setCreateStatusOpen] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [aiCatalogOpen, setAiCatalogOpen] = useState(false);

  // Filter Categories
  const [categories, setCategories] = useState<{ id: string; name: string; color: string }[]>([
    { id: 'cat-1', name: 'Trabajo', color: '#6025d2' },
    { id: 'cat-2', name: 'Clientes', color: '#2196F3' },
  ]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Handle Category Creation
  const handleCreateCategory = (name: string, iconName: string, color: string) => {
    const newCat = { id: `cat-${Date.now()}`, name, color };
    setCategories((prev) => [...prev, newCat]);
  };

  // Handle Community Creation
  const handleCreateCommunity = (name: string, description: string, category: string) => {
    const newComm: CommunityItem = {
      id: `comm-${Date.now()}`,
      name,
      description,
      membersCount: 1,
      isAdmin: true,
      unreadCount: 0,
      category,
      posts: [],
    };
    setCommunities((prev) => [newComm, ...prev]);
    setActiveTab('communities');
  };

  const filteredChats = chats.filter((c) => {
    if (selectedCategory) {
      return c.categoryIds?.includes(selectedCategory);
    }
    return true;
  });

  const hasActiveSelection = selectedChat || selectedCommunity || viewingProfile || aiSettingsOpen;

  return (
    <div className="bg-white min-h-full flex flex-col lg:flex-row pb-24 lg:pb-0 relative">
      
      {/* LEFT COLUMN: Chat List / Communities List (Full width on mobile if no selection, lg:w-96 on desktop) */}
      <div className={`flex-1 lg:w-96 lg:flex-none lg:border-r lg:border-neutral-200 flex flex-col ${
        hasActiveSelection ? 'hidden lg:flex' : 'flex'
      }`}>
        
        {/* Header & Tabs */}
        <div className="p-4 border-b border-neutral-100 space-y-3 sticky top-0 bg-white z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => { setActiveTab('chats'); setSelectedCommunity(null); }}
                className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${
                  activeTab === 'chats' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-neutral-500'
                }`}
              >
                Chats
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('communities'); setSelectedChat(null); }}
                className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${
                  activeTab === 'communities' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-neutral-500'
                }`}
              >
                Comunidades
              </button>
            </div>

          {/* Header Action Button Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setCreateMenuOpen(!createMenuOpen)}
              className="w-9 h-9 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center hover:bg-neutral-200/70"
            >
              <SquarePen className="w-4 h-4" />
            </button>

            {createMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setCreateMenuOpen(false)} />
                <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-neutral-200 rounded-2xl shadow-xl z-40 py-1.5 text-xs">
                  <button
                    onClick={() => {
                      setCreateMenuOpen(false);
                      const newC: ChatItem = {
                        id: `ch-${Date.now()}`,
                        name: 'Nuevo Chat',
                        preview: 'Conversación iniciada',
                        timestamp: 'Ahora',
                        unreadCount: 0,
                        isAi: false,
                        isGroup: false,
                        isProtected: false,
                        verified: false,
                      };
                      setChats([newC, ...chats]);
                      setSelectedChat(newC);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-neutral-50 text-neutral-800 font-medium"
                  >
                    <MessageCircle className="w-4 h-4 text-brand-primary" /> Nuevo chat
                  </button>
                  <button
                    onClick={() => {
                      setCreateMenuOpen(false);
                      const newG: ChatItem = {
                        id: `ch-grp-${Date.now()}`,
                        name: 'Nuevo Grupo',
                        preview: 'Grupo creado',
                        timestamp: 'Ahora',
                        unreadCount: 0,
                        isAi: false,
                        isGroup: true,
                        isProtected: false,
                        verified: false,
                      };
                      setChats([newG, ...chats]);
                      setSelectedChat(newG);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-neutral-50 text-neutral-800 font-medium"
                  >
                    <Users className="w-4 h-4 text-brand-primary" /> Nuevo grupo
                  </button>
                  <button
                    onClick={() => {
                      setCreateMenuOpen(false);
                      setCreateCommunityOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-neutral-50 text-neutral-800 font-medium"
                  >
                    <Megaphone className="w-4 h-4 text-brand-primary" /> Nueva comunidad
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* CHATS TAB CONTENT */}
      {activeTab === 'chats' && (
        <div className="flex-1 flex flex-col">
          
          {/* Stories Circles Row */}
          <div className="p-4 border-b border-neutral-100 overflow-x-auto no-scrollbar flex items-center gap-3">
            {statuses.map((st) => (
              <div
                key={st.id}
                onClick={() => {
                  if (st.id === 'st-user') {
                    setCreateStatusOpen(true);
                  } else {
                    setActiveStatus(st);
                  }
                }}
                className="flex flex-col items-center gap-1 cursor-pointer shrink-0"
              >
                <div className={`w-13 h-13 rounded-full p-0.5 border-2 ${
                  st.id === 'st-user'
                    ? 'border-dashed border-neutral-300'
                    : st.seen ? 'border-neutral-300' : 'border-brand-primary'
                }`}>
                  <div className="w-full h-full rounded-full bg-neutral-200 flex items-center justify-center font-bold text-xs text-neutral-700 relative">
                    {st.id === 'st-user' ? '+' : st.user.slice(0, 2).toUpperCase()}
                  </div>
                </div>
                <span className="text-[10px] text-neutral-600 font-normal truncate max-w-[56px] text-center">
                  {st.user}
                </span>
              </div>
            ))}
          </div>

          {/* Category Chips Row */}
          <div className="p-3 border-b border-neutral-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${
                selectedCategory === null ? 'bg-brand-primary text-white' : 'bg-neutral-100 text-neutral-600'
              }`}
            >
              Todos
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${
                  selectedCategory === c.id ? 'bg-brand-primary text-white' : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                {c.name}
              </button>
            ))}
            <button
              onClick={() => setCreateCategoryOpen(true)}
              className="w-7 h-7 rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center shrink-0 hover:bg-neutral-200"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Chat List (Flat Rows) or Communities */}
          {activeTab === 'chats' ? (
            <div className="divide-y divide-neutral-100 flex-1">
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-neutral-50 transition-colors ${
                    chat.isAi ? 'bg-brand-primary/5' : ''
                  } ${selectedChat?.id === chat.id ? 'bg-brand-primary/10 border-l-4 border-brand-primary' : ''}`}
                >
                  <div className={`w-11 h-11 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                    chat.isAi ? 'bg-brand-primary text-white shadow-xs' : 'bg-neutral-200 text-neutral-700'
                  }`}>
                    {chat.isAi ? 'IA' : chat.name.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-semibold text-xs text-neutral-900 truncate">{chat.name}</span>
                        {chat.verified && <CheckCircle className="w-3.5 h-3.5 text-brand-primary shrink-0" />}
                        {chat.isAi && <span className="text-[9px] font-bold bg-brand-primary text-white px-1 rounded">IA</span>}
                      </div>
                      <span className="text-[10px] text-neutral-400 font-normal shrink-0">{chat.timestamp}</span>
                    </div>

                    <p className="text-[11px] text-neutral-500 font-normal truncate mt-0.5">
                      {chat.isProtected ? (
                        <span className="flex items-center gap-1 text-neutral-400">
                          <Lock className="w-3 h-3 text-brand-primary" /> Chat protegido
                        </span>
                      ) : (
                        chat.preview
                      )}
                    </p>
                  </div>

                  {chat.unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-brand-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 flex-1">
              {communities.map((comm) => (
                <div
                  key={comm.id}
                  onClick={() => setSelectedCommunity(comm)}
                  className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-neutral-50 transition-colors ${
                    selectedCommunity?.id === comm.id ? 'bg-brand-primary/10 border-l-4 border-brand-primary' : ''
                  }`}
                >
                  <div className="w-11 h-11 rounded-2xl bg-brand-primary/10 text-brand-primary font-bold text-xs flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-neutral-900 truncate">{comm.name}</span>
                      {comm.isAdmin && (
                        <span className="text-[9px] font-bold bg-brand-primary/10 text-brand-primary px-1.5 py-0.5 rounded-full">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 font-normal truncate mt-0.5">
                      {comm.membersCount} miembros • {comm.category}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      </div>

      {/* RIGHT COLUMN: Active Chat Conversation or Community or Placeholder */}
      <div className={`flex-1 flex-col ${hasActiveSelection ? 'flex' : 'hidden lg:flex'}`}>
        {aiSettingsOpen ? (
          <AiSettingsScreen onBack={() => setAiSettingsOpen(false)} />
        ) : viewingProfile === 'chat' && selectedChat ? (
          <ChatProfile chat={selectedChat} onBack={() => setViewingProfile(null)} />
        ) : viewingProfile === 'community' && selectedCommunity ? (
          <CommunityProfile community={selectedCommunity} onBack={() => setViewingProfile(null)} />
        ) : selectedCommunity ? (
          <CommunityScreen
            community={selectedCommunity}
            onBack={() => setSelectedCommunity(null)}
            onOpenProfile={() => setViewingProfile('community')}
          />
        ) : selectedChat ? (
          <ChatConversation
            chat={selectedChat}
            onBack={() => setSelectedChat(null)}
            onOpenProfile={() => setViewingProfile('chat')}
            onOpenAiSettings={() => setAiSettingsOpen(true)}
          />
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center p-12 text-center text-neutral-400 bg-neutral-50/50">
            <div className="space-y-3 max-w-xs">
              <MessageCircle className="w-12 h-12 mx-auto text-neutral-300" />
              <h3 className="font-semibold text-sm text-neutral-700">Ningún chat seleccionado</h3>
              <p className="text-xs text-neutral-500 font-normal">
                Selecciona una conversación o comunidad de la lista de la izquierda para chatear.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Active Status Overlay */}
      {activeStatus && (
        <StatusViewer status={activeStatus} onClose={() => setActiveStatus(null)} />
      )}

      {/* Create Status Modal */}
      <CreateStatusModal
        isOpen={createStatusOpen}
        onClose={() => setCreateStatusOpen(false)}
        onPublish={(text, bgColor) => {
          const newS: StatusItem = {
            id: `st-${Date.now()}`,
            user: 'Mi Estado',
            seen: true,
            timestamp: 'Hace un momento',
            text,
            bgColor,
          };
          setStatuses([MOCK_STATUSES[0], newS, ...statuses.slice(1)]);
        }}
      />

      {/* Create Category Modal */}
      <CreateCategoryModal
        isOpen={createCategoryOpen}
        onClose={() => setCreateCategoryOpen(false)}
        onCreate={handleCreateCategory}
      />

      {/* Create Community Modal */}
      <CreateCommunityModal
        isOpen={createCommunityOpen}
        onClose={() => setCreateCommunityOpen(false)}
        onCreate={handleCreateCommunity}
      />

      {/* AI Catalog Modal */}
      <AiCatalogModal
        isOpen={aiCatalogOpen}
        onClose={() => setAiCatalogOpen(false)}
        onContactSeller={(seller, title) => {
          const sellerChat: ChatItem = {
            id: `ch-seller-${Date.now()}`,
            name: seller,
            preview: `Consulta sobre: ${title}`,
            timestamp: 'Ahora',
            unreadCount: 0,
            isAi: false,
            isGroup: false,
            isProtected: false,
            verified: true,
            isSellerChat: true,
          };
          setChats([sellerChat, ...chats]);
          setSelectedChat(sellerChat);
        }}
      />

    </div>
  );
}
