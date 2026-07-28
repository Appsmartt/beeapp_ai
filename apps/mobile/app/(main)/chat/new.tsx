import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useModuleNav, useScreenParams } from '../../../src/components/embedded/EmbeddedNavContext';
import { colors } from '@beeapp/design-system';
import { ChevronLeft, Search, Users, X, Check, ArrowRight } from 'lucide-react-native';
import VerifiedBadge from '../../../src/components/VerifiedBadge';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function NewChatScreen() {
  const router = useModuleNav();
  const params = useScreenParams();
  const [searchText, setSearchText] = useState('');
  
  // Interactive Wizard States
  // The header menu can open this screen straight in "new group" mode
  const [isCreatingGroup, setIsCreatingGroup] = useState(params.mode === 'group');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [groupStep, setGroupStep] = useState(1); // 1: Selection, 2: Group Info
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');

  // Mock Contact list
  const [contacts, setContacts] = useState([
    { id: '1', name: 'Carlos Mendoza', status: 'En línea', initials: 'C', verified: true },
    { id: '2', name: 'Mariana Gómez', status: 'Últ. vez hace 1 hora', initials: 'M', verified: true },
    { id: '3', name: 'Alejandro Reyes', status: 'En línea', initials: 'A', verified: true },
    { id: '4', name: 'Laura Restrepo', status: 'En línea', initials: 'L', verified: true },
    { id: '5', name: 'Felipe Jaramillo', status: 'Últ. vez ayer', initials: 'F', verified: false },
    { id: '6', name: 'Daniela Ortiz', status: 'Ausente', initials: 'D', verified: false },
  ]);

  const handleContactPress = (contact: typeof contacts[0]) => {
    if (isCreatingGroup) {
      if (selectedContacts.includes(contact.id)) {
        setSelectedContacts(selectedContacts.filter((id) => id !== contact.id));
      } else {
        setSelectedContacts([...selectedContacts, contact.id]);
      }
    } else {
      // Start individual chat immediately
      router.replace({
        pathname: '/(main)/chat/conversation',
        params: {
          id: contact.id,
          name: contact.name,
          isGroup: 'false',
          online: contact.status === 'En línea' ? 'true' : 'false',
        },
      });
    }
  };

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      alert('Ingresa el nombre del grupo.');
      return;
    }
    
    // Redirect to conversation view passing the newly created mock group
    router.replace({
      pathname: '/(main)/chat/conversation',
      params: {
        id: `g_${Date.now()}`,
        name: groupName,
        isGroup: 'true',
        online: 'false',
      },
    });
  };

  const handleNextStep = () => {
    if (selectedContacts.length === 0) {
      alert('Selecciona al menos un participante.');
      return;
    }
    setGroupStep(2);
  };

  const handleRemoveSelected = (id: string) => {
    setSelectedContacts(selectedContacts.filter((cId) => cId !== id));
  };

  const handleDeleteContact = (id: string) => {
    setContacts(contacts.filter((c) => c.id !== id));
  };

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isCreatingGroup ? (groupStep === 1 ? 'Añadir Participantes' : 'Nuevo Grupo') : 'Nuevo Chat'}
          </Text>
          <View style={{ width: 32 }} />
        </View>

        {isCreatingGroup && groupStep === 2 ? (
          // Group creation step 2: Details
          <ScrollView style={styles.contentScroll} contentContainerStyle={styles.scrollContent}>
            <View style={styles.avatarSetupSection}>
              <View style={styles.groupAvatarBig}>
                <Users size={32} color={colors.neutral.gray600} />
              </View>
              <TouchableOpacity style={styles.logoBtn}>
                <Text style={styles.logoBtnText}>Añadir Imagen</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nombre del Grupo *</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Nombre del grupo (ej. Proyecto Alfa)"
                placeholderTextColor={colors.neutral.gray500}
                value={groupName}
                onChangeText={setGroupName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Descripción</Text>
              <TextInput
                style={[styles.inputField, { height: 80 }]}
                placeholder="Ingresa una breve descripción del grupo..."
                placeholderTextColor={colors.neutral.gray500}
                multiline
                numberOfLines={3}
                value={groupDesc}
                onChangeText={setGroupDesc}
              />
            </View>

            <Text style={styles.selectedCountText}>
              Participantes seleccionados ({selectedContacts.length})
            </Text>
            <View style={styles.chipsWrap}>
              {selectedContacts.map((cId) => {
                const contact = contacts.find((c) => c.id === cId);
                return (
                  <View key={cId} style={styles.chipMini}>
                    <Text style={styles.chipMiniText}>{contact?.name.split(' ')[0]}</Text>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleCreateGroup} activeOpacity={0.8}>
              <Text style={styles.primaryButtonText}>Crear Grupo</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          // Selection or single chat step
          <View style={{ flex: 1 }}>
            {/* Search Input bar */}
            <View style={styles.searchBar}>
              <Search size={18} color={colors.neutral.gray500} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar contactos..."
                placeholderTextColor={colors.neutral.gray500}
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>

            {/* Selected Contacts Chips Row */}
            {isCreatingGroup && selectedContacts.length > 0 && (
              <View style={styles.selectedChipsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                  {selectedContacts.map((cId) => {
                    const contact = contacts.find((c) => c.id === cId);
                    if (!contact) return null;
                    return (
                      <View key={cId} style={styles.chip}>
                        <View style={styles.chipAvatar}>
                          <Text style={styles.chipAvatarText}>{contact.initials}</Text>
                        </View>
                        <Text style={styles.chipName} numberOfLines={1}>
                          {contact.name.split(' ')[0]}
                        </Text>
                        <TouchableOpacity onPress={() => handleRemoveSelected(cId)} style={styles.chipRemove}>
                          <X size={10} color={colors.neutral.gray600} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* List */}
            <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
              {/* Option to trigger Group Creation */}
              {!isCreatingGroup && (
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => setIsCreatingGroup(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionIconBadge}>
                    <Users size={18} color={colors.brand.primary} />
                  </View>
                  <Text style={styles.optionText}>Nuevo grupo</Text>
                </TouchableOpacity>
              )}

              <Text style={styles.sectionTitle}>Contactos</Text>

              {filteredContacts.map((contact) => {
                const isSelected = selectedContacts.includes(contact.id);
                return (
                  <TouchableOpacity
                    key={contact.id}
                    style={styles.contactRow}
                    onPress={() => handleContactPress(contact)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>{contact.initials}</Text>
                    </View>
                    <View style={styles.contactDetails}>
                      <View style={styles.contactNameRow}>
                        <Text style={styles.contactName}>{contact.name}</Text>
                        {contact.verified && <VerifiedBadge size={13} />}
                      </View>
                      <Text style={styles.contactStatus}>{contact.status}</Text>
                    </View>

                    {/* Checkbox or delete simulation */}
                    {isCreatingGroup ? (
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <Check size={12} color={colors.neutral.white} />}
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.deleteContactBtn}
                        onPress={() => handleDeleteContact(contact.id)}
                        activeOpacity={0.7}
                      >
                        <X size={14} color={colors.neutral.gray500} />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}
              {/* Spacing at bottom */}
              <View style={{ height: 100 }} />
            </ScrollView>

            {/* Floating button to proceed in Group creation wizard */}
            {isCreatingGroup && selectedContacts.length > 0 && (
              <TouchableOpacity style={styles.fabNext} onPress={handleNextStep} activeOpacity={0.8}>
                <ArrowRight size={22} color={colors.neutral.white} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.gray50,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
  },
  searchIcon: {
    position: 'absolute',
    left: 32,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    height: 42,
    backgroundColor: colors.neutral.gray50,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: 12,
    paddingLeft: 38,
    paddingRight: 16,
    fontSize: 14,
    color: colors.neutral.text,
  },
  selectedChipsContainer: {
    paddingVertical: 12,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
  },
  chipsScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.gray100,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  chipAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  chipAvatarText: {
    color: colors.neutral.white,
    fontSize: 8,
    fontWeight: '800',
  },
  chipName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.text,
    marginRight: 6,
  },
  chipRemove: {
    padding: 2,
    backgroundColor: colors.neutral.gray200,
    borderRadius: 8,
  },
  listScroll: {
    flex: 1,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
  },
  optionIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: 20,
    marginTop: 18,
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  contactDetails: {
    flex: 1,
  },
  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactName: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  contactStatus: {
    fontSize: 11,
    color: colors.neutral.gray600,
    marginTop: 2,
  },
  deleteContactBtn: {
    padding: 6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.neutral.gray300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.primary,
  },
  fabNext: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  contentScroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  avatarSetupSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  groupAvatarBig: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.neutral.gray100,
    borderWidth: 1.5,
    borderColor: colors.neutral.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.neutral.gray100,
  },
  logoBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.gray700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputField: {
    backgroundColor: colors.neutral.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.neutral.text,
    fontWeight: '500',
  },
  selectedCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 32,
  },
  chipMini: {
    backgroundColor: colors.neutral.gray100,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  chipMiniText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  primaryButton: {
    backgroundColor: colors.brand.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: {
    color: colors.neutral.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
